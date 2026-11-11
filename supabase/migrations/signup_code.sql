-- Sign-up by e-mail + password only, verified with a one-time code (6 digits).
--
-- 1. The code is stored in auth_tokens (purpose 'verify_email') as the SHA-256 hash
--    of "<user_id>:<code>", so the unique token_hash never collides across users.
--    Wrong guesses are counted in `attempts`; the code is invalidated after too many.
-- 2. The name is no longer asked at sign-up, so users.name may be null (the app
--    shows the part of the address before "@" instead).
-- Idempotent: safe to run again.

alter table beyond_todo.auth_tokens add column if not exists attempts integer not null default 0;

alter table beyond_todo.users alter column name drop not null;
