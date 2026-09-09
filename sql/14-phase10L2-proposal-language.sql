-- Phase 10L2: proposal language is separate from the Leadbase app language.
-- Existing proposals remain German by default, matching the current behavior.

alter table public.proposals
  add column if not exists language text;

update public.proposals
set language = 'de'
where language is null
   or language not in ('de', 'en');

alter table public.proposals
  alter column language set default 'de';

alter table public.proposals
  alter column language set not null;
