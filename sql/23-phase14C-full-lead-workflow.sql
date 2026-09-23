-- Leadbase Phase 14C — Full Lead Workflow
-- Additive/idempotent workflow state + atomic one-time 50 Credit claim.

create table if not exists public.full_lead_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  mode text not null,
  status text not null default 'running',
  current_step text not null default 'queued',
  steps jsonb not null default '{}'::jsonb,
  fixed_credits bigint,
  reservation_key text,
  internal_token uuid not null default gen_random_uuid(),
  credits_charged bigint not null default 0,
  provider_cost_usd numeric(12,6) not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint full_lead_workflow_runs_mode_check
    check (mode in ('one_time_50_credit_demo','normal_credits')),
  constraint full_lead_workflow_runs_status_check
    check (status in ('running','completed','failed')),
  constraint full_lead_workflow_runs_fixed_credits_check
    check (fixed_credits is null or fixed_credits >= 0),
  constraint full_lead_workflow_runs_credits_charged_check
    check (credits_charged >= 0),
  constraint full_lead_workflow_runs_provider_cost_check
    check (provider_cost_usd >= 0)
);

create index if not exists full_lead_workflow_runs_user_created_idx
  on public.full_lead_workflow_runs (user_id, started_at desc);

create index if not exists full_lead_workflow_runs_lead_created_idx
  on public.full_lead_workflow_runs (lead_id, started_at desc);

-- Exactly one active/completed free activation claim per account.
-- Failed technical attempts are excluded so one retry can be allowed safely.
create unique index if not exists full_lead_workflow_demo_claim_uidx
  on public.full_lead_workflow_runs (user_id)
  where mode = 'one_time_50_credit_demo'
    and status in ('running','completed');

-- Never allow two simultaneous full workflows for the same lead/account.
create unique index if not exists full_lead_workflow_running_lead_uidx
  on public.full_lead_workflow_runs (user_id, lead_id)
  where status = 'running';

alter table public.full_lead_workflow_runs enable row level security;

-- Workflow rows include a server-only internal token. Do not expose direct table
-- access to authenticated clients. The /api/leads/:id/full-workflow route returns
-- a safe status projection instead.
drop policy if exists "Users can read own full workflow runs" on public.full_lead_workflow_runs;

-- Atomic workflow claim. Service-role only.
create or replace function public.leadbase_start_full_workflow(
  p_user_id uuid,
  p_lead_id uuid,
  p_mode text,
  p_fixed_credits bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.full_lead_workflow_runs%rowtype;
  created public.full_lead_workflow_runs%rowtype;
  failed_attempts integer := 0;
  account_plan text;
  account_status text;
  request_key text;
begin
  if p_mode not in ('one_time_50_credit_demo','normal_credits') then
    raise exception 'invalid full workflow mode';
  end if;

  if not exists (
    select 1
    from public.leads l
    where l.id = p_lead_id
      and l.user_id = p_user_id
  ) then
    raise exception 'lead not found';
  end if;

  -- Serialize claims per account + lead to close two-tab/double-click races.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_lead_id::text));

  select * into existing
  from public.full_lead_workflow_runs r
  where r.user_id = p_user_id
    and r.lead_id = p_lead_id
    and r.status = 'running'
  order by r.started_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'id', existing.id,
      'status', existing.status,
      'mode', existing.mode,
      'reservation_key', existing.reservation_key,
      'internal_token', existing.internal_token,
      'reused', true
    );
  end if;

  if p_mode = 'one_time_50_credit_demo' then
    if coalesce(p_fixed_credits, 0) <> 50 then
      raise exception 'free workflow must reserve exactly 50 credits';
    end if;

    -- The one-time demo is global per account, not per lead. Serialize the
    -- claim at user level as well so two tabs starting two different leads at
    -- the same instant cannot race the partial unique index. This lock only
    -- lives for this very short database transaction and is not a user queue.
    perform pg_advisory_xact_lock(hashtext('full-workflow-demo:' || p_user_id::text));

    select plan_id, subscription_status
      into account_plan, account_status
    from public.ai_usage_accounts
    where user_id = p_user_id;

    -- Mirror getLeadbaseUsageSnapshot(): an old stored paid plan whose
    -- subscription is no longer active behaves as Free.
    if coalesce(account_plan, 'free') <> 'free'
       and coalesce(account_status, 'free') in ('active','trialing') then
      raise exception 'free workflow is only available on the free plan';
    end if;

    select * into existing
    from public.full_lead_workflow_runs r
    where r.user_id = p_user_id
      and r.mode = 'one_time_50_credit_demo'
      and r.status = 'running'
    order by r.started_at desc
    limit 1;

    if found then
      raise exception 'free workflow already running';
    end if;

    select * into existing
    from public.full_lead_workflow_runs r
    where r.user_id = p_user_id
      and r.mode = 'one_time_50_credit_demo'
      and r.status = 'completed'
    order by r.started_at desc
    limit 1;

    if found then
      raise exception 'free workflow already used';
    end if;

    select count(*)::integer into failed_attempts
    from public.full_lead_workflow_runs r
    where r.user_id = p_user_id
      and r.mode = 'one_time_50_credit_demo'
      and r.status = 'failed';

    -- One initial attempt + one technical retry. This prevents intentionally
    -- forcing repeated failures to consume provider spend without Credits.
    if failed_attempts >= 2 then
      raise exception 'free workflow retry limit reached';
    end if;
  end if;

  insert into public.full_lead_workflow_runs (
    user_id,
    lead_id,
    mode,
    status,
    current_step,
    fixed_credits,
    steps
  ) values (
    p_user_id,
    p_lead_id,
    p_mode,
    'running',
    'queued',
    case when p_mode = 'one_time_50_credit_demo' then p_fixed_credits else null end,
    '{}'::jsonb
  )
  returning * into created;

  if p_mode = 'one_time_50_credit_demo' then
    request_key := 'full-workflow:' || created.id::text;

    perform public.leadbase_reserve_credits(
      p_user_id,
      request_key,
      p_fixed_credits,
      'full_lead_workflow',
      'mixed',
      jsonb_build_object(
        'workflowRunId', created.id,
        'leadId', p_lead_id,
        'fixedBundle', true
      )
    );

    update public.full_lead_workflow_runs
    set reservation_key = request_key,
        updated_at = now()
    where id = created.id
    returning * into created;
  end if;

  return jsonb_build_object(
    'id', created.id,
    'status', created.status,
    'mode', created.mode,
    'reservation_key', created.reservation_key,
    'internal_token', created.internal_token,
    'reused', false
  );
