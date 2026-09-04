begin;

create or replace function hospitality.approve_work_order(p_work_order_id uuid, p_approved_by uuid)
returns hospitality.work_orders
language plpgsql
security definer
set search_path to 'hospitality','vgroup','public'
as $function$
declare
  v_row hospitality.work_orders;
  v_from_status text;
begin
  select status into v_from_status from hospitality.work_orders where id=p_work_order_id and archived_at is null for update;
  update hospitality.work_orders
  set approved_by=p_approved_by,
      status=case when status='waiting_approval' then 'completed' else status end,
      completed_at=case when status='waiting_approval' then coalesce(completed_at,now()) else completed_at end,
      updated_at=now()
  where id=p_work_order_id and archived_at is null and status in ('waiting_approval','completed')
  returning * into v_row;
  if v_row.id is null then raise exception 'work_order_not_approvable'; end if;
  insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value)
  values(v_row.business_unit_id,p_approved_by,'hospitality.work_order.approve','work_order',v_row.id,
         jsonb_build_object('status',v_from_status),jsonb_build_object('status',v_row.status));
  return v_row;
end
$function$;

create or replace function hospitality.approve_purchase_order(p_po_id uuid, p_approved_by uuid)
returns hospitality.purchase_orders
language plpgsql
security definer
set search_path to 'hospitality','vgroup','public'
as $function$
declare
  v_row hospitality.purchase_orders;
begin
  update hospitality.purchase_orders
  set status='approved',approved_by=p_approved_by,approved_at=now(),updated_at=now()
  where id=p_po_id and status='pending_approval'
  returning * into v_row;
  if v_row.id is null then raise exception 'purchase_order_not_approvable'; end if;
  insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value)
  values(v_row.business_unit_id,p_approved_by,'hospitality.purchase_order.approve','purchase_order',v_row.id,
         jsonb_build_object('status','pending_approval'),jsonb_build_object('status',v_row.status));
  return v_row;
end
$function$;

commit;
