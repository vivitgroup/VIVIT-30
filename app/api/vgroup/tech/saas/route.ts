import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireApiPermission("tech","saas:view");
    const sql=getVGroupSql();
    const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;
    if(!bu)return NextResponse.json({error:"TECH_BUSINESS_UNIT_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"private, no-store"}});
    const [plans,subscriptions,invoices,slaIncidents]=await Promise.all([
      sql`select id::text,code,name,billing_period,currency,price,active from tech.subscription_plans order by price`,
      sql`select s.id::text,s.client_id::text,c.company_name client_name,s.plan_id::text,p.name plan_name,s.tenant_key,s.status,s.current_period_start,s.current_period_end,s.trial_ends_at,s.cancelled_at from tech.subscriptions s join tech.clients c on c.id=s.client_id and c.business_unit_id=${bu.id}::uuid join tech.subscription_plans p on p.id=s.plan_id where s.business_unit_id=${bu.id}::uuid order by s.created_at desc limit 250`,
      sql`select i.id::text,i.subscription_id::text,i.currency,i.amount,i.status,i.due_at,i.paid_at from tech.subscription_invoices i join tech.subscriptions s on s.id=i.subscription_id where s.business_unit_id=${bu.id}::uuid order by i.created_at desc limit 250`,
      sql`select i.id::text,i.project_id::text,i.subscription_id::text,i.title,i.status,i.opened_at,i.first_response_at,i.resolved_at from tech.sla_incidents i left join tech.projects p on p.id=i.project_id left join tech.subscriptions s on s.id=i.subscription_id where (p.business_unit_id=${bu.id}::uuid and p.archived_at is null) or s.business_unit_id=${bu.id}::uuid order by i.opened_at desc limit 100`,
    ]);
    return NextResponse.json({plans:Array.from(plans),subscriptions:Array.from(subscriptions),invoices:Array.from(invoices),slaIncidents:Array.from(slaIncidents)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
