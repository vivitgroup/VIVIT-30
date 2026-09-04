import {NextRequest,NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";

const ok=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const bad=(code:string,message:string,status=400)=>NextResponse.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
const num=(v:unknown)=>Number(v);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
const taskTypes=new Set(["turnover","stayover","deep_clean","inspection_only","ad_hoc"]);
const ruleTypes=new Set(["seasonal","weekend","occupancy","minimum_stay","manual_override"]);
const adjustmentTypes=new Set(["percent","fixed"]);
const vipLevels=new Set(["standard","vip","vip_plus"]);

async function hospitalityBu(sql:ReturnType<typeof getVGroupSql>){
 const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='hospitality' and status='active' limit 1`;
 if(!bu)throw new Error("HOSPITALITY_BUSINESS_UNIT_UNAVAILABLE");
 return bu.id;
}

async function audit(sql:ReturnType<typeof getVGroupSql>,buId:string,userId:string,action:string,entityType:string,entityId:string,payload:Record<string,unknown>){
 await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${buId}::uuid,${userId}::uuid,${action},${entityType},${entityId}::uuid,${JSON.stringify(payload)}::jsonb)`;
}

export async function GET(){
 try{
  await requireApiPermission("hospitality","properties:view");
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
 }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:NextRequest){
 try{
  const session=await requireApiPermission("hospitality","properties:update");
  const sql=getVGroupSql(); const buId=await hospitalityBu(sql);
  let body:Record<string,unknown>; try{body=await request.json()}catch{return bad("INVALID_JSON","Invalid JSON body")}
  const operation=str(body.operation);
  try{
   switch(operation){
    case "housekeeping":{
     const propertyId=str(body.propertyId),start=str(body.scheduledStart),due=str(body.dueAt),reservationId=str(body.reservationId),assignedTo=str(body.assignedTo),taskType=str(body.taskType)||"turnover";
     if(!uuid.test(propertyId)||!start||!due||Number.isNaN(Date.parse(start))||Number.isNaN(Date.parse(due))||Date.parse(due)<Date.parse(start)||!taskTypes.has(taskType)||Boolean(reservationId&&!uuid.test(reservationId))||Boolean(assignedTo&&!uuid.test(assignedTo)))return bad("INVALID_HOUSEKEEPING","Invalid housekeeping payload");
     const [property]=await sql`select id from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!property)return bad("PROPERTY_NOT_FOUND","Property not found",404);
     if(reservationId){const [reservation]=await sql`select id from hospitality.reservations where id=${reservationId}::uuid and property_id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`;if(!reservation)return bad("RESERVATION_NOT_FOUND","Reservation does not belong to this property",404)}
     const [row]=await sql`insert into hospitality.housekeeping_tasks(business_unit_id,property_id,reservation_id,task_type,status,assigned_to,scheduled_start,due_at,notes) values(${buId}::uuid,${propertyId}::uuid,${reservationId||null}::uuid,${taskType},'scheduled',${assignedTo||null}::uuid,${start}::timestamptz,${due}::timestamptz,${str(body.notes).slice(0,1000)||null}) returning id::text,status`;
     await audit(sql,buId,session.userId,"hospitality.housekeeping.create","housekeeping_task",String(row.id),{propertyId,reservationId:reservationId||null,taskType});
     return ok(row,201);
    }
    case "pricing_rule":{
     const propertyId=str(body.propertyId),name=str(body.name),ruleType=str(body.ruleType),startsOn=str(body.startsOn),endsOn=str(body.endsOn),adjustmentType=str(body.adjustmentType)||"percent";
     const occupancyMin=body.occupancyMin==null?null:num(body.occupancyMin),occupancyMax=body.occupancyMax==null?null:num(body.occupancyMax),adjustmentValue=num(body.adjustmentValue??0),minimumStay=num(body.minimumStay??1),priority=num(body.priority??100);
     if(!uuid.test(propertyId)||name.length<2||name.length>200||!ruleTypes.has(ruleType)||!adjustmentTypes.has(adjustmentType)||Boolean(startsOn&&!date.test(startsOn))||Boolean(endsOn&&!date.test(endsOn))||Boolean(startsOn&&endsOn&&endsOn<startsOn)||Boolean(occupancyMin!==null&&(!Number.isFinite(occupancyMin)||occupancyMin<0||occupancyMin>100))||Boolean(occupancyMax!==null&&(!Number.isFinite(occupancyMax)||occupancyMax<0||occupancyMax>100))||Boolean(occupancyMin!==null&&occupancyMax!==null&&occupancyMax<occupancyMin)||!Number.isFinite(adjustmentValue)||!Number.isInteger(minimumStay)||minimumStay<1||!Number.isInteger(priority))return bad("INVALID_PRICING_RULE","Invalid pricing rule payload");
     const [property]=await sql`select id from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!property)return bad("PROPERTY_NOT_FOUND","Property not found",404);
     const [row]=await sql`insert into hospitality.pricing_rules(business_unit_id,property_id,name,rule_type,starts_on,ends_on,occupancy_min,occupancy_max,adjustment_type,adjustment_value,minimum_stay,priority,active,created_by) values(${buId}::uuid,${propertyId}::uuid,${name},${ruleType},${startsOn||null}::date,${endsOn||null}::date,${occupancyMin},${occupancyMax},${adjustmentType},${adjustmentValue},${minimumStay},${priority},true,${session.userId}::uuid) returning id::text,active`;
     await audit(sql,buId,session.userId,"hospitality.pricing_rule.create","pricing_rule",String(row.id),{propertyId,ruleType,adjustmentType});
     return ok(row,201);
    }
    case "guest":{
     const fullName=str(body.fullName),vipLevel=str(body.vipLevel)||"standard",email=str(body.email),phone=str(body.phone);
     if(fullName.length<2||fullName.length>200||!vipLevels.has(vipLevel)||email.length>320||phone.length>80)return bad("INVALID_GUEST","Invalid guest payload");
     const [row]=await sql`insert into hospitality.guests(business_unit_id,full_name,email,phone,vip_level,preferences,notes) values(${buId}::uuid,${fullName},${email||null},${phone||null},${vipLevel},${JSON.stringify(body.preferences??{})}::jsonb,${str(body.notes).slice(0,2000)||null}) returning id::text,full_name,vip_level`;
     await audit(sql,buId,session.userId,"hospitality.guest.create","guest",String(row.id),{vipLevel});
     return ok(row,201);
    }
    case "move_reservation":{
     const reservationId=str(body.reservationId),propertyId=str(body.propertyId); if(!uuid.test(reservationId)||!uuid.test(propertyId))return bad("INVALID_MOVE","reservationId and propertyId must be valid UUIDs");
     const [target]=await sql<{id:string;max_guests:number;status:string}[]>`select id::text,max_guests,status from hospitality.properties where id=${propertyId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`; if(!target)return bad("PROPERTY_NOT_FOUND","Target property not found",404);
     if(target.status!=="active")return bad("PROPERTY_NOT_ACTIVE","Target property is not active",409);
     const [reservation]=await sql<{property_id:string;check_in:string;check_out:string;guests:number;status:string}[]>`select property_id::text,check_in::text,check_out::text,guests,status from hospitality.reservations where id=${reservationId}::uuid and business_unit_id=${buId}::uuid and archived_at is null limit 1`; if(!reservation)return bad("RESERVATION_NOT_FOUND","Reservation not found",404);
     if(!["pending","confirmed","checked_in"].includes(reservation.status))return bad("RESERVATION_NOT_MOVABLE","Reservation lifecycle does not allow a property move",409);
     if(Number(reservation.guests)>Number(target.max_guests))return bad("PROPERTY_CAPACITY_EXCEEDED","Target property capacity is too small for this reservation",409);
     if(reservation.property_id===propertyId)return ok({id:reservationId,property_id:propertyId,check_in:reservation.check_in,check_out:reservation.check_out,status:reservation.status,noChange:true});
     const [airbnbConflict]=await sql<{id:string}[]>`select id::text from hospitality.calendar_blocks where property_id=${propertyId}::uuid and archived_at is null and daterange(starts_on,ends_on,'[)') && daterange(${reservation.check_in}::date,${reservation.check_out}::date,'[)') limit 1`;
     if(airbnbConflict)return bad("AIRBNB_AVAILABILITY_CONFLICT","Target property is unavailable on Airbnb for the reservation dates",409);
     const [reservationConflict]=await sql<{id:string}[]>`select id::text from hospitality.reservations where id<>${reservationId}::uuid and property_id=${propertyId}::uuid and archived_at is null and status not in ('cancelled','no_show') and daterange(check_in,check_out,'[)') && daterange(${reservation.check_in}::date,${reservation.check_out}::date,'[)') limit 1`;
     if(reservationConflict)return bad("RESERVATION_OVERLAP","Target property is already booked for the reservation dates",409);
     const [row]=await sql`update hospitality.reservations set property_id=${propertyId}::uuid,updated_at=now() where id=${reservationId}::uuid and business_unit_id=${buId}::uuid returning id::text,property_id::text,check_in,check_out,status`;
     await audit(sql,buId,session.userId,"hospitality.reservation.move","reservation",reservationId,{fromPropertyId:reservation.property_id,toPropertyId:propertyId});
     return ok(row);
    }
    case "channel_reconcile":{
     const reconciliationId=str(body.reconciliationId); if(!uuid.test(reconciliationId))return bad("INVALID_RECONCILIATION","reconciliationId must be a valid UUID");
     const [allowed]=await sql`select id from hospitality.channel_reconciliations where id=${reconciliationId}::uuid and business_unit_id=${buId}::uuid`; if(!allowed)return bad("RECONCILIATION_NOT_FOUND","Reconciliation not found",404);
     const [row]=await sql`select * from hospitality.refresh_channel_reconciliation(${reconciliationId}::uuid)`;
     await audit(sql,buId,session.userId,"hospitality.channel_reconciliation.refresh","channel_reconciliation",reconciliationId,{});
     return ok(row);
    }
    default:return bad("UNSUPPORTED_OPERATION","Unsupported Hospitality operation");
   }
  }catch(error){const message=error instanceof Error?error.message:"HOSPITALITY_OPERATION_FAILED";return bad(message.includes("overlap")?"RESERVATION_OVERLAP":"HOSPITALITY_OPERATION_FAILED",message,409)}
 }catch(error){return apiErrorResponse(error)}
}