end;
$$;

revoke all on function public.leadbase_start_full_workflow(uuid,uuid,text,bigint)
  from public, anon, authenticated;
grant execute on function public.leadbase_start_full_workflow(uuid,uuid,text,bigint)
  to service_role;

-- Table itself is server-only. RLS stays enabled as a second layer.
revoke all on table public.full_lead_workflow_runs from anon, authenticated;
grant all on table public.full_lead_workflow_runs to service_role;

-- Claim exactly one workflow step at a time. This keeps the full workflow
-- resumable across multiple HTTP requests and prevents two tabs from running
-- the same expensive step concurrently.
create or replace function public.leadbase_claim_full_workflow_step(
  p_user_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.full_lead_workflow_runs%rowtype;
  next_step text;
  step_status text;
  next_steps jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(p_run_id::text));

  select * into r
  from public.full_lead_workflow_runs
  where id = p_run_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'workflow run not found';
  end if;

  if r.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'busy', false,
      'step', null,
      'internal_token', r.internal_token
    );
  end if;

  if r.status = 'failed' then
    return jsonb_build_object(
      'status', 'failed',
      'busy', false,
      'step', null,
      'internal_token', r.internal_token
    );
  end if;

  -- Another request already owns a step. Do not start it twice.
  if r.current_step in ('analysis','design','outreach','call_prep','proposal') then
    step_status := coalesce(r.steps -> r.current_step ->> 'status', '');
    if step_status = 'running' then
      return jsonb_build_object(
        'status', 'running',
        'busy', true,
        'step', r.current_step,
        'internal_token', r.internal_token
      );
    end if;
  end if;

  if r.current_step = 'finalizing' then
    -- Finalization is deliberately idempotent (Credit settlement and summary
    -- event both have unique request keys). Returning the finalize step again
    -- lets a transient DB/network failure recover on the next request.
    return jsonb_build_object(
      'status', 'running',
      'busy', false,
      'step', 'finalize',
      'internal_token', r.internal_token
    );
  end if;

  if coalesce(r.steps -> 'analysis' ->> 'status', '') not in ('completed','skipped') then
    next_step := 'analysis';
  elsif coalesce(r.steps -> 'design' ->> 'status', '') not in ('completed','skipped') then
    next_step := 'design';
  elsif coalesce(r.steps -> 'outreach' ->> 'status', '') not in ('completed','skipped') then
    next_step := 'outreach';
  elsif coalesce(r.steps -> 'call_prep' ->> 'status', '') not in ('completed','skipped') then
    next_step := 'call_prep';
  elsif coalesce(r.steps -> 'proposal' ->> 'status', '') not in ('completed','skipped') then
    next_step := 'proposal';
  else
    update public.full_lead_workflow_runs
    set current_step = 'finalizing',
        updated_at = now()
    where id = r.id;

    return jsonb_build_object(
      'status', 'running',
      'busy', false,
      'step', 'finalize',
      'internal_token', r.internal_token
    );
  end if;

  next_steps := jsonb_set(
    coalesce(r.steps, '{}'::jsonb),
    array[next_step],
    jsonb_build_object(
      'status', 'running',
      'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ),
    true
  );

  update public.full_lead_workflow_runs
  set current_step = next_step,
      steps = next_steps,
      updated_at = now()
  where id = r.id;

  return jsonb_build_object(
    'status', 'running',
    'busy', false,
    'step', next_step,
    'internal_token', r.internal_token
  );
end;
$$;

revoke all on function public.leadbase_claim_full_workflow_step(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.leadbase_claim_full_workflow_step(uuid,uuid)
  to service_role;
