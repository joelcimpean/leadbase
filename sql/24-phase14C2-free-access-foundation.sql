-- Phase 14C.2.1 — Free Access Foundation
-- Hard database guard for the one-saved-lead Free workspace rule.
-- Plan access remains separate from Credits: extra Credits never bypass this trigger.

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
  v_existing_leads integer := 0;
begin
  -- Serialize lead inserts per user so two tabs cannot race past the Free limit.
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

  if not v_has_paid_access then
    select count(*)::integer
    into v_existing_leads
    from public.leads l
    where l.user_id = new.user_id;

    if v_existing_leads >= 1 then
      raise exception using
        errcode = 'P0001',
        message = 'FREE_LEAD_LIMIT_REACHED',
        detail = 'Free accounts can keep one saved lead. Upgrade to Starter to create another lead.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.leadbase_enforce_free_saved_lead_limit() from public;

drop trigger if exists leadbase_free_saved_lead_limit on public.leads;

create trigger leadbase_free_saved_lead_limit
before insert on public.leads
for each row
execute function public.leadbase_enforce_free_saved_lead_limit();
