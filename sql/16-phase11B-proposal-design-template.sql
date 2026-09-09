-- Phase 11B — persistent visual proposal template selection.
-- Safe to run more than once.

alter table public.proposals
  add column if not exists design_template text not null default 'signature';

update public.proposals
set design_template = 'signature'
where design_template is null
   or design_template not in ('signature','minimal','kontur','kanzlei','prisma','atelier','kompakt');

alter table public.proposals
  drop constraint if exists proposals_design_template_check;

alter table public.proposals
  add constraint proposals_design_template_check
  check (design_template in ('signature','minimal','kontur','kanzlei','prisma','atelier','kompakt'));
