export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {redirect} from "next/navigation";
import {Role} from "@/lib/types";

type DeletedRow={id:string;action:string;entity:string;entity_id:string|null;new_values:string|null;created_at:string|Date;employee_name:string|null;employee_email:string|null};
const label=(entity:string)=>entity.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const detail=(raw:string|null)=>{try{const v=JSON.parse(raw||"{}");return String(v.companyName||v.title||v.name||"")}catch{return ""}};

export default async function DeleteCenterPage(){
 const session=await auth();if(!session?.user)redirect("/login");if(session.user.role!==Role.SUPER_ADMIN)redirect("/dashboard");
 const workspaceId=String(session.user.workspaceId||"");if(!workspaceId)redirect("/login");
 const rows=Array.from(await db.execute(sql`select a.id,a.action,a.entity,a.entity_id,a.new_values,a.created_at,u.name as employee_name,u.email as employee_email from audit_logs a left join users u on u.id=a.user_id and u.workspace_id=a.workspace_id where a.workspace_id=${workspaceId} and a.action like '%_deleted' order by a.created_at desc limit 500`)) as unknown as DeletedRow[];
 return <div style={{display:"flex",flexDirection:"column",gap:18}}><div><h1 className="page-title">Delete Center</h1><p className="page-subtitle">Super Admin audit trail for deleted records. Every deletion keeps the employee identity and timestamp.</p></div><section className="card"><div className="card-header"><div><p className="card-title">Deleted items</p><p className="page-subtitle">{rows.length} deletion events</p></div><span className="badge badge-gray">{rows.length}</span></div><div className="card-body-flush">{rows.length===0?<div className="empty-state"><p>No deleted items recorded.</p></div>:<div className="responsive-table"><table className="data-table"><thead><tr><th>Item</th><th>Type</th><th>Deleted by</th><th>Deleted at</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{detail(r.new_values)||r.entity_id||"Deleted record"}</b><div style={{fontSize:11,color:"var(--text-muted)"}}>{r.entity_id||"—"}</div></td><td>{label(r.entity)}</td><td><b>{r.employee_name||"Unknown employee"}</b><div style={{fontSize:11,color:"var(--text-muted)"}}>{r.employee_email||"—"}</div></td><td>{new Date(r.created_at).toLocaleString("en-EG")}</td></tr>)}</tbody></table></div>}</div></section></div>;
}
