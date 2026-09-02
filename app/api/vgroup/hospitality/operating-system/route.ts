import {NextRequest,NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

const ok=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const bad=(code:string,message:string,status=400)=>NextResponse.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
const num=(v:unknown)=>Number(v);

async function hospitalityBu(sql:ReturnType<typeof getVGroupSql>){
 const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='hospitality' and status='active' limit 1`;
 if(!bu)throw new Error("HOSPITALITY_BUSINESS_UNIT_UNAVAILABLE");
 return bu.id;
}

export async function GET(){
 await requireBusinessPermission("hospitality","properties:view");
 const sql=getVGroupSql(); const buId=await hospitalityBu(sql);
 const [summary]=await sql`select
  (select count(*)::int from hospitality.housekeeping_tasks where business_unit_id=${buId}::uuid and status not in ('passed','cancelled')) housekeeping_open,
  (select count(*)::int from hospitality.guest_complaints where business_unit_id=${buId}::uuid and status not in ('resolved','closed')) complaints_open,
  (select count(*)::int from hospitality.guest_conversations where business_unit_id=${buId}::uuid and status<>'closed') inbox_open,
  (select count(*)::int from hospitality.preventive_maintenance_plans where business_unit_id=${buId}::uuid and active and next_due_on<=current_date+30) maintenance_due,
  (select count(*)::int from hospitality.procurement_rfqs where business_unit_id=${buId}::uuid and status in ('open','evaluation')) rfqs_open,
  (select count(*)::int from hospitality.channel_reconciliations where business_unit_id=${buId}::uuid and status in ('pending','variance')) channel_reconciliation_open,
  (select count(*)::int from hospitality.lost_found_items where business_unit_id=${buId}::uuid and status not in ('returned','disposed')) lost_found_open,
  (select count(*)::int from hospitality.stay_operations where business_unit_id=${buId}::uuid and status not in ('closed')) stay_operations_open`;
 const housekeeping=await sql`select h.id::text,h.property_id::text,p.name property_name,h.task_type,h.status,h.scheduled_start,h.due_at,h.sla_breached from hospitality.housekeeping_tasks h join hospitality.properties p on p.id=h.property_id where h.business_unit_id=${buId}::uuid and h.status not in ('passed','cancelled') order by h.due_at limit 40`;
 const reconciliations=await sql`select r.id::text,c.channel,p.name property_name,r.period_start,r.period_end,r.expected_payout,r.actual_payout,r.channel_fees,r.variance,r.status from hospitality.channel_reconciliations r join hospitality.channel_connections c on c.id=r.channel_connection_id join hospitality.properties p on p.id=c.property_id where r.business_unit_id=${buId}::uuid and r.status in ('pending','variance') order by r.period_end desc limit 30`;
 return ok({summary,housekeeping,reconciliations});
}

export async function POST(request:NextRequest){
 const session=await requireBusinessPermission("hospitality","properties:update");
 const sql=getVGroupSql(); const buId=await hospitalityBu(sql);
 let body:Record<string,unknown>; try{body=await request.json()}catch{return bad("INVALID_JSON","Invalid JSON body")}
 const operation=str(body.operation);
 try{
  switch(operation){
   case "housekeeping":{
    const propertyId=str(body.propertyId),start=str(body.scheduledStart),due=str(body.dueAt); if(!propertyId||!start||!due)return bad("INVALID_HOUSEKEEPING","propertyId, scheduledStart and dueAt are required");
    const [property]=await sql`select id from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!property)return bad("PROPERTY_NOT_FOUND","Property not found",404);
    const [row]=await sql`insert into hospitality.housekeeping_tasks(business_unit_id,property_id,reservation_id,task_type,status,assigned_to,scheduled_start,due_at,notes) values(${buId}::uuid,${propertyId}::uuid,${str(body.reservationId)||null}::uuid,${str(body.taskType)||"turnover"},'scheduled',${str(body.assignedTo)||null}::uuid,${start}::timestamptz,${due}::timestamptz,${str(body.notes)||null}) returning id::text,status`;
    return ok(row,201);
   }
   case "pricing_rule":{
    const propertyId=str(body.propertyId),name=str(body.name),ruleType=str(body.ruleType); if(!propertyId||!name||!ruleType)return bad("INVALID_PRICING_RULE","propertyId, name and ruleType are required");
    const [property]=await sql`select id from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!property)return bad("PROPERTY_NOT_FOUND","Property not found",404);
    const [row]=await sql`insert into hospitality.pricing_rules(business_unit_id,property_id,name,rule_type,starts_on,ends_on,occupancy_min,occupancy_max,adjustment_type,adjustment_value,minimum_stay,priority,active,created_by) values(${buId}::uuid,${propertyId}::uuid,${name},${ruleType},${str(body.startsOn)||null}::date,${str(body.endsOn)||null}::date,${body.occupancyMin==null?null:num(body.occupancyMin)},${body.occupancyMax==null?null:num(body.occupancyMax)},${str(body.adjustmentType)||"percent"},${num(body.adjustmentValue)||0},${num(body.minimumStay)||1},${num(body.priority)||100},true,${session.userId}::uuid) returning id::text,active`;
    return ok(row,201);
   }
   case "guest":{
    const fullName=str(body.fullName); if(!fullName)return bad("INVALID_GUEST","fullName is required");
    const [row]=await sql`insert into hospitality.guests(business_unit_id,full_name,email,phone,vip_level,preferences,notes) values(${buId}::uuid,${fullName},${str(body.email)||null},${str(body.phone)||null},${str(body.vipLevel)||"standard"},${JSON.stringify(body.preferences??{})}::jsonb,${str(body.notes)||null}) returning id::text,full_name,vip_level`;
    return ok(row,201);
   }
   case "move_reservation":{
    const reservationId=str(body.reservationId),propertyId=str(body.propertyId); if(!reservationId||!propertyId)return bad("INVALID_MOVE","reservationId and propertyId are required");
    const [target]=await sql`select id from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!target)return bad("PROPERTY_NOT_FOUND","Target property not found",404);
    const [row]=await sql`update hospitality.reservations set property_id=${propertyId}::uuid,updated_at=now() where id=${reservationId}::uuid and business_unit_id=${buId}::uuid returning id::text,property_id::text,check_in,check_out,status`;
    if(!row)return bad("RESERVATION_NOT_FOUND","Reservation not found",404); return ok(row);
   }
   case "channel_reconcile":{
    const reconciliationId=str(body.reconciliationId); if(!reconciliationId)return bad("INVALID_RECONCILIATION","reconciliationId is required");
    const [allowed]=await sql`select id from hospitality.channel_reconciliations where id=${reconciliationId}::uuid and business_unit_id=${buId}::uuid`; if(!allowed)return bad("RECONCILIATION_NOT_FOUND","Reconciliation not found",404);
    const [row]=await sql`select * from hospitality.refresh_channel_reconciliation(${reconciliationId}::uuid)`; return ok(row);
   }
   default:return bad("UNSUPPORTED_OPERATION","Unsupported Hospitality operation");
  }
 }catch(error){const message=error instanceof Error?error.message:"HOSPITALITY_OPERATION_FAILED";return bad(message.includes("overlap")?"RESERVATION_OVERLAP":"HOSPITALITY_OPERATION_FAILED",message,409)}
}
