import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

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
