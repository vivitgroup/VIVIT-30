insert into vgroup.role_permissions(role_id, permission_id)
select r.id, p.id
from vgroup.roles r
join vgroup.permissions p on true
where r.code='GROUP_SUPER_ADMIN'
on conflict do nothing;

insert into vgroup.role_permissions(role_id, permission_id)
select r.id, p.id
from vgroup.roles r
join vgroup.business_units bu on bu.id=r.business_unit_id
join vgroup.permissions p on p.business_unit_id=bu.id
where r.code in ('HOSPITALITY_ADMIN','TECH_ADMIN')
on conflict do nothing;

insert into vgroup.role_permissions(role_id, permission_id)
select r.id, p.id
from vgroup.roles r
join vgroup.permissions p on p.business_unit_id=r.business_unit_id
where r.code in ('HOSPITALITY_FINANCE','TECH_FINANCE')
  and ((p.module='finance' and p.action in ('view','create','update','approve','export'))
       or (p.module='audit' and p.action='view')
       or (p.module='notifications' and p.action='view'))
on conflict do nothing;

insert into vgroup.role_permissions(role_id, permission_id)
select r.id, p.id
from vgroup.roles r
join vgroup.permissions p on p.business_unit_id=r.business_unit_id
where r.code in ('PROPERTY_MANAGER','PROJECT_MANAGER','DESIGNER_DEVELOPER')
  and p.module in ('archive','audit','notifications')
  and p.action in ('view','create','update')
on conflict do nothing;

insert into vgroup.role_permissions(role_id, permission_id)
select r.id, p.id
from vgroup.roles r
join vgroup.permissions p on p.business_unit_id=r.business_unit_id
where r.code in ('OWNER','TECH_CLIENT')
  and ((p.module='notifications' and p.action='view')
       or (p.module='finance' and p.action in ('view','export')))
on conflict do nothing;
