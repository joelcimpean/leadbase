-- Optional helper table if you later want persistent per-user design generation defaults.
create table if not exists public.user_design_generation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  design_model text not null default 'gpt-5.6-sol',
  reasoning_effort text not null default 'high',
  motion_preset text not null default 'none',
  inspiration_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_design_generation_preferences_reasoning_effort_check
    check (reasoning_effort in ('low', 'medium', 'high')),
  constraint user_design_generation_preferences_motion_preset_check
    check (motion_preset in ('none', 'subtle', 'premium'))
);

alter table public.user_design_generation_preferences enable row level security;

-- PostgreSQL does not support `CREATE POLICY IF NOT EXISTS`,
-- so make this migration re-runnable by dropping the policies first.
drop policy if exists "Users can read their own design generation preferences"
  on public.user_design_generation_preferences;

drop policy if exists "Users can insert their own design generation preferences"
  on public.user_design_generation_preferences;

drop policy if exists "Users can update their own design generation preferences"
  on public.user_design_generation_preferences;

create policy "Users can read their own design generation preferences"
  on public.user_design_generation_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own design generation preferences"
  on public.user_design_generation_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own design generation preferences"
  on public.user_design_generation_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
