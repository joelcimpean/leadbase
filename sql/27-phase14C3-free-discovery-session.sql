-- Phase 14C.3 — Find Leads without Campaign + one Free discovery session
-- The Free discovery session is durable, independent from campaigns/leads, and
-- protected against refreshes, multiple tabs and duplicate clicks.

alter table public.free_experience_state
  add column if not exists free_discovery_claimed_at timestamptz,
  add column if not exists free_discovery_claim_token text,
  add column if not exists free_discovery_used_at timestamptz,
  add column if not exists free_discovery_search_id uuid,
  add column if not exists free_discovery_campaign_id uuid;

create index if not exists free_experience_state_discovery_claim_idx
  on public.free_experience_state (free_discovery_claimed_at)
  where free_discovery_claimed_at is not null
    and free_discovery_used_at is null;

comment on column public.free_experience_state.free_discovery_claimed_at is
  'Short-lived claim for the one Free company-discovery session. Stale claims may be retried.';
comment on column public.free_experience_state.free_discovery_claim_token is
  'Opaque token that prevents multiple tabs from starting multiple Free discovery requests.';
comment on column public.free_experience_state.free_discovery_used_at is
  'Permanent timestamp after the one Free discovery request completes successfully.';
comment on column public.free_experience_state.free_discovery_search_id is
  'Lead search created by the one consumed Free discovery session.';
comment on column public.free_experience_state.free_discovery_campaign_id is
  'Campaign used or automatically created for the consumed Free discovery session.';

create or replace function public.leadbase_claim_free_discovery_session(
  p_user_id uuid,
  p_claim_token text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id text := 'free';
  v_subscription_status text := 'free';
  v_paid boolean := false;
  v_used_at timestamptz;
  v_claimed_at timestamptz;
  v_claim_token text;
begin
  if p_user_id is null or coalesce(trim(p_claim_token), '') = '' then
    raise exception 'FREE_DISCOVERY_INVALID_CLAIM';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('leadbase-free-discovery'),
    hashtext(p_user_id::text)
  );

  select
    coalesce(max(a.plan_id), 'free'),
    coalesce(max(a.subscription_status), 'free')
  into v_plan_id, v_subscription_status
  from public.ai_usage_accounts a
  where a.user_id = p_user_id;

  v_paid :=
    v_plan_id in ('starter', 'pro', 'scale')
    and v_subscription_status in ('active', 'trialing');

  if v_paid then
    return p_claim_token;
  end if;

  insert into public.free_experience_state (
    user_id,
    created_at,
    updated_at
  ) values (
    p_user_id,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  select
    free_discovery_used_at,
    free_discovery_claimed_at,
    free_discovery_claim_token
  into
    v_used_at,
    v_claimed_at,
    v_claim_token
  from public.free_experience_state
  where user_id = p_user_id
  for update;

  if v_used_at is not null then
    raise exception 'FREE_DISCOVERY_ALREADY_USED';
  end if;

  if v_claim_token is not null
     and v_claim_token <> p_claim_token
     and v_claimed_at is not null
     and v_claimed_at > now() - interval '15 minutes' then
    raise exception 'FREE_DISCOVERY_IN_PROGRESS';
  end if;

  update public.free_experience_state
  set
    free_discovery_claimed_at = now(),
    free_discovery_claim_token = p_claim_token,
    updated_at = now()
  where user_id = p_user_id
    and free_discovery_used_at is null;

  return p_claim_token;
end;
$$;

create or replace function public.leadbase_finalize_free_discovery_session(
  p_user_id uuid,
  p_claim_token text,
  p_search_id uuid,
  p_campaign_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtext('leadbase-free-discovery'),
    hashtext(p_user_id::text)
  );

  update public.free_experience_state
  set
    free_discovery_used_at = coalesce(free_discovery_used_at, now()),
    free_discovery_search_id = coalesce(free_discovery_search_id, p_search_id),
    free_discovery_campaign_id = coalesce(free_discovery_campaign_id, p_campaign_id),
    free_discovery_claimed_at = null,
    free_discovery_claim_token = null,
    updated_at = now()
  where user_id = p_user_id
    and free_discovery_used_at is null
    and free_discovery_claim_token = p_claim_token;

  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    return true;
  end if;

  -- Idempotent retry after a successful finalize.
  if exists (
    select 1
    from public.free_experience_state s
    where s.user_id = p_user_id
      and s.free_discovery_used_at is not null
      and s.free_discovery_search_id = p_search_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.leadbase_release_free_discovery_session(
  p_user_id uuid,
  p_claim_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtext('leadbase-free-discovery'),
    hashtext(p_user_id::text)
  );

  update public.free_experience_state
  set
    free_discovery_claimed_at = null,
    free_discovery_claim_token = null,
    updated_at = now()
  where user_id = p_user_id
    and free_discovery_used_at is null
    and free_discovery_claim_token = p_claim_token;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.leadbase_claim_free_discovery_session(uuid, text) from public;
revoke all on function public.leadbase_finalize_free_discovery_session(uuid, text, uuid, uuid) from public;
revoke all on function public.leadbase_release_free_discovery_session(uuid, text) from public;

grant execute on function public.leadbase_claim_free_discovery_session(uuid, text) to service_role;
grant execute on function public.leadbase_finalize_free_discovery_session(uuid, text, uuid, uuid) to service_role;
grant execute on function public.leadbase_release_free_discovery_session(uuid, text) to service_role;
