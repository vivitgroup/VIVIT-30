-- Fail-closed RLS hardening for server-only business tables.
-- VIVIT ERP accesses business data server-side through Postgres/Drizzle;
-- no permissive browser policies are intentionally created.

begin;

alter table if exists public.client_competitors enable row level security;
alter table if exists public.operational_tasks enable row level security;

-- Verification: both tables must have RLS enabled before commit.
do $$
declare missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('client_competitors','operational_tasks')
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if missing is not null then
    raise exception 'RLS hardening failed for: %', missing;
  end if;
end $$;

commit;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname in ('client_competitors','operational_tasks')
order by c.relname;
