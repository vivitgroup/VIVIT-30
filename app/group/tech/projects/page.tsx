import {WorkspacePage} from "@/components/vgroup/workspace-page";
import {JsonMutationForm} from "@/components/vgroup/json-mutation-form";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
type ProjectRow={id:string;name:string;client_name:string;project_type:string;current_price:number|string|null;progress_percent:number|null;current_phase:string|null;target_end:string|Date|null;status:string};
export default async function Page(){
 await requireBusinessUnitAccess("tech");
 const sql=getVGroupSql();
 const rows=await sql<ProjectRow[]>`select p.id::text,p.name,c.company_name client_name,p.project_type,p.current_price,p.progress_percent,p.current_phase,p.target_end,p.status from tech.projects p join tech.clients c on c.id=p.client_id where p.archived_at is null order by p.created_at desc limit 50`;
 return <><WorkspacePage tone="tech" eyebrow="VIVIT TECHNOLOGY" title="Project Workspace" description="Delivery workspace for phases, milestones, scope, checklist, dependencies, risks, updates and files." sections={[{title:"Timeline",body:"Phases, target dates, milestones and progress engine"},{title:"Scope & Checklist",body:"Delivery scope, implementation checklist and acceptance status"},{title:"Dependencies & Risks",body:"Project blockers, ownership, probability/impact and mitigation"},{title:"Files & Updates",body:"Client-safe delivery updates and isolated project artifacts"}]}/><section style={{maxWidth:1180,margin:"-40px auto 60px",padding:"0 20px",color:"#eef7ff"}}><JsonMutationForm tone="tech" endpoint="/api/vgroup/tech/projects" title="Create project" submitLabel="Create project" fields={[{name:"clientId",label:"Client ID",required:true},{name:"name",label:"Project name",required:true},{name:"projectType",label:"Project type",placeholder:"custom"},{name:"basePrice",label:"Base price",type:"number",required:true},{name:"plannedStart",label:"Planned start",type:"date"},{name:"plannedEnd",label:"Planned end",type:"date"}]}/><div style={{marginTop:20,display:"grid",gap:10}}>{Array.from(rows).map(r=><article key={r.id} style={{padding:15,border:"1px solid #193650",borderRadius:14,display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}><div><b>{r.name}</b><div style={{fontSize:12,color:"#9eb3c8"}}>{r.client_name} · {r.project_type} · phase {r.current_phase||"—"}</div></div><div style={{fontSize:12,fontWeight:900}}>{r.status} · {Number(r.progress_percent||0)}% · {Number(r.current_price||0).toFixed(2)}</div></article>)}</div></section></>
}
