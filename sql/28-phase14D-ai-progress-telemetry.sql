-- Leadbase Phase 14D — persistent AI progress + telemetry
-- Additive/idempotent. Safe to run multiple times.

begin;

alter table public.ai_usage_events
  add column if not exists reasoning_effort text,
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists workflow_run_id uuid references public.full_lead_workflow_runs(id) on delete set null,
  add column if not exists credits_reserved bigint not null default 0,
  add column if not exists duration_ms bigint,
  add column if not exists success boolean not null default true,
  add column if not exists retry_count integer not null default 0,
  add column if not exists error_category text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_credits_reserved_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_credits_reserved_check
  check (credits_reserved >= 0);

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_duration_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_duration_check
  check (duration_ms is null or duration_ms >= 0);

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_retry_count_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_retry_count_check
  check (retry_count >= 0);

create table if not exists public.ai_operation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text,
  reasoning_effort text,
  status text not null default 'running',
  lead_id uuid references public.leads(id) on delete set null,
  workflow_run_id uuid references public.full_lead_workflow_runs(id) on delete set null,
  request_key text,
  reservation_key text,
  credits_reserved bigint not null default 0,
  credits_charged bigint not null default 0,
  input_tokens bigint not null default 0,
  cached_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  provider_cost_usd numeric(18,8) not null default 0,
  retry_count integer not null default 0,
  error_category text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ai_operation_runs_status_check
    check (status in ('running','completed','failed')),
  constraint ai_operation_runs_credits_reserved_check
    check (credits_reserved >= 0),
  constraint ai_operation_runs_credits_charged_check
    check (credits_charged >= 0),
  constraint ai_operation_runs_retry_count_check
    check (retry_count >= 0),
  constraint ai_operation_runs_tokens_check
    check (
      input_tokens >= 0 and
      cached_input_tokens >= 0 and
      output_tokens >= 0 and
      total_tokens >= 0
    ),
  constraint ai_operation_runs_provider_cost_check
    check (provider_cost_usd >= 0)
);

create unique index if not exists ai_operation_runs_user_reservation_uidx
  on public.ai_operation_runs (user_id, reservation_key)
  where reservation_key is not null;

create index if not exists ai_operation_runs_user_status_updated_idx
  on public.ai_operation_runs (user_id, status, updated_at desc);

create index if not exists ai_operation_runs_workflow_idx
  on public.ai_operation_runs (workflow_run_id, started_at desc)
  where workflow_run_id is not null;

create index if not exists ai_operation_runs_lead_idx
  on public.ai_operation_runs (lead_id, started_at desc)
  where lead_id is not null;

alter table public.ai_operation_runs enable row level security;

drop policy if exists "Users can read own AI operation runs" on public.ai_operation_runs;
create policy "Users can read own AI operation runs"
  on public.ai_operation_runs
  for select
  using (auth.uid() = user_id);

-- User clients only need read access. All writes go through trusted server code.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'ai_operation_runs'
     ) then
    alter publication supabase_realtime add table public.ai_operation_runs;
  end if;
end $$;

commit;
