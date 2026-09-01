export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,auditLogs,sql} from "@/lib/db";
import {effectiveRoles} from "@/lib/session-access";
import {BUSINESS_LIFECYCLE_SPECS,businessLifecycleSpec,loadBusinessRecord,canManageBusinessRecord,assertBusinessDeleteAllowed,mutateBusinessRecord} from "@/lib/business-lifecycle";

const coreEntities=new Set(["client","task","lead","campaign"]),allowedEntities=new Set([...coreEntities,...BUSINESS_LIFECYCLE_SPECS.map(x=>x.entity)]),allowedActions=new Set(["archive","restore","delete","restore_deleted"]);
type DbRow=Record<string,unknown>;
const clean=(v:unknown,n=120)=>String(v||"").trim().slice(0,n),rows=async(q:Parameters<typeof db.execute>[0]):Promise<DbRow[]>=>Array.from(await db.execute(q)) as DbRow[];
async function sessionScope(){const session=await auth();if(!session?.user)return null;const userId=String(session.user.id),roles=effectiveRoles(session.user),workspaceId=clean(session.user.workspaceId,160);return workspaceId?{userId,roles,workspaceId}:null}
async function audit(workspaceId:string,userId:string,action:string,entity:string,id:string,payload:Record<string,unknown>={}){await db.insert(auditLogs).values({workspaceId,userId,action,entity,entityId:id,newValues:JSON.stringify(payload)})}
async function ledger(workspaceId:string,userId:string,entity:string,id:string,name:string,action:string,metadata:Record<string,unknown>={}){const [actor]=await rows(sql`select name from users where id=${userId} and workspace_id=${workspaceId} limit 1`);await db.execute(sql`insert into lifecycle_events(workspace_id,entity_type,entity_id,entity_name,action,actor_user_id,actor_name,metadata,created_at) values(${workspaceId},${entity},${id},${name},${action},${userId},${String(actor?.name||"User")},${JSON.stringify(metadata)}::jsonb,now())`)}

