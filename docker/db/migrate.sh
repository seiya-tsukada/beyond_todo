#!/bin/sh
# Applies supabase/migrations/*.sql that have not been applied yet, in file-name
# order. Each file runs in its own transaction and is recorded in
# public.local_schema_migrations, so re-running is safe.
set -eu

export PGOPTIONS="-c client_min_messages=warning"
export PGHOST="${PGHOST:-db}" PGUSER="${PGUSER:-postgres}" PGDATABASE="${PGDATABASE:-beyond_todo}"

psql -v ON_ERROR_STOP=1 -q -c \
  "create table if not exists public.local_schema_migrations (
     version text primary key,
     applied_at timestamptz not null default now()
   )"

for file in /migrations/*.sql; do
  version="$(basename "$file" .sql)"
  # psql only interpolates :'var' in SQL read from stdin/files, not in -c
  applied="$(echo "select 1 from public.local_schema_migrations where version = :'version'" \
    | psql -tA -v version="$version" | tr -d '[:space:]')"
  if [ "$applied" = "1" ]; then
    continue
  fi
  echo "applying $version"
  {
    cat "$file"
    printf "\ninsert into public.local_schema_migrations (version) values (:'version');\n"
  } | psql -v ON_ERROR_STOP=1 -q -1 -v version="$version"
done
echo "migrations up to date"
