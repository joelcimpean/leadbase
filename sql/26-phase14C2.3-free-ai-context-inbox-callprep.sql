-- Phase 14C.2.3 — Free AI context isolation, Inbox scope and post-reply Call Prep
-- Adds durable/idempotent state for the one zero-Credit Call Prep refresh that
-- becomes available after a useful customer reply on the one Free lead.

alter table public.free_experience_state
  add column if not exists free_call_prep_refresh_claimed_at timestamptz,
  add column if not exists free_call_prep_refresh_claim_token text,
  add column if not exists free_call_prep_refresh_used_at timestamptz,
  add column if not exists free_call_prep_refresh_message_id text;

create index if not exists free_experience_state_call_prep_claim_idx
  on public.free_experience_state (free_call_prep_refresh_claimed_at)
  where free_call_prep_refresh_claimed_at is not null
    and free_call_prep_refresh_used_at is null;

comment on column public.free_experience_state.free_call_prep_refresh_claimed_at is
  'Short-lived server claim for the one Free post-reply Call Prep refresh. Stale claims may be retried.';

comment on column public.free_experience_state.free_call_prep_refresh_claim_token is
  'Opaque server token used to make the Free post-reply Call Prep refresh idempotent across tabs.';

comment on column public.free_experience_state.free_call_prep_refresh_used_at is
  'Permanent timestamp after the one Free post-reply Call Prep refresh succeeds.';

comment on column public.free_experience_state.free_call_prep_refresh_message_id is
  'Incoming message id that unlocked/consumed the one Free post-reply Call Prep refresh.';
