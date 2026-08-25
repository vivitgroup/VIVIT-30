"use server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {updateTaskStatus as baseUpdateTaskStatus,submitTaskFile as baseSubmitTaskFile,updateTaskCaption as baseUpdateTaskCaption} from "@/lib/actions";

const WORKSPACE="default";
async function assertActiveTask(taskId:string){
  const session=await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const role=String((session.user as any).role),userId=String((session.user as any).id);
  const rows=Array.from(await db.execute(sql`
    select t.id,t.status,t.file_url,t.approved_by_client,t.assigned_to_id,t.client_id,c.account_manager_id,c.is_active as client_active
    from creative_tasks t
    join clients c on c.id=t.client_id
    where t.id=${taskId} and t.workspace_id=${WORKSPACE} and c.workspace_id=${WORKSPACE} and t.archived_at is null and t.deleted_at is null
    limit 1
  `)) as any[];
  const task=rows[0];
  if(!task)throw new Error("Task is archived or unavailable. Restore it before making changes.");
  if(task.client_active===false)throw new Error("The client is archived. Restore the client before changing this task.");
  const allowed=role==="SUPER_ADMIN"||(role==="ACCOUNT_MANAGER"&&task.account_manager_id===userId)||(role==="CREATOR"&&task.assigned_to_id===userId);
  if(!allowed)throw new Error("Forbidden");
  return {task,role,userId};
}

export async function safeUpdateTaskStatus(taskId:string,status:string,revisionNotes?:string){
  const {task}=await assertActiveTask(taskId);
  if(status==="APPROVED"&&!task.file_url)throw new Error("Upload the final creative before internal approval.");
  if(status==="COMPLETED"&&!task.approved_by_client)throw new Error("Client approval is required before completing this creative.");
  const result=await baseUpdateTaskStatus(taskId,status,revisionNotes);
  if(status==="REVISION"||status==="IN_PROGRESS")await db.execute(sql`update creative_tasks set approved_by_client=false,client_approval_at=null where id=${taskId} and workspace_id=${WORKSPACE} and archived_at is null`);
  return result;
}
export async function safeSubmitTaskFile(taskId:string,fileName:string,fileUrl:string,notes=""){
  await assertActiveTask(taskId);
  const result=await baseSubmitTaskFile(taskId,fileName,fileUrl,notes);
  await db.execute(sql`update creative_tasks set approved_by_client=false,client_approval_at=null,updated_at=now() where id=${taskId} and workspace_id=${WORKSPACE} and archived_at is null`);
  return result;
}
export async function safeUpdateTaskCaption(taskId:string,caption:string){
  await assertActiveTask(taskId);
  return baseUpdateTaskCaption(taskId,caption);
}