-- VIVIT ERP database security hardening — RELEASE-TIME DDL ONLY
-- Do not execute before the final release gate.
-- The application intentionally keeps public tables RLS-enabled without browser policies:
-- all business-data access is server-side and browser direct-table access remains fail-closed.

begin;

alter function public.enforce_campaign_connection_scope()
  set search_path = public, pg_temp;

-- Fail closed if the function configuration did not stick.
do $$
declare cfg text[];
begin
  select proconfig into cfg
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='enforce_campaign_connection_scope'
  limit 1;
  if cfg is null or not ('search_path=public, pg_temp'=any(cfg) or 'search_path=public,pg_temp'=any(cfg)) then
    raise exception 'Database security hardening failed: function search_path is not fixed';
  end if;
end $$;

commit;

-- Operator verification: expected mutable_search_path_functions = 0.
select count(*) as mutable_search_path_functions
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='enforce_campaign_connection_scope'
  and not coalesce(array_to_string(p.proconfig,','),'') like '%search_path=public%';
