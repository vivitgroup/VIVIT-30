begin;

create or replace function public.vivit_sync_client_workspace()
returns trigger
language plpgsql
as $$
declare
  v_workspace_id text;
begin
  if new.client_id is null then
    return new;
  end if;

  select c.workspace_id
    into v_workspace_id
    from public.clients c
   where c.id = new.client_id
   limit 1;

  if v_workspace_id is null then
    raise exception 'Client % does not exist or has no workspace', new.client_id;
  end if;

  new.workspace_id := v_workspace_id;
  return new;
end;
$$;

drop trigger if exists trg_creative_tasks_sync_workspace on public.creative_tasks;
create trigger trg_creative_tasks_sync_workspace
before insert or update of client_id, workspace_id
on public.creative_tasks
for each row execute function public.vivit_sync_client_workspace();

drop trigger if exists trg_ad_campaigns_sync_workspace on public.ad_campaigns;
create trigger trg_ad_campaigns_sync_workspace
before insert or update of client_id, workspace_id
on public.ad_campaigns
for each row execute function public.vivit_sync_client_workspace();

drop trigger if exists trg_ad_platform_connections_sync_workspace on public.ad_platform_connections;
create trigger trg_ad_platform_connections_sync_workspace
before insert or update of client_id, workspace_id
on public.ad_platform_connections
for each row
when (new.client_id is not null)
execute function public.vivit_sync_client_workspace();

create index if not exists idx_creative_tasks_workspace_client_status
  on public.creative_tasks(workspace_id, client_id, status);
create index if not exists idx_ad_campaigns_workspace_client_status
  on public.ad_campaigns(workspace_id, client_id, status);
create index if not exists idx_ad_connections_workspace_client
  on public.ad_platform_connections(workspace_id, client_id);

-- Repair existing rows so all downstream pages read the same tenant scope.
update public.creative_tasks t
   set workspace_id = c.workspace_id
  from public.clients c
 where c.id = t.client_id
   and t.workspace_id is distinct from c.workspace_id;

update public.ad_campaigns a
   set workspace_id = c.workspace_id
  from public.clients c
 where c.id = a.client_id
   and a.workspace_id is distinct from c.workspace_id;

update public.ad_platform_connections a
   set workspace_id = c.workspace_id
  from public.clients c
 where c.id = a.client_id
   and a.workspace_id is distinct from c.workspace_id;

commit;
