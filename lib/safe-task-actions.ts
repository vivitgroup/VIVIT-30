"use server";
import {auth} from "@/lib/auth";
import {db,sql,knowledgeBase} from "@/lib/db";
import {updateTaskStatus as baseUpdateTaskStatus,submitTaskFile as baseSubmitTaskFile,updateTaskCaption as baseUpdateTaskCaption} from "@/lib/actions";

async function assertActiveTask(taskId:string){
  const session=await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const role=String((session.user as any).role),userId=String((session.user as any).id);
  const rows=Array.from(await db.execute(sql`
    select t.id,t.title,t.client_id,t.assigned_to_id,c.company_name,c.account_manager_id,c.is_active as client_active
    from creative_tasks t
    left join clients c on c.id=t.client_id
    where t.id=${taskId} and t.archived_at is null and t.deleted_at is null
    limit 1
  `)) as any[];
  const task=rows[0];
  if(!task)throw new Error("Task is archived or unavailable. Restore it before making changes.");
  if(task.client_active===false)throw new Error("The client is archived. Restore the client before changing this task.");
  const allowed=role==="SUPER_ADMIN"||(role==="ACCOUNT_MANAGER"&&task.account_manager_id===userId)||(role==="CREATOR"&&task.assigned_to_id===userId);
  if(!allowed)throw new Error("Forbidden");
  return{task,role,userId};
}

export async function safeUpdateTaskStatus(taskId:string,status:string,revisionNotes?:string){
  const access=await assertActiveTask(taskId);
  const result=await baseUpdateTaskStatus(taskId,status,revisionNotes);
  if(["REVISION","REJECTED"].includes(status)&&String(revisionNotes||"").trim()){
    const note=String(revisionNotes).trim().slice(0,1800),t=access.task;
    await db.insert(knowledgeBase).values({workspaceId:"default",title:`${t.company_name} · creative learning · ${t.title}`,content:`Client/task feedback: ${note}\nLearn this preference for future briefs, concepts, design QA and content recommendations.`,category:"CLIENT_LEARNING",tags:JSON.stringify([`client:${t.client_id}`,`task:${taskId}`,`status:${status}`]),authorId:access.userId,isPublished:true}).catch(()=>null);
  }
  return result;
}
export async function safeSubmitTaskFile(taskId:string,fileName:string,fileUrl:string,notes=""){
  await assertActiveTask(taskId);
  return baseSubmitTaskFile(taskId,fileName,fileUrl,notes);
}
export async function safeUpdateTaskCaption(taskId:string,caption:string){
  await assertActiveTask(taskId);
  return baseUpdateTaskCaption(taskId,caption);
}
