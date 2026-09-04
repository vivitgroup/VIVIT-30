begin;

-- Candidate-only RBAC remediation. Do not apply to Production before Hospitality release gates pass.
do $block$
declare
  v_bu uuid;
  v_admin uuid;
  v_manager uuid;
begin
  select id into v_bu from vgroup.business_units where code='hospitality' and status='active' limit 1;
  if v_bu is null then raise exception 'hospitality_business_unit_not_found'; end if;

  select id into v_admin from vgroup.roles where code='HOSPITALITY_ADMIN' and business_unit_id=v_bu limit 1;
  select id into v_manager from vgroup.roles where code='PROPERTY_MANAGER' and business_unit_id=v_bu limit 1;
  if v_admin is null or v_manager is null then raise exception 'hospitality_operational_roles_missing'; end if;

  insert into vgroup.permissions(module,action,business_unit_id)
  select module,action,v_bu
  from (values
    ('properties','view'),('properties','create'),('properties','update'),('properties','delete'),
    ('reservations','view'),('reservations','create'),('reservations','update'),('reservations','delete'),
    ('owners','view'),('owners','create'),('owners','update'),
    ('maintenance','approve'),('purchase_orders','approve')
  ) as required(module,action)
  on conflict(module,action,business_unit_id) do nothing;

  insert into vgroup.role_permissions(role_id,permission_id)
  select v_admin,p.id
  from vgroup.permissions p
  where p.business_unit_id=v_bu
    and (
      (p.module in ('properties','reservations') and p.action in ('view','create','update','delete'))
      or (p.module='owners' and p.action in ('view','create','update'))
      or (p.module in ('maintenance','purchase_orders') and p.action='approve')
    )
  on conflict(role_id,permission_id) do nothing;

  insert into vgroup.role_permissions(role_id,permission_id)
  select v_manager,p.id
  from vgroup.permissions p
  where p.business_unit_id=v_bu
    and (
      (p.module='properties' and p.action in ('view','create','update'))
      or (p.module='reservations' and p.action in ('view','create','update'))
      or (p.module='owners' and p.action='view')
    )
  on conflict(role_id,permission_id) do nothing;
end
$block$;

commit;
