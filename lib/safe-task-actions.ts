"use server";
import {revalidatePath} from "next/cache";
import {auth} from "@/lib/auth";
import {db,sql,auditLogs,notifications,creativeTasks} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import {updateTaskStatus as baseUpdateTaskStatus,submitTaskFile as baseSubmitTaskFile,updateTaskCaption as baseUpdateTaskCaption} from "@/lib/actions";

type TaskContextRow={id:string;title:string;status:string;file_url:string|null;assigned_to_id:string|null;client_id:string;account_manager_id:string|null;client_active:boolean;has_delivery:boolean;approved_by_client:boolean};
async function context(taskId:string){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");
  const role=String(session.user.role),userId=String(session.user.id),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)throw new Error("Workspace unavailable");
  const rows=Array.from(await db.execute<TaskContextRow>(sql`select t.id,t.title,t.status,t.file_url,t.assigned_to_id,t.client_id,t.approved_by_client,c.account_manager_id,c.is_active client_active,exists(select 1 from file_documents f where f.task_id=t.id and f.workspace_id=t.workspace_id and f.archived_at is null) has_delivery from creative_tasks t join clients c on c.id=t.client_id and c.workspace_id=${workspaceId} where t.id=${taskId} and t.workspace_id=${workspaceId} and t.archived_at is null and t.deleted_at is null limit 1`)),task=rows[0];
  if(!task)throw new Error("Task is archived or unavailable.");
  if(task.client_active===false)throw new Error("The client is inactive.");
  const allowed=role==="SUPER_ADMIN"||(role==="ACCOUNT_MANAGER"&&task.account_manager_id===userId)||(role==="CREATOR"&&task.assigned_to_id===userId);
  if(!allowed)throw new Error("Forbidden");
  return{role,userId,workspaceId,task};
}
export async function safeUpdateTaskStatus(taskId:string,status:string,revisionNotes?:string){
  const {role,userId,workspaceId,task}=await context(taskId);
  const notes=String(revisionNotes||"").trim();
  if(status==="REVISION"&&!notes)throw new Error("Revision notes are required.");
  const hasDelivery=task.has_delivery||Boolean(String(task.file_url||"").trim());
  if(["REVIEW","APPROVED"].includes(status)&&!hasDelivery)throw new Error(status==="REVIEW"?"Upload the creative to this task before submitting it for review.":"A delivery file is required before approving this task.");
  if(status==="COMPLETED"){
    if(!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)||task.status!=="APPROVED")throw new Error("Only an approved task can be completed by its manager.");
    if(!task.approved_by_client)throw new Error("Client approval is required before completing this task.");
    await db.transaction(async tx=>{
      const [changed]=await tx.update(creativeTasks).set({status:"COMPLETED",completedAt:new Date(),updatedAt:new Date()}).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"APPROVED"))).returning({id:creativeTasks.id,assignedToId:creativeTasks.assignedToId,title:creativeTasks.title});
      if(!changed)throw new Error("Task status changed concurrently; refresh and try again");
      if(changed.assignedToId&&changed.assignedToId!==userId)await tx.insert(notifications).values({userId:changed.assignedToId,type:"GENERAL",title:`✅ \"${changed.title}\" was marked complete.`,message:"Status: COMPLETED",link:`/dashboard/creative/${taskId}`});
      await tx.insert(auditLogs).values({workspaceId,userId,action:"task_completed",entity:"CreativeTask",entityId:taskId,oldValues:JSON.stringify({status:task.status}),newValues:JSON.stringify({status:"COMPLETED",completedAt:true})});
    });
    for(const p of [`/dashboard/creative/${taskId}`,"/dashboard/creative","/dashboard/tasks-inbox","/dashboard/portal","/dashboard/today"])revalidatePath(p);
    return;
  }
  return baseUpdateTaskStatus(taskId,status,notes||undefined);
}
export async function safeSubmitTaskFile(taskId:string,fileName:string,fileUrl:string,notes=""){
  await context(taskId);
  return baseSubmitTaskFile(taskId,fileName,fileUrl,notes);
}
export async function safeUpdateTaskCaption(taskId:string,caption:string){
  await context(taskId);
  return baseUpdateTaskCaption(taskId,caption);
}
