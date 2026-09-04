import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {generateOwnerStatement} from "@/lib/vgroup/operations";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f-]{36}$/i;
const NO_STORE={"Cache-Control":"private, no-store"};

export async function GET(request:Request){
  try{
    const session=await requireApiPermission("hospitality","finance:view");
    const isOwner=session.memberships.some(item=>item.businessUnit==="hospitality"&&item.role==="OWNER");
    if(isOwner)return NextResponse.json({error:"Owner finance is available through the owner portal only"},{status:403,headers:NO_STORE});
    const sql=getVGroupSql();
    const propertyId=new URL(request.url).searchParams.get("propertyId")||"";
    if(propertyId&&!uuid.test(propertyId))return NextResponse.json({error:"invalid_property_id"},{status:400,headers:NO_STORE});
    if(propertyId){
      const [property]=await sql`select id::text,name,owner_id::text from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;
      if(!property)return NextResponse.json({error:"property_not_found"},{status:404,headers:NO_STORE});
      const [refunds,deposits,reservations]=await Promise.all([
        sql`select r.id::text,r.reservation_id::text,r.currency,r.amount,r.reason,r.status,r.created_at from hospitality.refunds r join hospitality.reservations x on x.id=r.reservation_id where x.property_id=${propertyId}::uuid order by r.created_at desc limit 100`,
        sql`select d.id::text,d.reservation_id::text,d.currency,d.amount,d.held_amount,d.released_amount,d.status,d.created_at from hospitality.security_deposits d join hospitality.reservations x on x.id=d.reservation_id where x.property_id=${propertyId}::uuid order by d.created_at desc limit 100`,
        sql`select id::text,source,guest_name,check_in::text,check_out::text,currency,gross_amount,platform_fee,company_commission,net_owner_amount,status from hospitality.reservations where property_id=${propertyId}::uuid and archived_at is null and status not in ('cancelled','no_show') order by check_in desc limit 250`,
      ]);
      return NextResponse.json({property:{id:property.id,name:property.name},statements:[],payouts:[],refunds:Array.from(refunds),deposits:Array.from(deposits),reservations:Array.from(reservations),propertyScoped:true},{headers:NO_STORE});
    }
    const [statements,payouts,refunds,deposits]=await Promise.all([
      sql`select s.id::text,s.owner_id::text,o.full_name owner_name,s.period_start,s.period_end,s.currency,s.gross_revenue,s.total_expenses,s.total_fees,s.net_payable,s.status from hospitality.owner_statements s join hospitality.owners o on o.id=s.owner_id order by s.period_end desc limit 100`,
      sql`select p.id::text,p.owner_id::text,o.full_name owner_name,p.statement_id::text,p.currency,p.amount,p.status,p.due_at,p.paid_at from hospitality.owner_payouts p join hospitality.owners o on o.id=p.owner_id order by p.created_at desc limit 100`,
      sql`select r.id::text,r.reservation_id::text,r.currency,r.amount,r.reason,r.status,r.created_at from hospitality.refunds r order by r.created_at desc limit 100`,
      sql`select d.id::text,d.reservation_id::text,d.currency,d.amount,d.held_amount,d.released_amount,d.status,d.created_at from hospitality.security_deposits d order by d.created_at desc limit 100`,
    ]);
    return NextResponse.json({statements:Array.from(statements),payouts:Array.from(payouts),refunds:Array.from(refunds),deposits:Array.from(deposits),reservations:[],propertyScoped:false},{headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
  try{
    await requireApiPermission("hospitality","finance:create");
    const body=await request.json().catch(()=>null) as {ownerId?:string;periodStart?:string;periodEnd?:string}|null;
    const ownerId=String(body?.ownerId??"");
    const periodStart=String(body?.periodStart??"");
    const periodEnd=String(body?.periodEnd??"");
    if(!uuid.test(ownerId)||!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)||!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd))return NextResponse.json({error:"invalid_statement_payload"},{status:400,headers:NO_STORE});
    if(periodEnd<periodStart)return NextResponse.json({error:"invalid_statement_period"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [owner]=await sql<{id:string}[]>`select id::text from hospitality.owners where id=${ownerId}::uuid and archived_at is null limit 1`;
    if(!owner)return NextResponse.json({error:"owner_not_found"},{status:404,headers:NO_STORE});
    return NextResponse.json({statement:await generateOwnerStatement(ownerId,periodStart,periodEnd)},{status:201,headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}
