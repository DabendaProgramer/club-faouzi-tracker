-- Club Faouzi Tracker — Supabase PostgreSQL Schema
-- Exécuter dans le SQL Editor de votre projet Supabase

create extension if not exists "uuid-ossp";

-- 1. Profils & Abonnement SaaS
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text default 'Athlète Faouzi',
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

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.unlocked_badges enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users manage own sessions" on public.workout_sessions
  for all using (auth.uid() = user_id);

create policy "Users manage own sets" on public.workout_sets
  for all using (auth.uid() = user_id);

create policy "Users manage own badges" on public.unlocked_badges
  for all using (auth.uid() = user_id);
