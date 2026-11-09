-- Delete every row in the beyond_todo schema (users, sessions, all user data).
-- Tables, constraints, functions and triggers are kept.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v confirm=yes -f supabase/maintenance/truncate_data.sql
--
-- Refuses to run without -v confirm=yes.

\if :{?confirm}
\else
  \echo 'truncate_data.sql deletes ALL beyond_todo data. Re-run with -v confirm=yes'
  do $$ begin raise exception 'confirmation required (-v confirm=yes)'; end $$;
\endif

do $$
declare
  tables text;
begin
  select string_agg(format('beyond_todo.%I', tablename), ', ')
    into tables
  from pg_tables
  where schemaname = 'beyond_todo';

  if tables is not null then
    execute 'truncate table ' || tables;
    raise notice 'truncated: %', tables;
  end if;
end;
$$;
