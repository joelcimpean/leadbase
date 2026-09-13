-- Phase 12 — Public onboarding + private Design Studio inspiration images
-- Safe to run multiple times.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-inspiration',
  'design-inspiration',
  false,
  3145728,
  array['image/png','image/jpeg','image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/png','image/jpeg','image/webp']::text[];

-- Uploads/deletes are intentionally performed server-side after Supabase Auth
-- with the service role. No browser INSERT/UPDATE/DELETE policy is granted.
-- Files are stored under <auth-user-id>/... and only short-lived signed URLs are
-- passed to the design model for multimodal inspiration.

commit;
