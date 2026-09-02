import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiBusinessUnit} from "@/lib/vgroup/api-access";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const session=await requireApiBusinessUnit("hospitality");
    const membership=session.memberships.find(m=>m.businessUnit==="hospitality"||m.role==="GROUP_SUPER_ADMIN");
    const isOwner=membership?.role==="OWNER";
    const sql=getVGroupSql();
    const owners=await sql`select id::text,full_name,email,phone,status from hospitality.owners where archived_at is null and (${isOwner}::boolean=false or user_id=${session.userId}::uuid) order by created_at desc`;
    const ownerIds=Array.from(owners).map((o:any)=>String(o.id));
    if(isOwner&&ownerIds.length===0)return NextResponse.json({owners:[],properties:[],reservations:[],invoices:[],workOrders:[],statements:[]},{headers:{"Cache-Control":"private, no-store"}});
    const properties=ownerIds.length?await sql`select p.id::text,p.owner_id::text,p.name,p.property_type,p.city,p.country,p.bedrooms,p.bathrooms,p.max_guests,p.status from hospitality.properties p where p.archived_at is null and p.owner_id=any(${ownerIds}::uuid[]) order by p.created_at desc`:[];
    const propertyIds=Array.from(properties as any).map((p:any)=>String(p.id));
    const reservations=propertyIds.length?await sql`select r.id::text,r.property_id::text,r.source,r.guest_name,r.check_in,r.check_out,r.currency,r.gross_amount,r.platform_fee,r.company_commission,r.net_owner_amount,r.status from hospitality.reservations r where r.archived_at is null and r.property_id=any(${propertyIds}::uuid[]) order by r.check_in desc limit 250`:[];
    const invoices=ownerIds.length?await sql`select i.id::text,i.owner_id::text,i.property_id::text,i.invoice_number,i.invoice_type,i.currency,i.total,i.issued_at,i.due_at,i.status,i.attachment_url from hospitality.invoices i where i.archived_at is null and i.owner_id=any(${ownerIds}::uuid[]) order by i.issued_at desc limit 250`:[];
    const workOrders=propertyIds.length?await sql`select w.id::text,w.property_id::text,w.title,w.description,w.priority,w.status,w.estimated_cost,w.actual_cost,w.created_at,w.completed_at from hospitality.work_orders w where w.archived_at is null and w.property_id=any(${propertyIds}::uuid[]) order by w.created_at desc limit 250`:[];
    const statements=ownerIds.length?await sql`select s.id::text,s.owner_id::text,s.period_start,s.period_end,s.currency,s.gross_revenue,s.total_expenses,s.total_fees,s.net_payable,s.status,s.generated_at,s.sent_at from hospitality.owner_statements s where s.owner_id=any(${ownerIds}::uuid[]) order by s.period_end desc limit 100`:[];
    return NextResponse.json({owners:Array.from(owners),properties:Array.from(properties as any),reservations:Array.from(reservations as any),invoices:Array.from(invoices as any),workOrders:Array.from(workOrders as any),statements:Array.from(statements as any)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
