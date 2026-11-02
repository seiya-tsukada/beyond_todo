-- ========================================================
-- Beyond TODO. Database Schema
--
-- All tables live in the dedicated `beyond_todo` schema.
-- Authentication is handled by the Python backend (no dependency on auth.users).
-- The backend connects with the database owner role; the schema is NOT exposed
-- through PostgREST, and RLS is enabled without policies as defense in depth so
-- that the anon / authenticated roles can never read application data.
-- ========================================================

create schema if not exists beyond_todo;

revoke all on schema beyond_todo from public;
revoke all on schema beyond_todo from anon, authenticated;

-- Keep updated_at current on every UPDATE
create or replace function beyond_todo.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------
-- Users & authentication
-- --------------------------------------------------------

create table beyond_todo.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  name text not null,
  title text,
  email_verified_at timestamptz,
  notify_weekly_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_lower_key on beyond_todo.users (lower(email));

-- Login sessions. Only the SHA-256 hash of the session token is stored.
create table beyond_todo.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on beyond_todo.sessions (user_id);

-- One-time tokens sent by email (address verification / password reset).
create table beyond_todo.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  purpose text not null check (purpose in ('verify_email', 'reset_password')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index auth_tokens_user_purpose_idx on beyond_todo.auth_tokens (user_id, purpose);

-- Record of scheduled notifications already sent, so cron retries never double-send.
create table beyond_todo.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  kind text not null,
  ref text not null, -- e.g. ISO week "2026-W45"
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

-- --------------------------------------------------------
-- Domain tables
-- --------------------------------------------------------

-- Problems: 今の課題
create table beyond_todo.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  importance text not null default 'High' check (importance in ('High', 'Medium', 'Low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index challenges_user_idx on beyond_todo.challenges (user_id, created_at desc);

-- Priorities: 最優先事項（週あたり未完了5件まで。上限はアプリ側で検証）
create table beyond_todo.priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  challenge_id uuid references beyond_todo.challenges(id) on delete set null,
  title text not null,
  description text not null default '',
  reason text not null default '',
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed')),
  target_week text not null check (target_week ~ '^\d{4}-W\d{2}$'), -- ISO week, e.g. 2026-W45
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index priorities_user_week_idx on beyond_todo.priorities (user_id, target_week);

-- Interests: 興味関心
create table beyond_todo.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'General',
  status text not null default 'Interested' check (status in ('Interested', 'Exploring', 'Acting', 'Archived')),
  who text not null default '自分',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interests_user_idx on beyond_todo.interests (user_id, created_at desc);

-- Stakeholders
create table beyond_todo.stakeholders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  name text not null,
  relationship text not null default 'Customer' check (relationship in ('Customer', 'Partner', 'Family', 'Colleague', 'Other')),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stakeholders_user_idx on beyond_todo.stakeholders (user_id, created_at desc);

-- Stakeholder expectations: ステークホルダーの関心・期待
create table beyond_todo.stakeholder_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  stakeholder_id uuid not null references beyond_todo.stakeholders(id) on delete cascade,
  title text not null,
  description text not null default '',
  importance text not null default 'High' check (importance in ('High', 'Medium', 'Low')),
  status text not null default 'Active' check (status in ('Active', 'Addressed', 'Pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stakeholder_interests_user_idx on beyond_todo.stakeholder_interests (user_id);
create index stakeholder_interests_stakeholder_idx on beyond_todo.stakeholder_interests (stakeholder_id);

-- Weekly reviews: 8つの問いと振り返り
create table beyond_todo.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  completed_priorities jsonb not null default '[]'::jsonb,
  incomplete_priorities jsonb not null default '[]'::jsonb,
  personal_reflection text not null default '',
  decision_reflection text not null default '',
  next_week_actions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weekly_reviews_user_idx on beyond_todo.weekly_reviews (user_id, created_at desc);

-- Decision logs: 意思決定ログ
create table beyond_todo.decision_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  priority_id uuid references beyond_todo.priorities(id) on delete set null,
  decision text not null,
  reason text not null,
  outcome text not null default '',
  created_at timestamptz not null default now()
);
create index decision_logs_user_idx on beyond_todo.decision_logs (user_id, created_at desc);

-- Quick memos: 会議中のメモ・スクラッチパッド
create table beyond_todo.quick_memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references beyond_todo.users(id) on delete cascade,
  content text not null,
  tags text[] not null default '{}',
  converted_to text check (converted_to in ('challenge', 'priority', 'interest', 'stakeholder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quick_memos_user_idx on beyond_todo.quick_memos (user_id, created_at desc);

-- --------------------------------------------------------
-- updated_at triggers
-- --------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'challenges', 'priorities', 'interests', 'stakeholders',
    'stakeholder_interests', 'weekly_reviews', 'quick_memos'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on beyond_todo.%I
         for each row execute function beyond_todo.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- --------------------------------------------------------
-- Row Level Security: enabled with no policies (deny-all for API roles)
-- --------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'sessions', 'auth_tokens', 'notification_deliveries', 'challenges',
    'priorities', 'interests', 'stakeholders', 'stakeholder_interests',
    'weekly_reviews', 'decision_logs', 'quick_memos'
  ]
  loop
    execute format('alter table beyond_todo.%I enable row level security', t);
  end loop;
end;
$$;
