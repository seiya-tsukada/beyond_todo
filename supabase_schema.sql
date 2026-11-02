-- ========================================================
-- Beyond TODO. Supabase PostgreSQL Schema
-- User Isolation with Row Level Security (RLS)
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users table (Custom auth, no Supabase auth.users dependency)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  title text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Sessions table (Argon2id hash or SHA-256 token hash)
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 3. Challenges (Problem: 今の課題)
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  importance text not null default 'High' check (importance in ('High', 'Medium', 'Low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Priorities (Priority: 最優先事項 - 週最大3件)
create table if not exists public.priorities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  title text not null,
  description text default '',
  reason text not null,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed')),
  target_week text not null, -- e.g. 2026-W44
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Interests (Interest: 自分の興味関心 - 好奇心ストック)
create table if not exists public.interests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  category text default 'General',
  status text not null default 'Interested' check (status in ('Interested', 'Exploring', 'Acting', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Stakeholders (ステークホルダー)
create table if not exists public.stakeholders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  relationship text not null default 'Customer' check (relationship in ('Customer', 'Partner', 'Family', 'Colleague', 'Other')),
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Stakeholder Interests (Stakeholder Interest: ステークホルダーの関心・期待)
create table if not exists public.stakeholder_interests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  stakeholder_id uuid not null references public.stakeholders(id) on delete cascade,
  title text not null,
  description text default '',
  importance text not null default 'High' check (importance in ('High', 'Medium', 'Low')),
  status text not null default 'Active' check (status in ('Active', 'Addressed', 'Pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Weekly Reviews (Weekly Review: 8つの問いと振り返り)
create table if not exists public.weekly_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  completed_priorities jsonb default '[]'::jsonb,
  incomplete_priorities jsonb default '[]'::jsonb,
  personal_reflection text default '',
  decision_reflection text default '',
  next_week_actions jsonb default '[]'::jsonb,
  answers jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Decision Logs (意思決定ログ)
create table if not exists public.decision_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  priority_id uuid references public.priorities(id) on delete set null,
  decision text not null,
  reason text not null,
  outcome text default '',
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_challenges_user on public.challenges(user_id);
create index if not exists idx_priorities_user_week on public.priorities(user_id, target_week);
create index if not exists idx_interests_user on public.interests(user_id);
create index if not exists idx_stakeholders_user on public.stakeholders(user_id);
create index if not exists idx_stakeholder_interests_user on public.stakeholder_interests(user_id);
create index if not exists idx_weekly_reviews_user on public.weekly_reviews(user_id);
