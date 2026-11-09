-- Delete every user, together with everything that belongs to them
-- (sessions, tokens, notification history and all workspace data cascade from users).
-- Tables, constraints, functions and triggers are kept.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v confirm=yes -f supabase/maintenance/truncate_users.sql
--
-- Refuses to run without -v confirm=yes.
--
-- TRUNCATE replaces the table and index files with new empty ones, so the indexes
-- start from scratch as well. RESTART IDENTITY resets any sequences owned by the
-- truncated tables (the current tables use UUID keys and have none).

\if :{?confirm}
\else
  \echo 'truncate_users.sql deletes ALL users and their data. Re-run with -v confirm=yes'
  do $$ begin raise exception 'confirmation required (-v confirm=yes)'; end $$;
\endif

begin;

select count(*) as users_before from beyond_todo.users;

truncate table beyond_todo.users restart identity cascade;

select count(*) as users_after from beyond_todo.users;

commit;
