-- Delete one user and all of their data (every table cascades from users).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v email=someone@example.com -f supabase/maintenance/delete_user.sql

\if :{?email}
\else
  \echo 'Pass the address to delete: -v email=someone@example.com'
  do $$ begin raise exception 'email is required (-v email=...)'; end $$;
\endif

delete from beyond_todo.users
where lower(email) = lower(:'email')
returning id, email;
