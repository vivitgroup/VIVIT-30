export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {redirect} from "next/navigation";
import DirectOperatorPanel from "@/components/vivito/DirectOperatorPanel";
import {resolveVivitoWorkspaceForUser} from "@/lib/vivito/direct-runtime";
const rows=(v:any)=>Array.from(v as any) as any[];
export default async function VivitoOperationsPage(){
 const session=await auth();if(!session?.user)redirect("/login");const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))redirect("/dashboard/ai-studio");
 const workspaceId=await resolveVivitoWorkspaceForUser(userId);const owner=role==="SUPER_ADMIN"?sql``:sql`and user_id=${userId}`;
 const raw=rows(await db.execute(sql`select id,user_id,action,entity,entity_id,new_values,created_at from audit_logs where workspace_id=${workspaceId} and action like 'vivito_%' ${owner} order by created_at desc limit 120`));
 const events=raw.map(r=>{let data:any={};try{data=typeof r.new_values==="string"?JSON.parse(r.new_values):r.new_values||{}}catch{}const failed=String(r.action).includes("stopped")||String(r.action).includes("failed");return{...r,data,status:failed?"FAILED":"SUCCESS"}});
 return <div style={{display:"flex",flexDirection:"column",gap:18}}><div><h1 className="page-title">VIVITO Operator Control</h1><p className="page-subtitle">Proactive detection, safe execution, human approvals, escalation, outcome verification and learning.</p></div><DirectOperatorPanel/><div className="card"><div className="card-body"><h2 className="card-title">Unified audit trail</h2><div style={{overflowX:"auto",marginTop:14}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th align="left">Time</th><th align="left">Action</th><th align="left">Operation</th><th align="left">Status</th><th align="left">Entity</th></tr></thead><tbody>{events.map(e=><tr key={e.id} style={{borderTop:"1px solid var(--card-border)"}}><td style={{padding:"10px 6px"}}>{new Date(e.created_at).toLocaleString()}</td><td>{String(e.action).replace(/_/g," ")}</td><td>{e.data?.op||e.data?.result?.action||"—"}</td><td>{e.status}</td><td>{e.entity_id||"—"}</td></tr>)}</tbody></table>{!events.length&&<p className="page-subtitle" style={{marginTop:14}}>No VIVITO audit events yet.</p>}</div></div></div></div>
}
