-- Phase 10N2.2: configurable default follow-up delay.
-- Existing users keep the current behavior (5 days).

alter table public.outreach_preferences
  add column if not exists follow_up_delay_days integer;

update public.outreach_preferences
set follow_up_delay_days = 5
where follow_up_delay_days is null;

alter table public.outreach_preferences
  alter column follow_up_delay_days set default 5;

alter table public.outreach_preferences
  alter column follow_up_delay_days set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_preferences_follow_up_delay_days_check'
  ) then
    alter table public.outreach_preferences
      add constraint outreach_preferences_follow_up_delay_days_check
      check (follow_up_delay_days between 1 and 30);
  end if;
end $$;