export async function GET(req:NextRequest){
 const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const {userId,roles,workspaceId}=s,isAdmin=roles.includes("SUPER_ADMIN"),view=req.nextUrl.searchParams.get("view")==="deleted"?"deleted":"archive";
 if(view==="deleted"&&!isAdmin)return NextResponse.json({error:"Only Super Admin can view deleted records."},{status:403});
 const expectedAction=view==="deleted"?"delete":"archive";
 const actorScope=isAdmin?sql`true`:sql`e.actor_user_id=${userId}`;
 const items=await rows(sql`
   with latest as (
    select distinct on (entity_type,entity_id) entity_type,entity_id,entity_name,action,actor_user_id,actor_name,metadata,created_at
    from lifecycle_events where workspace_id=${workspaceId}
    order by entity_type,entity_id,created_at desc
   )
   select e.entity_type entity,e.entity_id id,coalesce(e.entity_name,'Untitled') name,e.actor_user_id,e.actor_name,e.created_at state_at,e.metadata
   from latest e where e.action=${expectedAction} and ${actorScope}
   order by e.created_at desc limit 1000
 `);
 return NextResponse.json({view,items},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
 const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const {userId,roles,workspaceId}=s,isAdmin=roles.includes("SUPER_ADMIN"),body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid request."},{status:400});const entity=clean(body.entity,40),action=clean(body.action,30),id=clean(body.id,100);if(!allowedEntities.has(entity)||!allowedActions.has(action)||!id)return NextResponse.json({error:"Invalid lifecycle request."},{status:400});
 if(action==="restore_deleted"&&!isAdmin)return NextResponse.json({error:"Only Super Admin can restore deleted records."},{status:403});

 const businessSpec=businessLifecycleSpec(entity);
 if(businessSpec){
  const record=await loadBusinessRecord(businessSpec,id,workspaceId);if(!record)return NextResponse.json({error:"Record not found."},{status:404});
  if(!canManageBusinessRecord(businessSpec,record,userId,roles)&&action!=="restore_deleted")return NextResponse.json({error:"You do not have permission to change this record."},{status:403});
  if(action==="restore"&&!isAdmin&&record.archived_by!==userId)return NextResponse.json({error:"You can only restore items you archived."},{status:403});
  if(action==="archive"&&record.deleted_at)return NextResponse.json({error:"Deleted records cannot be archived."},{status:409});
  if(action==="delete"){try{assertBusinessDeleteAllowed(businessSpec,record)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Record cannot be deleted."},{status:409})}}
  await mutateBusinessRecord(businessSpec,id,workspaceId,userId,action as "archive"|"restore"|"delete"|"restore_deleted");
  await ledger(workspaceId,userId,entity,id,String(record.name||businessSpec.category),action,{category:businessSpec.category});
  await audit(workspaceId,userId,`lifecycle_${action}`,businessSpec.table,id,{entity,softDelete:action==="delete"});
  return NextResponse.json({success:true,state:action==="archive"?"archived":action==="delete"?"deleted":"active"});
 }

 if(entity==="client"){
  const [r]=await rows(sql`select id,company_name name,account_manager_id,created_by,archived_at,archived_by,deleted_at from clients where id=${id} and workspace_id=${workspaceId} limit 1`);if(!r)return NextResponse.json({error:"Client not found."},{status:404});
  const canManage=isAdmin||r.created_by===userId||r.account_manager_id===userId;if(!canManage&&action!=="restore_deleted")return NextResponse.json({error:"You can only archive or delete clients you created or manage."},{status:403});
  if(action==="archive"){if(r.deleted_at)return NextResponse.json({error:"Deleted clients cannot be archived."},{status:409});await db.execute(sql`update clients set is_active=false,archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and workspace_id=${workspaceId} and archived_at is null and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"archive");await audit(workspaceId,userId,"client_archived","clients",id);return NextResponse.json({success:true,state:"archived"})}
  if(action==="restore"){if(r.deleted_at)return NextResponse.json({error:"Use Delete Center to restore a deleted client."},{status:409});if(!isAdmin&&r.archived_by!==userId)return NextResponse.json({error:"You can only restore items you archived."},{status:403});await db.execute(sql`update clients set is_active=true,archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore");return NextResponse.json({success:true,state:"active"})}
  if(action==="delete"){await db.execute(sql`update clients set is_active=false,deleted_at=now(),deleted_by=${userId},archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"delete");await audit(workspaceId,userId,"client_deleted","clients",id,{softDelete:true});return NextResponse.json({success:true,state:"deleted"})}
  await db.execute(sql`update clients set is_active=true,deleted_at=null,deleted_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is not null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore_deleted");return NextResponse.json({success:true,state:"active"});
 }
 if(entity==="task"){
  const [r]=await rows(sql`select t.id,t.title name,t.created_by_id,t.assigned_to_id,t.archived_by,t.archived_at,t.deleted_at,c.account_manager_id from creative_tasks t join clients c on c.id=t.client_id and c.workspace_id=t.workspace_id where t.id=${id} and t.workspace_id=${workspaceId} limit 1`);if(!r)return NextResponse.json({error:"Task not found."},{status:404});
  const canManage=isAdmin||r.created_by_id===userId||r.account_manager_id===userId||r.assigned_to_id===userId;if(!canManage&&action!=="restore_deleted")return NextResponse.json({error:"You can only archive or delete tasks you created, manage or are assigned to."},{status:403});
  if(action==="archive"){if(r.deleted_at)return NextResponse.json({error:"Deleted tasks cannot be archived."},{status:409});await db.execute(sql`update creative_tasks set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and workspace_id=${workspaceId} and archived_at is null and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"archive");return NextResponse.json({success:true,state:"archived"})}
  if(action==="restore"){if(!isAdmin&&r.archived_by!==userId)return NextResponse.json({error:"You can only restore items you archived."},{status:403});await db.execute(sql`update creative_tasks set archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore");return NextResponse.json({success:true,state:"active"})}
  if(action==="delete"){await db.execute(sql`update creative_tasks set deleted_at=now(),deleted_by=${userId},archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"delete");await audit(workspaceId,userId,"task_deleted","creative_tasks",id,{softDelete:true});return NextResponse.json({success:true,state:"deleted"})}
  await db.execute(sql`update creative_tasks set deleted_at=null,deleted_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is not null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore_deleted");return NextResponse.json({success:true,state:"active"});
 }
 if(entity==="campaign"){
  const [r]=await rows(sql`select id,name,created_by,archived_by,deleted_at from ad_campaigns where id=${id} and workspace_id=${workspaceId} limit 1`);if(!r)return NextResponse.json({error:"Campaign not found."},{status:404});const canManage=isAdmin||r.created_by===userId||roles.some(role=>["ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role));if(!canManage&&action!=="restore_deleted")return NextResponse.json({error:"You cannot change this campaign."},{status:403});
  if(action==="archive"){await db.execute(sql`update ad_campaigns set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"archive");return NextResponse.json({success:true,state:"archived"})}
  if(action==="restore"){if(!isAdmin&&r.archived_by!==userId)return NextResponse.json({error:"You can only restore items you archived."},{status:403});await db.execute(sql`update ad_campaigns set archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore");return NextResponse.json({success:true,state:"active"})}
  if(action==="delete"){await db.execute(sql`update ad_campaigns set deleted_at=now(),deleted_by=${userId},archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"delete");return NextResponse.json({success:true,state:"deleted"})}
  await db.execute(sql`update ad_campaigns set deleted_at=null,deleted_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is not null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore_deleted");return NextResponse.json({success:true,state:"active"});
 }
 const [r]=await rows(sql`select id,company_name name,sales_rep_id,archived_by,deleted_at from sales_leads where id=${id} and workspace_id=${workspaceId} limit 1`);if(!r)return NextResponse.json({error:"Lead not found."},{status:404});const canManage=isAdmin||r.sales_rep_id===userId||roles.includes("SALES");if(!canManage&&action!=="restore_deleted")return NextResponse.json({error:"You can only change leads assigned to you."},{status:403});
 if(action==="archive"){await db.execute(sql`update sales_leads set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"archive");return NextResponse.json({success:true,state:"archived"})}
 if(action==="restore"){if(!isAdmin&&r.archived_by!==userId)return NextResponse.json({error:"You can only restore items you archived."},{status:403});await db.execute(sql`update sales_leads set archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore");return NextResponse.json({success:true,state:"active"})}
 if(action==="delete"){await db.execute(sql`update sales_leads set deleted_at=now(),deleted_by=${userId},archived_at=null,archived_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is null`);await ledger(workspaceId,userId,entity,id,String(r.name),"delete");return NextResponse.json({success:true,state:"deleted"})}
 await db.execute(sql`update sales_leads set deleted_at=null,deleted_by=null,updated_at=now() where id=${id} and workspace_id=${workspaceId} and deleted_at is not null`);await ledger(workspaceId,userId,entity,id,String(r.name),"restore_deleted");return NextResponse.json({success:true,state:"active"});
}