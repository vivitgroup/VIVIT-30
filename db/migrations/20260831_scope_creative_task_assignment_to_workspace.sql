-- Applied to production Supabase on 2026-08-31 during VIVITO task certification.
-- Prevents creative-task assignee leakage across workspaces and validates client tenancy.

create or replace function public.enforce_creative_task_assignment_by_type()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  target_id text;
begin
  if new.assigned_to_id is not null then
    if not exists (
      select 1 from public.users u
      where u.id = new.assigned_to_id
        and u.workspace_id = new.workspace_id
        and u.is_active = true
        and u.role = 'CREATOR'::role
    ) then
      raise exception 'Task assignee must be an active creator in the same workspace.';
    end if;
    return new;
  end if;

  if new.type in ('VIDEO_EDIT'::creative_type,'REEL'::creative_type,'MOTION_GRAPHIC'::creative_type) then
    select id into target_id
    from public.users
    where lower(email)='omar@vivitgroup.com'
      and workspace_id = new.workspace_id
      and is_active=true
      and role='CREATOR'::role
    limit 1;
  elsif new.type in ('GRAPHIC'::creative_type,'CAROUSEL'::creative_type) then
    select id into target_id
    from public.users
    where lower(email)='asmaa@vivitgroup.com'
      and workspace_id = new.workspace_id
      and is_active=true
      and role='CREATOR'::role
    limit 1;
  end if;

  if target_id is not null then
    new.assigned_to_id := target_id;
  end if;
  return new;
end;
$function$;

create or replace function public.sync_creative_task_client_team()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  select c.account_manager_id,c.media_buyer_id
    into new.account_manager_id,new.media_buyer_id
  from public.clients c
  where c.id=new.client_id
    and c.workspace_id=new.workspace_id;

  if not found then
    raise exception 'Task client must belong to the same workspace.';
  end if;
  return new;
end;
$function$;
