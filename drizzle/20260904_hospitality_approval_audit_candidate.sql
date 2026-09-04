begin;

create or replace function hospitality.approve_work_order(p_work_order_id uuid, p_approved_by uuid)
returns hospitality.work_orders
language plpgsql
security definer
set search_path to pg_catalog, hospitality, vgroup
as $function$
declare
  v_hospitality_bu uuid;
  v_row hospitality.work_orders;
  v_from_status text;
begin
  select bu.id into v_hospitality_bu
  from vgroup.business_units bu
  where bu.code='hospitality' and bu.status='active'
  limit 1;
  if v_hospitality_bu is null then raise exception 'hospitality_business_unit_unavailable'; end if;

  select wo.status into v_from_status
  from hospitality.work_orders wo
  where wo.id=p_work_order_id
    and wo.business_unit_id=v_hospitality_bu
    and wo.archived_at is null
  for update;
  if not found then raise exception 'work_order_not_found_or_out_of_scope'; end if;

  update hospitality.work_orders wo
  set approved_by=p_approved_by,
      status=case when wo.status='waiting_approval' then 'completed' else wo.status end,
      completed_at=case when wo.status='waiting_approval' then coalesce(wo.completed_at,now()) else wo.completed_at end,
      updated_at=now()
  where wo.id=p_work_order_id
    and wo.business_unit_id=v_hospitality_bu
    and wo.archived_at is null
    and wo.status in ('waiting_approval','completed')
  returning wo.* into v_row;
  if v_row.id is null then raise exception 'work_order_not_approvable'; end if;

  insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value)
  values(v_hospitality_bu,p_approved_by,'hospitality.work_order.approve','work_order',v_row.id,
         jsonb_build_object('status',v_from_status),jsonb_build_object('status',v_row.status));
  return v_row;
end
$function$;

create or replace function hospitality.approve_purchase_order(p_po_id uuid, p_approved_by uuid)
returns hospitality.purchase_orders
language plpgsql
security definer
set search_path to pg_catalog, hospitality, vgroup
as $function$
declare
  v_hospitality_bu uuid;
  v_row hospitality.purchase_orders;
begin
  select bu.id into v_hospitality_bu
  from vgroup.business_units bu
  where bu.code='hospitality' and bu.status='active'
  limit 1;
  if v_hospitality_bu is null then raise exception 'hospitality_business_unit_unavailable'; end if;

  select po.* into v_row
  from hospitality.purchase_orders po
  where po.id=p_po_id
    and po.business_unit_id=v_hospitality_bu
    and po.status='pending_approval'
  for update;
  if v_row.id is null then raise exception 'purchase_order_not_approvable_or_out_of_scope'; end if;

  if not exists (
    select 1 from hospitality.vendors v
    where v.id=v_row.vendor_id and v.business_unit_id=v_hospitality_bu
  ) then raise exception 'purchase_order_vendor_out_of_scope'; end if;

  if v_row.property_id is not null and not exists (
    select 1 from hospitality.properties p
    where p.id=v_row.property_id
      and p.business_unit_id=v_hospitality_bu
      and p.archived_at is null
  ) then raise exception 'purchase_order_property_out_of_scope'; end if;

  if v_row.work_order_id is not null and not exists (
    select 1 from hospitality.work_orders wo
    where wo.id=v_row.work_order_id
      and wo.business_unit_id=v_hospitality_bu
      and (v_row.property_id is null or wo.property_id=v_row.property_id)
  ) then raise exception 'purchase_order_work_order_out_of_scope'; end if;

  update hospitality.purchase_orders po
  set status='approved',approved_by=p_approved_by,approved_at=now(),updated_at=now()
  where po.id=p_po_id and po.business_unit_id=v_hospitality_bu
  returning po.* into v_row;

  insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value)
  values(v_hospitality_bu,p_approved_by,'hospitality.purchase_order.approve','purchase_order',v_row.id,
         jsonb_build_object('status','pending_approval'),jsonb_build_object('status',v_row.status));
  return v_row;
end
$function$;

commit;
