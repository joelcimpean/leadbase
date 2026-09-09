-- Leadbase Phase 9L
-- Idempotent database/storage setup for reminders, productivity,
-- project media and GIF metadata.

-- =========================================================
-- LEAD NOTES
-- =========================================================
alter table if exists public.leads
  add column if not exists notes text;

-- =========================================================
-- REMINDERS / NOTES
-- =========================================================
create table if not exists public.user_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_reminders_user_due_idx
  on public.user_reminders (user_id, due_at, created_at desc);

alter table public.user_reminders enable row level security;

drop policy if exists "user_reminders_select_own" on public.user_reminders;
drop policy if exists "user_reminders_insert_own" on public.user_reminders;
drop policy if exists "user_reminders_update_own" on public.user_reminders;
drop policy if exists "user_reminders_delete_own" on public.user_reminders;

create policy "user_reminders_select_own"
  on public.user_reminders
  for select
  using (auth.uid() = user_id);

create policy "user_reminders_insert_own"
  on public.user_reminders
  for insert
  with check (auth.uid() = user_id);

create policy "user_reminders_update_own"
  on public.user_reminders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_reminders_delete_own"
  on public.user_reminders
  for delete
  using (auth.uid() = user_id);

-- =========================================================
-- TIME TRACKER
-- =========================================================
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.client_projects(id) on delete set null,
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc);

create unique index if not exists time_entries_one_open_per_user_idx
  on public.time_entries (user_id)
  where ended_at is null;

alter table public.time_entries enable row level security;

drop policy if exists "time_entries_select_own" on public.time_entries;
drop policy if exists "time_entries_insert_own" on public.time_entries;
drop policy if exists "time_entries_update_own" on public.time_entries;
drop policy if exists "time_entries_delete_own" on public.time_entries;

create policy "time_entries_select_own"
  on public.time_entries
  for select
  using (auth.uid() = user_id);

create policy "time_entries_insert_own"
  on public.time_entries
  for insert
  with check (auth.uid() = user_id);

create policy "time_entries_update_own"
  on public.time_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "time_entries_delete_own"
  on public.time_entries
  for delete
  using (auth.uid() = user_id);

-- =========================================================
-- DAILY ACTIVITY / HEATMAP
-- =========================================================
create table if not exists public.app_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  opens integer not null default 0,
  active_minutes integer not null default 0,
  actions integer not null default 0,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

alter table public.app_activity_daily enable row level security;

drop policy if exists "app_activity_daily_select_own" on public.app_activity_daily;
drop policy if exists "app_activity_daily_insert_own" on public.app_activity_daily;
drop policy if exists "app_activity_daily_update_own" on public.app_activity_daily;

create policy "app_activity_daily_select_own"
  on public.app_activity_daily
  for select
  using (auth.uid() = user_id);

create policy "app_activity_daily_insert_own"
  on public.app_activity_daily
  for insert
  with check (auth.uid() = user_id);

create policy "app_activity_daily_update_own"
  on public.app_activity_daily
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_app_activity(
  p_activity_date date,
  p_opens integer default 0,
  p_active_minutes integer default 0,
  p_actions integer default 0
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.app_activity_daily (
    user_id,
    activity_date,
    opens,
    active_minutes,
    actions,
    score,
    updated_at
  )
  values (
    auth.uid(),
    p_activity_date,
    greatest(0, coalesce(p_opens, 0)),
    greatest(0, coalesce(p_active_minutes, 0)),
    greatest(0, coalesce(p_actions, 0)),
    greatest(0, coalesce(p_opens, 0) * 2 + coalesce(p_active_minutes, 0) + coalesce(p_actions, 0)),
    now()
  )
  on conflict (user_id, activity_date)
  do update set
    opens = public.app_activity_daily.opens + greatest(0, coalesce(excluded.opens, 0)),
    active_minutes = public.app_activity_daily.active_minutes + greatest(0, coalesce(excluded.active_minutes, 0)),
    actions = public.app_activity_daily.actions + greatest(0, coalesce(excluded.actions, 0)),
    score = public.app_activity_daily.score
      + greatest(0, coalesce(excluded.opens, 0) * 2 + coalesce(excluded.active_minutes, 0) + coalesce(excluded.actions, 0)),
    updated_at = now();
end;
$$;

grant execute on function public.increment_app_activity(date, integer, integer, integer)
  to authenticated;

-- =========================================================
-- PROJECT MEDIA
-- =========================================================
alter table if exists public.client_projects
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists media_mode text default 'cover';

update public.client_projects
set media_mode = 'cover'
where media_mode is null
   or media_mode not in ('cover', 'logo');

-- Public bucket because project cards render the stored URL directly.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-media',
  'project-media',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_media_insert_own" on storage.objects;
drop policy if exists "project_media_update_own" on storage.objects;
drop policy if exists "project_media_delete_own" on storage.objects;

create policy "project_media_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "project_media_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'project-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "project_media_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- =========================================================
-- PREVIEW GIFS
-- =========================================================
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'preview-gifs',
  'preview-gifs',
  true,
  8388608,
  array['image/gif']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table if exists public.design_public_previews
  add column if not exists preview_gif_status text default 'NOT_GENERATED',
  add column if not exists preview_gif_path text,
  add column if not exists preview_gif_url text,
  add column if not exists preview_gif_generated_at timestamptz,
  add column if not exists preview_gif_error text,
  add column if not exists preview_gif_bytes bigint,
  add column if not exists preview_gif_version integer default 1;
