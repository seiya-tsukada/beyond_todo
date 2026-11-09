-- ========================================================
-- Beyond TODO. Data integrity hardening
--
-- 1. Cross-row references must stay within one user: composite foreign keys
--    (child.ref_id, child.user_id) -> parent(id, user_id), so a row can never
--    point at another user's challenge / priority / stakeholder even if the
--    application check were bypassed.
-- 2. "At most 5 unfinished priorities per ISO week" is enforced in the database
--    as well, serialized per (user, week) so concurrent requests cannot exceed it.
-- 3. decision_logs gets updated_at like the other tables.
-- 4. Indexes for purging expired sessions / one-time tokens.
--
-- Requires PostgreSQL 15+ (ON DELETE SET NULL with a column list).
--
-- Idempotent: constraints / columns are added only when missing, everything
-- else uses IF [NOT] EXISTS or CREATE OR REPLACE, so re-running is a no-op.
-- ========================================================

-- --------------------------------------------------------
-- 1. Same-user composite foreign keys
-- --------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['challenges', 'priorities', 'stakeholders']
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('beyond_todo.%I', t)::regclass
        and conname = t || '_id_user_key'
    ) then
      execute format(
        'alter table beyond_todo.%I add constraint %I unique (id, user_id)',
        t, t || '_id_user_key'
      );
    end if;
  end loop;
end;
$$;

-- Optional links that point at another user's row (impossible through the API)
-- are cleared rather than failing the migration.
update beyond_todo.priorities p set challenge_id = null
where challenge_id is not null
  and not exists (
    select 1 from beyond_todo.challenges c where c.id = p.challenge_id and c.user_id = p.user_id
  );
update beyond_todo.decision_logs l set priority_id = null
where priority_id is not null
  and not exists (
    select 1 from beyond_todo.priorities p where p.id = l.priority_id and p.user_id = l.user_id
  );

-- Replace the single-column FKs from init.sql with same-user composite FKs.
do $$
declare
  fk record;
begin
  for fk in
    select * from (values
      ('priorities', 'priorities_challenge_id_fkey', 'priorities_challenge_same_user_fkey',
       'foreign key (challenge_id, user_id) references beyond_todo.challenges (id, user_id) on delete set null (challenge_id)'),
      ('decision_logs', 'decision_logs_priority_id_fkey', 'decision_logs_priority_same_user_fkey',
       'foreign key (priority_id, user_id) references beyond_todo.priorities (id, user_id) on delete set null (priority_id)'),
      ('stakeholder_interests', 'stakeholder_interests_stakeholder_id_fkey', 'stakeholder_interests_stakeholder_same_user_fkey',
       'foreign key (stakeholder_id, user_id) references beyond_todo.stakeholders (id, user_id) on delete cascade')
    ) as v(tbl, old_name, new_name, definition)
  loop
    execute format('alter table beyond_todo.%I drop constraint if exists %I', fk.tbl, fk.old_name);
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('beyond_todo.%I', fk.tbl)::regclass
        and conname = fk.new_name
    ) then
      execute format('alter table beyond_todo.%I add constraint %I %s', fk.tbl, fk.new_name, fk.definition);
    end if;
  end loop;
end;
$$;

create index if not exists priorities_challenge_idx on beyond_todo.priorities (challenge_id) where challenge_id is not null;
create index if not exists decision_logs_priority_idx on beyond_todo.decision_logs (priority_id) where priority_id is not null;

-- --------------------------------------------------------
-- 2. Weekly limit of unfinished priorities
--
-- Mirrors backend/services/priorities.py: checked when a row becomes an
-- unfinished priority of a week (insert, reopening a completed one, or moving it
-- to another week). Existing rows that are merely edited are not re-checked.
-- The advisory lock serializes writers for the same (user, week); in READ
-- COMMITTED the count below then sees rows committed by the previous holder.
-- Raised as check_violation with the constraint name so the API can map it.
-- --------------------------------------------------------
create or replace function beyond_todo.enforce_weekly_priority_limit()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  if new.status = 'Completed' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.status <> 'Completed'
     and old.target_week = new.target_week
     and old.user_id = new.user_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || '/' || new.target_week, 0));

  select count(*) into active_count
  from beyond_todo.priorities
  where user_id = new.user_id
    and target_week = new.target_week
    and status <> 'Completed'
    and id <> new.id;

  if active_count >= 5 then
    raise exception 'weekly priority limit exceeded for %', new.target_week
      using errcode = 'check_violation',
            constraint = 'priorities_weekly_active_limit';
  end if;
  return new;
end;
$$;

create or replace trigger enforce_weekly_priority_limit
  before insert or update on beyond_todo.priorities
  for each row execute function beyond_todo.enforce_weekly_priority_limit();

-- --------------------------------------------------------
-- 3. decision_logs.updated_at
-- --------------------------------------------------------
-- Backfill from created_at only when the column is first added, so a re-run
-- never overwrites real edit times.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'beyond_todo' and table_name = 'decision_logs' and column_name = 'updated_at'
  ) then
    alter table beyond_todo.decision_logs
      add column updated_at timestamptz not null default now();
    update beyond_todo.decision_logs set updated_at = created_at;
  end if;
end;
$$;

create or replace trigger set_updated_at before update on beyond_todo.decision_logs
  for each row execute function beyond_todo.set_updated_at();

-- --------------------------------------------------------
-- 4. Expiry indexes (purged by the scheduled job)
-- --------------------------------------------------------
create index if not exists sessions_expires_idx on beyond_todo.sessions (expires_at);
create index if not exists auth_tokens_expires_idx on beyond_todo.auth_tokens (expires_at);
