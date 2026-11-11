-- One-off: apply the e-mail code sign-up release to an existing database.
-- Delete this file once production has been updated.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/tmp/2026-11-11_email_code_signup.sql
--
-- What it does (in one transaction with -1):
--   1. Applies supabase/migrations/signup_code.sql (auth_tokens.attempts, users.name nullable).
--      Same file the usual "cat supabase/migrations/*.sql | psql" applies; running both is harmless.
--   2. Deletes leftover e-mail verification *links*: the link flow is gone, so they can never be used.
--   3. Lists unverified users. They are signed out by this release and must verify with a
--      code at their next login (their data is kept).

\echo '== 1. schema'
\ir ../migrations/signup_code.sql

\echo '== 2. delete unused verification links'
delete from beyond_todo.auth_tokens
where purpose = 'verify_email' and used_at is null;

\echo '== 3. unverified users (signed out; verify with a code at next login)'
select email, created_at
from beyond_todo.users
where email_verified_at is null
order by created_at;

\echo '== check'
select
  (select is_nullable from information_schema.columns
    where table_schema = 'beyond_todo' and table_name = 'users' and column_name = 'name') as users_name_nullable,
  (select count(*) from information_schema.columns
    where table_schema = 'beyond_todo' and table_name = 'auth_tokens' and column_name = 'attempts') = 1 as auth_tokens_attempts;
