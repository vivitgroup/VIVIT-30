import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiBusinessUnit} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

type ClientRow={id:string;company_name:string;contact_name:string|null;email:string|null};
type ProjectRow={id:string;client_id:string;name:string;project_type:string;progress_percent:number;current_phase:string|null;status:string;currency:string;current_price:number;target_end:string|null;total_billed:number;paid_amount:number;next_due:string|null};
type UpdateRow={project_id:string;id:string;update_type:string;title:string;body:string|null;created_at:string};
type PhaseRow={project_id:string;id:string;name:string;sequence:number;planned_start:string|null;planned_end:string|null;actual_start:string|null;actual_end:string|null;progress_percent:number;status:string};
type ScopeRow={project_id:string;id:string;title:string;description:string|null;category:string|null;status:string;sequence:number};

export async function GET(){
  try{
    const session=await requireApiBusinessUnit("tech");
    const techMembership=session.memberships.find(m=>m.businessUnit==="tech"||m.role==="GROUP_SUPER_ADMIN");
    const sql=getVGroupSql();
    const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;
    if(!bu)return NextResponse.json({error:"TECH_BUSINESS_UNIT_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"private, no-store"}});
    const isClient=techMembership?.role==="TECH_CLIENT";
    const clients=await sql<ClientRow[]>`
      select c.id::text,c.company_name,c.contact_name,c.email
      from tech.clients c
      where c.business_unit_id=${bu.id}::uuid and c.archived_at is null
        and (${isClient}::boolean=false or c.portal_user_id=${session.userId}::uuid)
      order by c.created_at desc
    `;
    const clientIds=Array.from(clients).map(c=>String(c.id));
    if(isClient&&clientIds.length===0)return NextResponse.json({clients:[],projects:[]},{headers:{"Cache-Control":"private, no-store"}});
    const projects=await sql<ProjectRow[]>`
      select p.id::text,p.client_id::text,p.name,p.project_type,p.progress_percent,p.current_phase,p.status,
             p.currency,p.current_price,p.target_end,
             coalesce((select sum(pi.amount) from tech.payment_installments pi where pi.project_id=p.id and pi.status not in ('cancelled','waived')),0) total_billed,
             coalesce((select sum(pi.paid_amount) from tech.payment_installments pi where pi.project_id=p.id),0) paid_amount,
             (select min(pi.due_date) from tech.payment_installments pi where pi.project_id=p.id and pi.status in ('pending','partial','overdue')) next_due
      from tech.projects p
      where p.business_unit_id=${bu.id}::uuid and p.archived_at is null
        and (${isClient}::boolean=false or p.client_id in (select id from tech.clients where business_unit_id=${bu.id}::uuid and portal_user_id=${session.userId}::uuid and archived_at is null))
      order by p.created_at desc
    `;
    const projectRows=Array.from(projects);
    const projectIds=projectRows.map(p=>String(p.id));
    const updates:UpdateRow[]=projectIds.length?Array.from(await sql<UpdateRow[]>`
      select u.project_id::text,u.id::text,u.update_type,u.title,u.body,u.created_at
      from tech.project_updates u
      where u.visible_to_client=true and u.project_id=any(${projectIds}::uuid[])
      order by u.created_at desc limit 100
    `):[];
    const phases:PhaseRow[]=projectIds.length?Array.from(await sql<PhaseRow[]>`
      select ph.project_id::text,ph.id::text,ph.name,ph.sequence,ph.planned_start,ph.planned_end,ph.actual_start,ph.actual_end,ph.progress_percent,ph.status
      from tech.project_phases ph where ph.project_id=any(${projectIds}::uuid[]) order by ph.project_id,ph.sequence
    `):[];
    const scope:ScopeRow[]=projectIds.length?Array.from(await sql<ScopeRow[]>`
      select s.project_id::text,s.id::text,s.title,s.description,s.category,s.status,s.sequence from tech.scope_items s where s.project_id=any(${projectIds}::uuid[]) order by s.project_id,s.sequence
    `):[];
    return NextResponse.json({clients:Array.from(clients),projects:projectRows,updates,phases,scope},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
