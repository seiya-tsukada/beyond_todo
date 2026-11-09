-- Drop the beyond_todo schema and everything in it (tables, data, functions).
-- Used on its own, or piped in front of the migrations to rebuild from scratch:
--
--   cat supabase/maintenance/drop_schema.sql supabase/migrations/*.sql \
--     | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v confirm=yes -1
--
-- Refuses to run without -v confirm=yes.

\if :{?confirm}
\else
  \echo 'drop_schema.sql drops the beyond_todo schema with ALL data. Re-run with -v confirm=yes'
  do $$ begin raise exception 'confirmation required (-v confirm=yes)'; end $$;
\endif

drop schema if exists beyond_todo cascade;
