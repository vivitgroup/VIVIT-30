import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f-]{36}$/i;
const transitions:Record<string,readonly string[]>={pending:["confirmed","cancelled"],confirmed:["checked_in","cancelled","no_show"],checked_in:["checked_out"],checked_out:[],cancelled:[],no_show:[]};

export async function GET(){
  try{
    await requireApiPermission("hospitality","reservations:view");
    const sql=getVGroupSql();
    const rows=await sql`
      select r.id::text,r.property_id::text,p.name property_name,r.source,r.guest_name,r.check_in,r.check_out,
             r.guests,r.currency,r.gross_amount,r.platform_fee,r.company_commission,r.net_owner_amount,r.status
      from hospitality.reservations r
      join hospitality.properties p on p.id=r.property_id
      where r.archived_at is null
      order by r.check_in desc,r.created_at desc limit 250
    `;
    return NextResponse.json({reservations:Array.from(rows)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","reservations:create");
    const body=await request.json() as Record<string,unknown>;
    const propertyId=String(body.propertyId??"");
    const guestName=String(body.guestName??"").trim();
    const checkIn=String(body.checkIn??"");
    const checkOut=String(body.checkOut??"");
    const source=String(body.source??"direct");
    const guests=Number(body.guests??1);
    const grossAmount=Number(body.grossAmount??0);
    const platformFee=Number(body.platformFee??0);
    const companyCommission=Number(body.companyCommission??0);
    if(!propertyId||!guestName||!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)||!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)||checkOut<=checkIn||!Number.isFinite(guests)||guests<1)
      return NextResponse.json({error:"Invalid reservation payload"},{status:400});
    if([grossAmount,platformFee,companyCommission].some(v=>!Number.isFinite(v)||v<0))
      return NextResponse.json({error:"Invalid financial values"},{status:400});
    const sql=getVGroupSql();
    const [property]=await sql<{id:string}[]>`select id::text from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;
    if(!property)return NextResponse.json({error:"Property unavailable"},{status:404});
    const [blocked]=await sql<{blocked:boolean;source:string|null;summary:string|null}[]>`
      select exists(
        select 1 from hospitality.calendar_blocks b
        where b.property_id=${propertyId}::uuid and b.archived_at is null
          and b.starts_on<${checkOut}::date and b.ends_on>${checkIn}::date
      ) blocked,
      (select b.source from hospitality.calendar_blocks b where b.property_id=${propertyId}::uuid and b.archived_at is null and b.starts_on<${checkOut}::date and b.ends_on>${checkIn}::date order by b.starts_on limit 1) source,
      (select b.summary from hospitality.calendar_blocks b where b.property_id=${propertyId}::uuid and b.archived_at is null and b.starts_on<${checkOut}::date and b.ends_on>${checkIn}::date order by b.starts_on limit 1) summary`;
    if(blocked?.blocked)return NextResponse.json({error:"Property is blocked by synced channel availability for the selected dates",conflict:{source:blocked.source,summary:blocked.summary}},{status:409});
    const [row]=await sql`
      insert into hospitality.reservations(business_unit_id,property_id,source,guest_name,guest_email,guest_phone,check_in,check_out,guests,currency,gross_amount,platform_fee,company_commission,status)
      select bu.id,${propertyId}::uuid,${source},${guestName},${body.guestEmail?String(body.guestEmail):null},${body.guestPhone?String(body.guestPhone):null},${checkIn}::date,${checkOut}::date,${guests},${String(body.currency??"EGP")},${grossAmount},${platformFee},${companyCommission},'confirmed'
      from vgroup.business_units bu
      join hospitality.properties p on p.id=${propertyId}::uuid and p.business_unit_id=bu.id and p.archived_at is null
      where bu.code='hospitality'
      returning id::text,net_owner_amount
    `;
    if(!row)return NextResponse.json({error:"Property unavailable"},{status:404});
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value)
      select id,${session.userId}::uuid,'reservation.create','reservation',${row.id}::uuid,jsonb_build_object('property_id',${propertyId},'guest_name',${guestName},'check_in',${checkIn},'check_out',${checkOut})
      from vgroup.business_units where code='hospitality'`;
    return NextResponse.json({reservation:row},{status:201});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message.includes("reservations_no_active_overlap"))return NextResponse.json({error:"Property is already booked for the selected dates"},{status:409});
    return apiErrorResponse(error)
  }
}

export async function PATCH(request:Request){
  try{
    const session=await requireApiPermission("hospitality","reservations:update");
    const body=await request.json().catch(()=>null) as {reservationId?:string;status?:string}|null;
    const reservationId=String(body?.reservationId??"");const nextStatus=String(body?.status??"");
    if(!uuid.test(reservationId)||!Object.prototype.hasOwnProperty.call(transitions,nextStatus))return NextResponse.json({error:"Invalid reservation status update"},{status:400,headers:{"Cache-Control":"no-store"}});
    const sql=getVGroupSql();
    const [reservation]=await sql<{id:string;business_unit_id:string;property_id:string;status:string;check_in:string;check_out:string}[]>`select id::text,business_unit_id::text,property_id::text,status,check_in::text,check_out::text from hospitality.reservations where id=${reservationId}::uuid and archived_at is null limit 1`;
    if(!reservation)return NextResponse.json({error:"Reservation not found"},{status:404,headers:{"Cache-Control":"no-store"}});
    if(!transitions[reservation.status]?.includes(nextStatus))return NextResponse.json({error:`Invalid status transition ${reservation.status} → ${nextStatus}`},{status:409,headers:{"Cache-Control":"no-store"}});
    if(nextStatus==="confirmed"||nextStatus==="checked_in"){
      const [block]=await sql<{id:string}[]>`select id::text from hospitality.calendar_blocks where property_id=${reservation.property_id}::uuid and archived_at is null and daterange(starts_on,ends_on,'[)') && daterange(${reservation.check_in}::date,${reservation.check_out}::date,'[)') limit 1`;
      if(block)return NextResponse.json({error:"Reservation cannot become active because synced channel availability blocks these dates"},{status:409,headers:{"Cache-Control":"no-store"}});
    }
    const [updated]=await sql`update hospitality.reservations set status=${nextStatus},updated_at=now() where id=${reservationId}::uuid returning id::text,status`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${reservation.business_unit_id}::uuid,${session.userId}::uuid,'reservation.status.change','reservation',${reservationId}::uuid,jsonb_build_object('from',${reservation.status},'to',${nextStatus}))`;
    return NextResponse.json({reservation:updated},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
