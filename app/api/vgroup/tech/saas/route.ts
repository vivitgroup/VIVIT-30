import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireApiPermission("tech","saas:view");
    const sql=getVGroupSql();
    const [plans,subscriptions,invoices,slaIncidents]=await Promise.all([
      sql`select id::text,code,name,billing_period,currency,price,is_active from tech.subscription_plans order by price`,
      sql`select s.id::text,s.client_id::text,c.company_name client_name,s.plan_id::text,p.name plan_name,s.status,s.current_period_start,s.current_period_end,s.cancel_at_period_end from tech.subscriptions s join tech.clients c on c.id=s.client_id join tech.subscription_plans p on p.id=s.plan_id order by s.created_at desc limit 250`,
      sql`select i.id::text,i.subscription_id::text,i.invoice_number,i.currency,i.amount,i.status,i.due_at,i.paid_at from tech.subscription_invoices i order by i.created_at desc limit 250`,
      sql`select i.id::text,i.subscription_id::text,i.severity,i.status,i.opened_at,i.first_response_at,i.resolved_at from tech.sla_incidents i order by i.opened_at desc limit 100`,
    ]);
    return NextResponse.json({plans:Array.from(plans),subscriptions:Array.from(subscriptions),invoices:Array.from(invoices),slaIncidents:Array.from(slaIncidents)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
