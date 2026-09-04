import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;
const money=(value:unknown)=>Number(value);

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","finance:create");
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    const blockId=String(body?.blockId??"");
    if(!uuid.test(blockId))return NextResponse.json({error:"Invalid Airbnb event id"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    if(body?.notABooking===true){
      const result=await sql.begin(async tx=>{
        const [block]=await tx<{id:string;business_unit_id:string;reservation_id:string|null;finance_status:string}[]>`select id::text,business_unit_id::text,reservation_id::text,finance_status from hospitality.calendar_blocks where id=${blockId}::uuid and source='airbnb' and archived_at is null for update`;
        if(!block)return {error:"Airbnb event not found",status:404} as const;
        if(block.reservation_id)return {error:"Completed Airbnb booking cannot be reclassified as not a booking",status:409} as const;
        await tx`update hospitality.calendar_blocks set finance_status='not_a_booking',financial_completed_at=now(),financial_completed_by=${session.userId}::uuid,updated_at=now() where id=${blockId}::uuid`;
        await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value) values(${block.business_unit_id}::uuid,${session.userId}::uuid,'airbnb.finance.not_a_booking','calendar_block',${blockId}::uuid,jsonb_build_object('finance_status',${block.finance_status}),jsonb_build_object('finance_status','not_a_booking'))`;
        return {ok:true} as const;
      });
      if("error" in result)return NextResponse.json({error:result.error},{status:result.status,headers:NO_STORE});
      return NextResponse.json({ok:true,financeStatus:"not_a_booking"},{headers:NO_STORE});
    }
    const gross=money(body?.grossAmount),airbnbFee=money(body?.airbnbFee??0),cleaningFee=money(body?.cleaningFee??0),taxes=money(body?.taxes??0),netPayout=money(body?.netPayout),companyCommission=money(body?.companyCommission??0),guests=money(body?.guests??1);
    const currency=String(body?.currency??"EGP").trim().toUpperCase();
    const guestName=String(body?.guestName??"Airbnb guest").trim()||"Airbnb guest";
    if(![gross,airbnbFee,cleaningFee,taxes,netPayout,companyCommission,guests].every(Number.isFinite)||gross<0||airbnbFee<0||cleaningFee<0||taxes<0||netPayout<0||companyCommission<0||companyCommission>netPayout||guests<1||!Number.isInteger(guests)||!/^[A-Z]{3}$/.test(currency)||guestName.length>200)
      return NextResponse.json({error:"Invalid Airbnb financial values"},{status:400,headers:NO_STORE});
    const result=await sql.begin(async tx=>{
      const [block]=await tx<{id:string;business_unit_id:string;property_id:string;channel_connection_id:string;external_uid:string;starts_on:string;ends_on:string;reservation_id:string|null;finance_status:string}[]>`select id::text,business_unit_id::text,property_id::text,channel_connection_id::text,external_uid,starts_on::text,ends_on::text,reservation_id::text,finance_status from hospitality.calendar_blocks where id=${blockId}::uuid and source='airbnb' and archived_at is null limit 1 for update`;
      if(!block)return {error:"Airbnb event not found",status:404} as const;
      const [property]=await tx<{status:string;max_guests:number}[]>`select status,max_guests from hospitality.properties where id=${block.property_id}::uuid and archived_at is null limit 1`;
      if(!property)return {error:"Property not found",status:404} as const;
      if(property.status!=="active")return {error:"Property is not active for reservations",status:409} as const;
      if(guests>Number(property.max_guests))return {error:"Guest count exceeds property capacity",status:409} as const;
      const [reservation]=await tx`
        insert into hospitality.reservations(business_unit_id,property_id,channel_connection_id,external_reservation_id,source,guest_name,check_in,check_out,guests,currency,gross_amount,platform_fee,company_commission,airbnb_cleaning_fee,airbnb_taxes,airbnb_net_payout,status)
        values(${block.business_unit_id}::uuid,${block.property_id}::uuid,${block.channel_connection_id}::uuid,${block.external_uid},'airbnb',${guestName},${block.starts_on}::date,${block.ends_on}::date,${guests},${currency},${gross},${airbnbFee},${companyCommission},${cleaningFee},${taxes},${netPayout},'confirmed')
        on conflict(source,external_reservation_id) do update set guest_name=excluded.guest_name,guests=excluded.guests,currency=excluded.currency,gross_amount=excluded.gross_amount,platform_fee=excluded.platform_fee,company_commission=excluded.company_commission,airbnb_cleaning_fee=excluded.airbnb_cleaning_fee,airbnb_taxes=excluded.airbnb_taxes,airbnb_net_payout=excluded.airbnb_net_payout,updated_at=now()
        returning id::text,net_owner_amount`;
      await tx`update hospitality.calendar_blocks set finance_status='complete',currency=${currency},gross_amount=${gross},airbnb_fee=${airbnbFee},cleaning_fee=${cleaningFee},taxes=${taxes},net_payout=${netPayout},reservation_id=${reservation.id}::uuid,financial_completed_at=now(),financial_completed_by=${session.userId}::uuid,updated_at=now() where id=${block.id}::uuid`;
      await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value) values(${block.business_unit_id}::uuid,${session.userId}::uuid,'airbnb.finance.complete','calendar_block',${block.id}::uuid,jsonb_build_object('finance_status',${block.finance_status},'reservation_id',${block.reservation_id}),jsonb_build_object('finance_status','complete','reservation_id',${reservation.id},'gross_amount',${gross},'airbnb_fee',${airbnbFee},'cleaning_fee',${cleaningFee},'taxes',${taxes},'net_payout',${netPayout},'company_commission',${companyCommission},'currency',${currency}))`;
      return {reservationId:String(reservation.id),netOwnerAmount:reservation.net_owner_amount} as const;
    });
    if("error" in result)return NextResponse.json({error:result.error},{status:result.status,headers:NO_STORE});
    return NextResponse.json({ok:true,financeStatus:"complete",reservationId:result.reservationId,netOwnerAmount:result.netOwnerAmount},{headers:NO_STORE});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message.includes("reservations_no_active_overlap"))return NextResponse.json({error:"This Airbnb stay overlaps an existing active reservation for the property"},{status:409,headers:NO_STORE});
    return apiErrorResponse(error);
  }
}
