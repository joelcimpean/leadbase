-- Phase 14C.2.1.1 — Free UX correction
-- Persist the one-Free-lead claim independently from the current leads table.
-- Deleting the demo lead does NOT grant another free lead slot.

create table if not exists public.free_experience_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_lead_claimed_at timestamptz,
  free_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.free_experience_state enable row level security;

-- This state is server-managed only. UI reads it through server helpers.
revoke all on table public.free_experience_state from anon, authenticated;
grant all on table public.free_experience_state to service_role;

-- Backfill existing Free accounts that already have a lead so deleting that lead
-- after this migration cannot reset the one-lead demo entitlement.
insert into public.free_experience_state (
  user_id,
  free_lead_claimed_at,
  free_lead_id,
  created_at,
  updated_at
)
select
  l.user_id,
  min(l.created_at) as free_lead_claimed_at,
  (array_agg(l.id order by l.created_at asc))[1] as free_lead_id,
  now(),
  now()
from public.leads l
left join public.ai_usage_accounts a on a.user_id = l.user_id
where not (
  coalesce(a.plan_id, 'free') in ('starter', 'pro', 'scale')
  and coalesce(a.subscription_status, 'free') in ('active', 'trialing')
)
group by l.user_id
on conflict (user_id) do update
set
  free_lead_claimed_at = coalesce(
    public.free_experience_state.free_lead_claimed_at,
    excluded.free_lead_claimed_at
  ),
  free_lead_id = coalesce(
    public.free_experience_state.free_lead_id,
    excluded.free_lead_id
  ),
  updated_at = now();

create or replace function public.leadbase_enforce_free_saved_lead_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id text := 'free';
  v_subscription_status text := 'free';
  v_has_paid_access boolean := false;
  v_claimed boolean := false;
  v_existing_lead_id uuid;
begin
  -- Serialize lead claims per user so two tabs cannot both claim the Free slot.
  perform pg_advisory_xact_lock(
    hashtext('leadbase-free-lead'),
    hashtext(new.user_id::text)
  );

  select
    coalesce(max(a.plan_id), 'free'),
    coalesce(max(a.subscription_status), 'free')
  into
    v_plan_id,
    v_subscription_status
  from public.ai_usage_accounts a
  where a.user_id = new.user_id;

  v_has_paid_access :=
    v_plan_id in ('starter', 'pro', 'scale')
    and v_subscription_status in ('active', 'trialing');

  if v_has_paid_access then
    return new;
  end if;

  select
    s.free_lead_claimed_at is not null
  into v_claimed
  from public.free_experience_state s
  where s.user_id = new.user_id;

  if coalesce(v_claimed, false) then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_LEAD_LIMIT_REACHED',
      detail = 'The one Free lead slot has already been claimed. Deleting the original lead does not reset it.';
  end if;

  -- Compatibility guard for an account that somehow has a lead but no state row
  -- yet (for example code deployed before this migration was applied).
  select l.id
  into v_existing_lead_id
  from public.leads l
  where l.user_id = new.user_id
  order by l.created_at asc
  limit 1;

  if v_existing_lead_id is not null then
    insert into public.free_experience_state (
      user_id,
      free_lead_claimed_at,
      free_lead_id,
      created_at,
      updated_at
    ) values (
      new.user_id,
      now(),
      v_existing_lead_id,
      now(),
      now()
    )
    on conflict (user_id) do update
    set
      free_lead_claimed_at = coalesce(public.free_experience_state.free_lead_claimed_at, excluded.free_lead_claimed_at),
      free_lead_id = coalesce(public.free_experience_state.free_lead_id, excluded.free_lead_id),
      updated_at = now();

    raise exception using
      errcode = 'P0001',
      message = 'FREE_LEAD_LIMIT_REACHED',
      detail = 'Free accounts can claim one lead only.';
  end if;

  -- The claim and the lead insert live in the same transaction. If the lead
  -- insert fails later, this state insert rolls back too.
  insert into public.free_experience_state (
    user_id,
    free_lead_claimed_at,
    free_lead_id,
    created_at,
    updated_at
  ) values (
    new.user_id,
    now(),
    new.id,
    now(),
    now()
  )
  on conflict (user_id) do update
  set
    free_lead_claimed_at = case
      when public.free_experience_state.free_lead_claimed_at is null then excluded.free_lead_claimed_at
      else public.free_experience_state.free_lead_claimed_at
    end,
    free_lead_id = case
      when public.free_experience_state.free_lead_claimed_at is null then excluded.free_lead_id
      else public.free_experience_state.free_lead_id
    end,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.leadbase_enforce_free_saved_lead_limit() from public;

drop trigger if exists leadbase_free_saved_lead_limit on public.leads;

create trigger leadbase_free_saved_lead_limit
before insert on public.leads
for each row
execute function public.leadbase_enforce_free_saved_lead_limit();
