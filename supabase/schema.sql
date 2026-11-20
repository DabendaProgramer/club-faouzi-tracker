-- Club Faouzi Tracker — Supabase PostgreSQL Schema
-- Exécuter dans le SQL Editor de votre projet Supabase

create extension if not exists "uuid-ossp";

-- 1. Profils & Abonnement SaaS
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text default 'Athlète Faouzi',
  role text not null default 'athlete' check (role in ('athlete', 'coach')),
  coach_id uuid references public.profiles(id),
  onboarding_completed boolean not null default false,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  split_mode text not null default '11-day' check (split_mode in ('11-day', 'custom')),
  current_cycle_day int not null default 1,
  rounding_step numeric not null default 0.5,
  preferred_unit text not null default 'kg' check (preferred_unit in ('kg', 'lbs')),
  default_rest_seconds int not null default 120,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Colonnes ajoutées en V3 (sûr à ré-exécuter si la table existe déjà)
alter table public.profiles add column if not exists role text not null default 'athlete' check (role in ('athlete', 'coach'));
alter table public.profiles add column if not exists coach_id uuid references public.profiles(id);
alter table public.profiles add column if not exists coach_code text unique;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

-- 2. Séances d'entraînement
create table if not exists public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_title text not null,
  split_day_index int,
  duration_minutes int,
  started_at timestamptz default now()
);

-- 3. Séries loggées
create table if not exists public.workout_sets (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  exercise_id text not null,
  exercise_name text not null,
  muscle_group text not null,
  set_type text not null check (set_type in ('warmup', 'activation', 'top_set', 'backoff', 'working')),
  weight numeric not null default 0,
  unit text not null default 'kg' check (unit in ('kg', 'lbs')),
  is_empty_bar boolean not null default false,
  is_each_side boolean not null default false,
  reps int not null default 0,
  unlocked_rank text,
  completed_at timestamptz default now()
);

-- 4. Badges Club Faouzi débloqués
create table if not exists public.unlocked_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rank text not null check (rank in ('Iron', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Master')),
  muscle_group text not null,
  exercise_name text not null,
  weight_kg numeric not null,
  reps int not null,
  unlocked_at timestamptz default now()
);

-- 5. Coaching Check-ins (Pré-séance & Clôture)
create table if not exists public.coaching_checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  muscle_group text not null,
  sleep_start text,
  sleep_end text,
  sleep_quality int,
  sleep_disruptors text[],
  pre_workout_meal text,
  hydrated boolean default true,
  caffeine_pre boolean default false,
  caffeine_time text,
  caffeine_earlier boolean default false,
  caffeine_day_before boolean default false,
  stress int,
  energy int,
  motivation int,
  session_time text,
  first_working_set_time text,
  intensity int,
  negative_factors text,
  readiness_score int,
  created_at timestamptz default now()
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.unlocked_badges enable row level security;
alter table public.coaching_checkins enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users manage own sessions" on public.workout_sessions;
create policy "Users manage own sessions" on public.workout_sessions
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own sets" on public.workout_sets;
create policy "Users manage own sets" on public.workout_sets
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own badges" on public.unlocked_badges;
create policy "Users manage own badges" on public.unlocked_badges
  for all using (auth.uid() = user_id);

drop policy if exists "Users manage own checkins" on public.coaching_checkins;
create policy "Users manage own checkins" on public.coaching_checkins
  for all using (auth.uid() = user_id);

drop policy if exists "Coaches view linked athletes checkins" on public.coaching_checkins;
create policy "Coaches view linked athletes checkins" on public.coaching_checkins
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = coaching_checkins.user_id and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches view linked athletes profiles" on public.profiles;
create policy "Coaches view linked athletes profiles" on public.profiles
  for select using (coach_id = auth.uid() or coach_code is not null);

drop policy if exists "Coaches view linked athletes sessions" on public.workout_sessions;
create policy "Coaches view linked athletes sessions" on public.workout_sessions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = workout_sessions.user_id and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches view linked athletes sets" on public.workout_sets;
create policy "Coaches view linked athletes sets" on public.workout_sets
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = workout_sets.user_id and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches view linked athletes badges" on public.unlocked_badges;
create policy "Coaches view linked athletes badges" on public.unlocked_badges
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = unlocked_badges.user_id and p.coach_id = auth.uid()
    )
  );

-- 6. Exercices personnalisés
create table if not exists public.custom_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  exercise_id text not null,
  name text not null,
  muscle_group text not null check (muscle_group in ('Biceps', 'Épaules', 'Triceps', 'Dos', 'Chest', 'Legs')),
  default_unit text not null default 'kg' check (default_unit in ('kg', 'lbs')),
  is_each_side boolean not null default false,
  notes text,
  audio_memo_label text,
  min_pr_reps int,
  default_sets jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, exercise_id)
);

-- 7. Planning personnalisé (Split Days)
create table if not exists public.custom_split_days (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_index int not null,
  day_label text not null,
  title text not null,
  is_rest boolean not null default false,
  pre_workout_note text,
  exercise_ids text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, day_index)
);

alter table public.custom_exercises enable row level security;
alter table public.custom_split_days enable row level security;

drop policy if exists "Users manage own custom exercises" on public.custom_exercises;
create policy "Users manage own custom exercises" on public.custom_exercises
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own custom split days" on public.custom_split_days;
create policy "Users manage own custom split days" on public.custom_split_days
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
