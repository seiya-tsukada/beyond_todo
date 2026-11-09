-- Exact row count of every table in the beyond_todo schema (read-only).
--
--   psql "$DATABASE_URL" -f supabase/maintenance/row_counts.sql

select
  table_name,
  (xpath('/row/n/text()',
         query_to_xml(format('select count(*) as n from beyond_todo.%I', table_name), false, true, '')
  ))[1]::text::bigint as rows
from information_schema.tables
where table_schema = 'beyond_todo' and table_type = 'BASE TABLE'
order by table_name;
