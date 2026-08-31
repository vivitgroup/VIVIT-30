"use server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
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
  await context(taskId);
  return baseUpdateTaskStatus(taskId,status,revisionNotes);
}
export async function safeSubmitTaskFile(taskId:string,fileName:string,fileUrl:string,notes=""){
  await context(taskId);
  return baseSubmitTaskFile(taskId,fileName,fileUrl,notes);
}
export async function safeUpdateTaskCaption(taskId:string,caption:string){
  await context(taskId);
  return baseUpdateTaskCaption(taskId,caption);
}
