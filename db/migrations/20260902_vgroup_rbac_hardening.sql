alter function vgroup.set_updated_at() set search_path = vgroup, pg_catalog;

create table if not exists vgroup.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references vgroup.roles(id) on delete cascade,
  permission_id uuid not null references vgroup.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(role_id, permission_id)
);
alter table vgroup.role_permissions enable row level security;

create unique index if not exists uq_vgroup_roles_scope_code on vgroup.roles ((coalesce(business_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)), code);
create unique index if not exists uq_vgroup_permissions_scope_module_action on vgroup.permissions ((coalesce(business_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)), module, action);
create unique index if not exists uq_vgroup_ubr_user_bu_role on vgroup.user_business_unit_roles(user_id, business_unit_id, role_id);
create unique index if not exists uq_vgroup_employee_user_bu on vgroup.employees(user_id, business_unit_id);
create unique index if not exists uq_vgroup_employee_permission on vgroup.employee_permissions(employee_id, permission_id);
create unique index if not exists uq_vgroup_users_email_ci on vgroup.users(lower(email));

create index if not exists idx_vgroup_roles_bu on vgroup.roles(business_unit_id);
create index if not exists idx_vgroup_permissions_bu on vgroup.permissions(business_unit_id);
create index if not exists idx_vgroup_ubr_bu on vgroup.user_business_unit_roles(business_unit_id);
create index if not exists idx_vgroup_ubr_role on vgroup.user_business_unit_roles(role_id);
create index if not exists idx_vgroup_employee_permissions_permission on vgroup.employee_permissions(permission_id);
create index if not exists idx_vgroup_employee_permissions_granted_by on vgroup.employee_permissions(granted_by);
create index if not exists idx_vgroup_archive_archived_by on vgroup.archive_log(archived_by);
create index if not exists idx_vgroup_archive_restored_by on vgroup.archive_log(restored_by);
create index if not exists idx_vgroup_audit_bu on vgroup.audit_logs(business_unit_id);
create index if not exists idx_vgroup_audit_user on vgroup.audit_logs(user_id);
create index if not exists idx_vgroup_notifications_bu on vgroup.notifications(business_unit_id);
create index if not exists idx_vgroup_role_permissions_permission on vgroup.role_permissions(permission_id);

revoke all on schema vgroup from anon, authenticated;
revoke all on all tables in schema vgroup from anon, authenticated;
grant usage on schema vgroup to service_role;
grant all on all tables in schema vgroup to service_role;
grant all on all sequences in schema vgroup to service_role;

create policy business_units_server_only on vgroup.business_units for all to authenticated using (false) with check (false);
create policy users_server_only on vgroup.users for all to authenticated using (false) with check (false);
create policy roles_server_only on vgroup.roles for all to authenticated using (false) with check (false);
create policy ubr_server_only on vgroup.user_business_unit_roles for all to authenticated using (false) with check (false);
create policy employees_server_only on vgroup.employees for all to authenticated using (false) with check (false);
create policy permissions_server_only on vgroup.permissions for all to authenticated using (false) with check (false);
create policy employee_permissions_server_only on vgroup.employee_permissions for all to authenticated using (false) with check (false);
create policy role_permissions_server_only on vgroup.role_permissions for all to authenticated using (false) with check (false);
create policy archive_log_server_only on vgroup.archive_log for all to authenticated using (false) with check (false);
create policy audit_logs_server_only on vgroup.audit_logs for all to authenticated using (false) with check (false);
create policy notifications_server_only on vgroup.notifications for all to authenticated using (false) with check (false);
