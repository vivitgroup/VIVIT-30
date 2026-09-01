import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {Role} from "@/lib/types";

type TaskGuardRow={id:string;client_id:string;assigned_to_id?:string|null;account_manager_id?:string|null;media_buyer_id?:string|null;client_user_id?:string|null;client_active?:boolean|null;reference_url?:string|null;storage_path?:string|null};

export const dynamic="force-dynamic";
async function signedFileUrl(path:string){const base=String(process.env.SUPABASE_URL||"").replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_KEY;if(!base||!key||!path)return null;const r=await fetch(`${base}/storage/v1/object/sign/vivit-files/${path}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:1800}),cache:"no-store"}).catch(()=>null);if(!r?.ok)return null;const d=await r.json().catch(()=>({}));return d.signedURL?`${base}/storage/v1${d.signedURL}`:null}

export default async function TaskDetailGuard({children,params}:{children:ReactNode;params:Promise<{id:string}>}){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=String(session.user.role) as Role;
  const userId=String(session.user.id);
  const workspaceId=String(session.user.workspaceId||"");
  const {id}=await params;
  const rows=Array.from(await db.execute(sql`
    select t.id,t.client_id,t.assigned_to_id,t.reference_url,c.account_manager_id,c.media_buyer_id,c.user_id as client_user_id,c.is_active as client_active,f.storage_path
    from creative_tasks t
    left join clients c on c.id=t.client_id and c.workspace_id=t.workspace_id
    left join file_documents f on f.id=t.reference_file_id and f.workspace_id=t.workspace_id
    where t.id=${id} and t.workspace_id=${workspaceId} and t.archived_at is null and t.deleted_at is null
    limit 1
  `)) as TaskGuardRow[];
  const task=rows[0];
  if(!task)redirect("/dashboard/creative");
  if(task.client_active===false)redirect("/dashboard/creative");
  const allowed=role===Role.SUPER_ADMIN||
    (role===Role.ACCOUNT_MANAGER&&task.account_manager_id===userId)||
    (role===Role.MEDIA_BUYER&&task.media_buyer_id===userId)||
    (role===Role.CREATOR&&task.assigned_to_id===userId)||
    (role===Role.CLIENT&&task.client_user_id===userId);
  if(!allowed)redirect("/dashboard");
  const referenceHref=task.reference_url||task.storage_path?task.reference_url||await signedFileUrl(String(task.storage_path||"")):null;
  return <div style={{display:"grid",gap:10}}>{referenceHref&&<div className="card" style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,borderColor:"var(--erp-accent)"}}><div><b style={{fontSize:12}}>Task reference</b><p className="page-subtitle" style={{margin:0}}>Open the reference link or image attached to this task.</p></div><a href={String(referenceHref)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Reference ↗</a></div>}{children}</div>;
}
