import {WorkspacePage} from "@/components/vgroup/workspace-page";
import {CrActionPanel} from "@/components/vgroup/cr-action-panel";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
type ChangeRequestRow={id:string;title:string;status:string;proposed_price:number|string|null;extra_days:number|null;project_name:string;client_name:string};
export default async function Page(){
 await requireBusinessUnitAccess("tech");
 const sql=getVGroupSql();
 const rows=await sql<ChangeRequestRow[]>`select cr.id::text,cr.title,cr.status,cr.proposed_price,cr.extra_days,p.name project_name,c.company_name client_name from tech.change_requests cr join tech.projects p on p.id=cr.project_id join tech.clients c on c.id=p.client_id and c.business_unit_id=p.business_unit_id join vgroup.business_units bu on bu.id=p.business_unit_id where bu.code='tech' and bu.status='active' and p.archived_at is null and c.archived_at is null order by cr.created_at desc limit 80`;
 return <><WorkspacePage tone="tech" eyebrow="TECH COMMERCIAL" title="Change Requests" description="Controlled change lifecycle with pricing, schedule impact, client decision and atomic implementation updates." sections={[{title:"Submitted",body:"Client request and PM review queue"},{title:"Pricing",body:"Proposed price, extra days and impact assessment"},{title:"Approval",body:"Approve/reject lifecycle with auditability"},{title:"Implementation",body:"Atomic creation of checklist/installment and project commercial/timeline updates"}]}/><section style={{maxWidth:1180,margin:"-40px auto 60px",padding:"0 20px",color:"#eef7ff",display:"grid",gap:10}}>{Array.from(rows).map(r=><article key={r.id} style={{padding:16,border:"1px solid #193650",borderRadius:16,display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><b>{r.title}</b><div style={{fontSize:12,color:"#9eb3c8",marginTop:4}}>{r.client_name} · {r.project_name}</div><div style={{fontSize:12,marginTop:5}}>Status: <b>{r.status}</b> · Price {Number(r.proposed_price||0).toFixed(2)} · +{Number(r.extra_days||0)} days</div></div><CrActionPanel id={r.id} status={r.status}/></article>)}</section></>
}
