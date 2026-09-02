import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiBusinessUnit} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const session=await requireApiBusinessUnit("tech");
    const techMembership=session.memberships.find(m=>m.businessUnit==="tech"||m.role==="GROUP_SUPER_ADMIN");
    const sql=getVGroupSql();
    const isClient=techMembership?.role==="TECH_CLIENT";
    const clients=await sql`
      select c.id::text,c.company_name,c.contact_name,c.email
      from tech.clients c
      where c.archived_at is null
        and (${isClient}::boolean=false or c.portal_user_id=${session.userId}::uuid)
      order by c.created_at desc
    `;
    const clientIds=Array.from(clients).map((c:any)=>String(c.id));
    if(isClient&&clientIds.length===0)return NextResponse.json({clients:[],projects:[]},{headers:{"Cache-Control":"private, no-store"}});
    const projects=await sql`
      select p.id::text,p.client_id::text,p.name,p.project_type,p.progress_percent,p.current_phase,p.status,
             p.currency,p.current_price,p.target_end,
             coalesce((select sum(pi.amount) from tech.payment_installments pi where pi.project_id=p.id and pi.status not in ('cancelled','waived')),0) total_billed,
             coalesce((select sum(pi.paid_amount) from tech.payment_installments pi where pi.project_id=p.id),0) paid_amount,
             (select min(pi.due_date) from tech.payment_installments pi where pi.project_id=p.id and pi.status in ('pending','partial','overdue')) next_due
      from tech.projects p
      where p.archived_at is null
        and (${isClient}::boolean=false or p.client_id in (select id from tech.clients where portal_user_id=${session.userId}::uuid and archived_at is null))
      order by p.created_at desc
    `;
    const projectRows=Array.from(projects);
    const projectIds=projectRows.map((p:any)=>String(p.id));
    const updates=projectIds.length?await sql`
      select u.project_id::text,u.id::text,u.update_type,u.title,u.body,u.created_at
      from tech.project_updates u
      where u.visible_to_client=true and u.project_id=any(${projectIds}::uuid[])
      order by u.created_at desc limit 100
    `:[];
    const phases=projectIds.length?await sql`
      select ph.project_id::text,ph.id::text,ph.name,ph.sequence,ph.planned_start,ph.planned_end,ph.actual_start,ph.actual_end,ph.progress_percent,ph.status
      from tech.project_phases ph where ph.project_id=any(${projectIds}::uuid[]) order by ph.project_id,ph.sequence
    `:[];
    const scope=projectIds.length?await sql`
      select s.project_id::text,s.id::text,s.title,s.description,s.category,s.status,s.sequence from tech.scope_items s where s.project_id=any(${projectIds}::uuid[]) order by s.project_id,s.sequence
    `:[];
    return NextResponse.json({clients:Array.from(clients),projects:projectRows,updates:Array.from(updates as any),phases:Array.from(phases as any),scope:Array.from(scope as any)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
