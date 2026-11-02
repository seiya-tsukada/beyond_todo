#!/bin/sh
# Runs once when the Postgres volume is first created.
# Creates the roles Supabase provides (the migrations reference them) and an
# empty database for the backend integration tests.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
create role anon nologin;
create role authenticated nologin;
create database beyond_todo_test;
SQL
