-- Leadbase Phase 12.5 — global account currency + Evidence -> Outreach -> Outcome pipeline
-- Additive/idempotent. Does not remove existing Leadbase data or features.

begin;

-- =========================================================
-- EVIDENCE AUDITS
-- =========================================================
create table if not exists public.lead_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  website_url text not null,
  created_at timestamptz not null default now(),
  audit_version text not null,
  mobile_score integer,
  desktop_score integer,
  lcp_ms integer,
  cls numeric,
  tbt_ms integer,
  has_viewport boolean,
  https_valid boolean,
  http_redirects_to_https boolean,
  has_impressum_link boolean,
  has_privacy_link boolean,
  has_contact_form boolean,
  contact_form_reachable boolean,
  broken_link_count integer,
  footer_year integer,
  meta_description_present boolean,
  cms text,
  oversized_images_kb integer,
  findings jsonb not null default '[]'::jsonb,
  raw_results_json jsonb not null default '{}'::jsonb,
  hook_category text,
  hook_strength smallint not null default 0,
  hook_value text,
  hook_evidence text,
  hook_sentence text,
  constraint lead_audits_hook_strength_check check (hook_strength between 0 and 3)
);

create index if not exists lead_audits_user_lead_created_idx
  on public.lead_audits (user_id, lead_id, created_at desc);
create index if not exists lead_audits_user_hook_idx
  on public.lead_audits (user_id, hook_category, created_at desc);

alter table public.lead_audits enable row level security;
drop policy if exists "lead_audits_select_own" on public.lead_audits;
drop policy if exists "lead_audits_insert_own" on public.lead_audits;
drop policy if exists "lead_audits_update_own" on public.lead_audits;
drop policy if exists "lead_audits_delete_own" on public.lead_audits;
create policy "lead_audits_select_own" on public.lead_audits for select using (auth.uid() = user_id);
create policy "lead_audits_insert_own" on public.lead_audits for insert with check (auth.uid() = user_id);
create policy "lead_audits_update_own" on public.lead_audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lead_audits_delete_own" on public.lead_audits for delete using (auth.uid() = user_id);

-- =========================================================
-- OUTREACH DRAFT SNAPSHOT FIELDS
-- =========================================================
alter table if exists public.outreach_drafts
  add column if not exists audit_id uuid references public.lead_audits(id) on delete set null,
  add column if not exists hook_category text,
  add column if not exists hook_strength smallint,
  add column if not exists hook_value text,
  add column if not exists hook_evidence text,
  add column if not exists hook_sentence text,
  add column if not exists template_version text,
  add column if not exists subject_variant text,
  add column if not exists opener_variant text;

create index if not exists outreach_drafts_audit_idx
  on public.outreach_drafts (audit_id)
  where audit_id is not null;

-- =========================================================
-- IMMUTABLE OUTREACH SEND EVENTS
-- =========================================================
create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  outreach_draft_id uuid references public.outreach_drafts(id) on delete set null,
  audit_id uuid references public.lead_audits(id) on delete set null,
  channel text not null default 'email',
  status text not null default 'sent',
  sent_at timestamptz not null,
  industry text,
  region text,
  hook_category text,
  hook_strength smallint,
  hook_value text,
  template_version text,
  subject_variant text,
  opener_variant text,
  sequence_step integer not null default 0,
  gmail_message_id text,
  gmail_thread_id text,
  send_id text not null,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint outreach_events_sequence_step_check check (sequence_step >= 0)
);

create unique index if not exists outreach_events_user_send_uidx
  on public.outreach_events (user_id, send_id);
create unique index if not exists outreach_events_user_gmail_message_uidx
  on public.outreach_events (user_id, gmail_message_id)
  where gmail_message_id is not null;
create index if not exists outreach_events_user_sent_idx
  on public.outreach_events (user_id, sent_at desc);
create index if not exists outreach_events_lead_sent_idx
  on public.outreach_events (user_id, lead_id, sent_at desc);
