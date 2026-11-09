-- Delete expired sessions and expired or used one-time tokens.
-- Same as the cleanup the weekly cron job runs (users.purge_expired).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/maintenance/purge_expired.sql

delete from beyond_todo.sessions where expires_at <= now();
delete from beyond_todo.auth_tokens where expires_at <= now() or used_at is not null;
