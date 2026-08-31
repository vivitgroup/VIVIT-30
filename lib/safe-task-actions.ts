"use server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {revalidatePath} from "next/cache";
import {updateTaskStatus as baseUpdateTaskStatus,submitTaskFile as baseSubmitTaskFile,updateTaskCaption as baseUpdateTaskCaption} from "@/lib/actions";

type TaskContextRow={id:string;status:string;assigned_to_id:string|null;client_id:string;account_manager_id:string|null;client_active:boolean};
async function context(taskId:string){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");
  const role=String(session.user.role),userId=String(session.user.id),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)throw new Error("Workspace unavailable");
  const rows=Array.from(await db.execute<TaskContextRow>(sql`select t.id,t.status,t.assigned_to_id,t.client_id,c.account_manager_id,c.is_active client_active from creative_tasks t join clients c on c.id=t.client_id and c.workspace_id=${workspaceId} where t.id=${taskId} and t.workspace_id=${workspaceId} and t.archived_at is null and t.deleted_at is null limit 1`)),task=rows[0];
  if(!task)throw new Error("Task is archived or unavailable.");
  if(task.client_active===false)throw new Error("The client is inactive.");
  const allowed=role==="SUPER_ADMIN"||(role==="ACCOUNT_MANAGER"&&task.account_manager_id===userId)||(role==="CREATOR"&&task.assigned_to_id===userId);
  if(!allowed)throw new Error("Forbidden");
  return{session,role,userId,workspaceId,task};
}
export async function safeUpdateTaskStatus(taskId:string,status:string,revisionNotes?:string){
  const c=await context(taskId);
  if(c.role==="CREATOR")return baseUpdateTaskStatus(taskId,status,revisionNotes);
  const managerTransitions:Record<string,string[]>={PENDING:["IN_PROGRESS"],IN_PROGRESS:["REVIEW"],REVISION:["IN_PROGRESS"],REVIEW:["APPROVED","REVISION","REJECTED"]};
  if(!(managerTransitions[c.task.status]||[]).includes(status))throw new Error("Forbidden transition");
  await db.execute(sql`update creative_tasks set status=${status},approved_by_client=case when ${status} in ('APPROVED','REVISION') then false else approved_by_client end,client_approval_at=case when ${status} in ('APPROVED','REVISION') then null else client_approval_at end,client_approval_name=case when ${status} in ('APPROVED','REVISION') then null else client_approval_name end,completed_at=null,revision_notes=case when ${status}='REVISION' then ${revisionNotes||null} when ${status}='APPROVED' then null else revision_notes end,revision_count=case when ${status}='REVISION' then coalesce(revision_count,0)+1 else revision_count end,updated_at=now() where id=${taskId} and workspace_id=${c.workspaceId} and archived_at is null and deleted_at is null`);
  for(const path of [`/dashboard/creative/${taskId}`,"/dashboard/creative","/dashboard/portal","/dashboard/tasks-inbox","/dashboard/today","/dashboard/calendar"])revalidatePath(path);
}
export async function safeSubmitTaskFile(taskId:string,fileName:string,fileUrl:string,notes=""){
  await context(taskId);
  return baseSubmitTaskFile(taskId,fileName,fileUrl,notes);
}
export async function safeUpdateTaskCaption(taskId:string,caption:string){
  await context(taskId);
  return baseUpdateTaskCaption(taskId,caption);
}
