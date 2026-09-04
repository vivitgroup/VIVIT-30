-- Harden Hospitality inventory and purchase-order mutations against cross-business-unit access.
-- Applied to the consolidated vivit-group-erp database on 2026-09-04.

create or replace function hospitality.adjust_inventory(
  p_item_id uuid,
  p_quantity_delta numeric,
  p_movement_type text,
  p_reason text default null,
  p_work_order_id uuid default null,
  p_created_by uuid default null
)
returns table(item_id uuid, new_quantity numeric, movement_id uuid)
language plpgsql
security definer
set search_path to pg_catalog, hospitality, vgroup
as $function$
declare
  v_hospitality_bu uuid;
  v_current numeric;
  v_new numeric;
  v_mid uuid;
  v_property_id uuid;
begin
  select bu.id into v_hospitality_bu
  from vgroup.business_units bu
  where bu.code = 'hospitality' and bu.status = 'active'
  limit 1;

  if v_hospitality_bu is null then
    raise exception 'hospitality_business_unit_unavailable';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'quantity_delta_must_not_be_zero';
  end if;

  if p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'invalid_movement_type';
  end if;

  select ii.quantity, ii.property_id
    into v_current, v_property_id
  from hospitality.inventory_items ii
  where ii.id = p_item_id
    and ii.business_unit_id = v_hospitality_bu
    and ii.archived_at is null
  for update;

  if not found then
    raise exception 'inventory_item_not_found_or_out_of_scope';
  end if;

  if v_property_id is not null and not exists (
    select 1
    from hospitality.properties p
    where p.id = v_property_id
      and p.business_unit_id = v_hospitality_bu
      and p.archived_at is null
  ) then
    raise exception 'inventory_property_out_of_scope';
  end if;

  if p_work_order_id is not null and not exists (
    select 1
    from hospitality.work_orders wo
    where wo.id = p_work_order_id
      and wo.business_unit_id = v_hospitality_bu
      and (v_property_id is null or wo.property_id = v_property_id)
  ) then
    raise exception 'inventory_work_order_out_of_scope';
  end if;

  v_new := v_current + p_quantity_delta;
  if v_new < 0 then
    raise exception 'inventory_would_be_negative';
  end if;

  update hospitality.inventory_items ii
  set quantity = v_new,
      updated_at = now()
  where ii.id = p_item_id
    and ii.business_unit_id = v_hospitality_bu;

  insert into hospitality.inventory_movements(
    item_id,
    movement_type,
    quantity_delta,
    reason,
    related_work_order_id,
    created_by
  )
  values(
    p_item_id,
    p_movement_type,
    p_quantity_delta,
    p_reason,
    p_work_order_id,
    p_created_by
  )
  returning id into v_mid;

  return query select p_item_id, v_new, v_mid;
end
$function$;

create or replace function hospitality.approve_purchase_order(
  p_po_id uuid,
  p_approved_by uuid
)
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
  where bu.code = 'hospitality' and bu.status = 'active'
  limit 1;

  if v_hospitality_bu is null then
    raise exception 'hospitality_business_unit_unavailable';
  end if;

  select po.* into v_row
  from hospitality.purchase_orders po
  where po.id = p_po_id
    and po.business_unit_id = v_hospitality_bu
    and po.status = 'pending_approval'
  for update;

  if v_row.id is null then
    raise exception 'purchase_order_not_approvable_or_out_of_scope';
  end if;

  if not exists (
    select 1
    from hospitality.vendors v
    where v.id = v_row.vendor_id
      and v.business_unit_id = v_hospitality_bu
  ) then
    raise exception 'purchase_order_vendor_out_of_scope';
  end if;

  if v_row.property_id is not null and not exists (
    select 1
    from hospitality.properties p
    where p.id = v_row.property_id
      and p.business_unit_id = v_hospitality_bu
      and p.archived_at is null
  ) then
    raise exception 'purchase_order_property_out_of_scope';
  end if;

  if v_row.work_order_id is not null and not exists (
    select 1
    from hospitality.work_orders wo
    where wo.id = v_row.work_order_id
      and wo.business_unit_id = v_hospitality_bu
      and (v_row.property_id is null or wo.property_id = v_row.property_id)
  ) then
    raise exception 'purchase_order_work_order_out_of_scope';
  end if;

  update hospitality.purchase_orders po
  set status = 'approved',
      approved_by = p_approved_by,
      approved_at = now(),
      updated_at = now()
  where po.id = p_po_id
    and po.business_unit_id = v_hospitality_bu
  returning po.* into v_row;

  return v_row;
end
$function$;
