begin;

-- CTO live audit: keep VIVITO foreign-key paths indexed and remove one exact duplicate index.
create index if not exists idx_vivito_approval_events_event_id on public.vivito_approval_events(event_id);
create index if not exists idx_vivito_escalations_event_id on public.vivito_escalations(event_id);
drop index if exists public.idx_vivito_decision_workspace_client;

-- Client lifecycle invariant: a CLIENT portal user must not remain active when it has no active client link.
create or replace function public.sync_client_portal_user_on_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_active = true and new.is_active = false and new.user_id is not null then
    update public.users u
       set is_active = false,
           updated_at = now()
     where u.id = new.user_id
       and u.workspace_id = new.workspace_id
       and u.role::text = 'CLIENT'
       and u.is_active = true
       and not exists (
         select 1
           from public.clients c
          where c.workspace_id = new.workspace_id
            and c.user_id = new.user_id
            and c.is_active = true
            and c.id <> new.id
       );

    if found then
      insert into public.audit_logs(workspace_id,user_id,action,entity,entity_id,old_values,new_values)
      values(new.workspace_id,coalesce(new.archived_by,'system'),'client_portal_user_auto_deactivated','users',new.user_id,
             jsonb_build_object('isActive',true)::text,
             jsonb_build_object('isActive',false,'reason','no-active-client-link','clientId',new.id)::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_client_portal_user_on_deactivation on public.clients;
create trigger trg_sync_client_portal_user_on_deactivation
after update of is_active on public.clients
for each row execute function public.sync_client_portal_user_on_deactivation();

-- Repair only active approved CLIENT users that are linked to clients, but to no active client.
with stale as (
  select u.id,u.workspace_id
    from public.users u
   where u.role::text='CLIENT'
     and u.is_active=true
     and u.approval_status::text='APPROVED'
     and exists (select 1 from public.clients c where c.user_id=u.id and c.workspace_id=u.workspace_id)
     and not exists (select 1 from public.clients c where c.user_id=u.id and c.workspace_id=u.workspace_id and c.is_active=true)
), changed as (
  update public.users u
     set is_active=false,updated_at=now()
    from stale s
   where u.id=s.id
   returning u.id,u.workspace_id
)
insert into public.audit_logs(workspace_id,user_id,action,entity,entity_id,old_values,new_values)
select workspace_id,'system','client_portal_user_reconciled','users',id,
       jsonb_build_object('isActive',true)::text,
       jsonb_build_object('isActive',false,'reason','no-active-client-link','source','cto-live-audit')::text
  from changed;

-- VIVITO autonomy is fail-closed for every workspace. Explicit enablement is required.
insert into public.vivito_governance_controls(
  id,workspace_id,scope_type,scope_id,autonomy_enabled,kill_switch,
  max_daily_actions,max_daily_ai_calls,policy_version
)
select gen_random_uuid()::text,w.id,'WORKSPACE',null,false,true,25,100,'fail-closed-v1'
from public.workspaces w
where not exists (
  select 1 from public.vivito_governance_controls g
  where g.workspace_id=w.id and g.scope_type='WORKSPACE' and g.scope_id is null
);

create or replace function public.ensure_vivito_workspace_governance()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.vivito_governance_controls(
    id,workspace_id,scope_type,scope_id,autonomy_enabled,kill_switch,
    max_daily_actions,max_daily_ai_calls,policy_version
  ) values (
    gen_random_uuid()::text,new.id,'WORKSPACE',null,false,true,25,100,'fail-closed-v1'
  ) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_vivito_workspace_governance on public.workspaces;
create trigger trg_ensure_vivito_workspace_governance
after insert on public.workspaces
for each row execute function public.ensure_vivito_workspace_governance();

commit;