create index if not exists outreach_events_hook_idx
  on public.outreach_events (user_id, hook_category, sent_at desc);

alter table public.outreach_events enable row level security;
drop policy if exists "outreach_events_select_own" on public.outreach_events;
drop policy if exists "outreach_events_insert_own" on public.outreach_events;
create policy "outreach_events_select_own" on public.outreach_events for select using (auth.uid() = user_id);
create policy "outreach_events_insert_own" on public.outreach_events for insert with check (auth.uid() = user_id);
-- Deliberately no client UPDATE/DELETE policy: successful send snapshots are immutable.

-- =========================================================
-- OUTCOMES — MUTABLE RESULT OF AN IMMUTABLE SEND
-- =========================================================
create table if not exists public.outreach_outcomes (
  event_id uuid primary key references public.outreach_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_reply_at timestamptz,
  reply_category text,
  interested_at timestamptz,
  proposal_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  bounced boolean not null default false,
  unsubscribed boolean not null default false,
  project_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_outcomes_user_idx on public.outreach_outcomes (user_id, updated_at desc);
alter table public.outreach_outcomes enable row level security;
drop policy if exists "outreach_outcomes_select_own" on public.outreach_outcomes;
drop policy if exists "outreach_outcomes_insert_own" on public.outreach_outcomes;
drop policy if exists "outreach_outcomes_update_own" on public.outreach_outcomes;
create policy "outreach_outcomes_select_own" on public.outreach_outcomes for select using (auth.uid() = user_id);
create policy "outreach_outcomes_insert_own" on public.outreach_outcomes for insert with check (auth.uid() = user_id);
create policy "outreach_outcomes_update_own" on public.outreach_outcomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- SUPPRESSION LIST
-- =========================================================
create table if not exists public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  email text not null,
  reason text not null,
  source text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppression_list_email_lower_check check (email = lower(email))
);

create unique index if not exists suppression_list_user_email_uidx on public.suppression_list (user_id, email);
create index if not exists suppression_list_user_active_idx on public.suppression_list (user_id, active, updated_at desc);
alter table public.suppression_list enable row level security;
drop policy if exists "suppression_list_select_own" on public.suppression_list;
drop policy if exists "suppression_list_insert_own" on public.suppression_list;
drop policy if exists "suppression_list_update_own" on public.suppression_list;
drop policy if exists "suppression_list_delete_own" on public.suppression_list;
create policy "suppression_list_select_own" on public.suppression_list for select using (auth.uid() = user_id);
create policy "suppression_list_insert_own" on public.suppression_list for insert with check (auth.uid() = user_id);
create policy "suppression_list_update_own" on public.suppression_list for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppression_list_delete_own" on public.suppression_list for delete using (auth.uid() = user_id);

-- =========================================================
-- FOLLOW-UP HISTORY (cancelled rows are preserved here)
-- =========================================================
create table if not exists public.follow_up_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  outreach_draft_id uuid references public.outreach_drafts(id) on delete set null,
  status text not null,
  cancel_reason text,
  scheduled_for timestamptz,
  processing_started_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  rescheduled_from timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint follow_up_events_status_check check (status in ('scheduled','processing','sent','cancelled','rescheduled')),
  constraint follow_up_events_cancel_reason_check check (
    cancel_reason is null or cancel_reason in ('human_reply','bounce','unsubscribe','manual_stop','suppressed','lead_lost','lead_won')
  )
);

create index if not exists follow_up_events_user_lead_created_idx on public.follow_up_events (user_id, lead_id, created_at desc);
alter table public.follow_up_events enable row level security;
drop policy if exists "follow_up_events_select_own" on public.follow_up_events;
drop policy if exists "follow_up_events_insert_own" on public.follow_up_events;
create policy "follow_up_events_select_own" on public.follow_up_events for select using (auth.uid() = user_id);
create policy "follow_up_events_insert_own" on public.follow_up_events for insert with check (auth.uid() = user_id);
-- History is append-only from the client perspective.

commit;
