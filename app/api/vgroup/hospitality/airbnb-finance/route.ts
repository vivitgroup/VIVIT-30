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
    if(body?.notABooking===true){
      const sql=getVGroupSql();
      const [row]=await sql`update hospitality.calendar_blocks set finance_status='not_a_booking',financial_completed_at=now(),financial_completed_by=${session.userId}::uuid,updated_at=now() where id=${blockId}::uuid and source='airbnb' and archived_at is null returning id::text`;
      if(!row)return NextResponse.json({error:"Airbnb event not found"},{status:404,headers:NO_STORE});
      return NextResponse.json({ok:true,financeStatus:"not_a_booking"},{headers:NO_STORE});
    }
    const gross=money(body?.grossAmount),airbnbFee=money(body?.airbnbFee??0),cleaningFee=money(body?.cleaningFee??0),taxes=money(body?.taxes??0),netPayout=money(body?.netPayout),companyCommission=money(body?.companyCommission??0),guests=money(body?.guests??1);
    const currency=String(body?.currency??"EGP").trim().toUpperCase();
    const guestName=String(body?.guestName??"Airbnb guest").trim()||"Airbnb guest";
    if(![gross,airbnbFee,cleaningFee,taxes,netPayout,companyCommission,guests].every(Number.isFinite)||gross<0||airbnbFee<0||cleaningFee<0||taxes<0||netPayout<0||companyCommission<0||guests<1||currency.length!==3)
      return NextResponse.json({error:"Invalid Airbnb financial values"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [block]=await sql<{id:string;business_unit_id:string;property_id:string;channel_connection_id:string;external_uid:string;starts_on:string;ends_on:string;reservation_id:string|null}[]>`select id::text,business_unit_id::text,property_id::text,channel_connection_id::text,external_uid,starts_on::text,ends_on::text,reservation_id::text from hospitality.calendar_blocks where id=${blockId}::uuid and source='airbnb' and archived_at is null limit 1`;
    if(!block)return NextResponse.json({error:"Airbnb event not found"},{status:404,headers:NO_STORE});
    const [reservation]=await sql`
      insert into hospitality.reservations(business_unit_id,property_id,channel_connection_id,external_reservation_id,source,guest_name,check_in,check_out,guests,currency,gross_amount,platform_fee,company_commission,airbnb_cleaning_fee,airbnb_taxes,airbnb_net_payout,status)
      values(${block.business_unit_id}::uuid,${block.property_id}::uuid,${block.channel_connection_id}::uuid,${block.external_uid},'airbnb',${guestName},${block.starts_on}::date,${block.ends_on}::date,${Math.floor(guests)},${currency},${gross},${airbnbFee},${companyCommission},${cleaningFee},${taxes},${netPayout},'confirmed')
      on conflict(source,external_reservation_id) do update set guest_name=excluded.guest_name,guests=excluded.guests,currency=excluded.currency,gross_amount=excluded.gross_amount,platform_fee=excluded.platform_fee,company_commission=excluded.company_commission,airbnb_cleaning_fee=excluded.airbnb_cleaning_fee,airbnb_taxes=excluded.airbnb_taxes,airbnb_net_payout=excluded.airbnb_net_payout,updated_at=now()
      returning id::text,net_owner_amount`;
    await sql`update hospitality.calendar_blocks set finance_status='complete',currency=${currency},gross_amount=${gross},airbnb_fee=${airbnbFee},cleaning_fee=${cleaningFee},taxes=${taxes},net_payout=${netPayout},reservation_id=${reservation.id}::uuid,financial_completed_at=now(),financial_completed_by=${session.userId}::uuid,updated_at=now() where id=${block.id}::uuid`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${block.business_unit_id}::uuid,${session.userId}::uuid,'airbnb.finance.complete','calendar_block',${block.id}::uuid,jsonb_build_object('reservation_id',${reservation.id},'gross_amount',${gross},'airbnb_fee',${airbnbFee},'cleaning_fee',${cleaningFee},'taxes',${taxes},'net_payout',${netPayout},'currency',${currency}))`;
    return NextResponse.json({ok:true,financeStatus:"complete",reservationId:reservation.id,netOwnerAmount:reservation.net_owner_amount},{headers:NO_STORE});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message.includes("reservations_no_active_overlap"))return NextResponse.json({error:"This Airbnb stay overlaps an existing active reservation for the property"},{status:409,headers:NO_STORE});
    return apiErrorResponse(error);
  }
}
