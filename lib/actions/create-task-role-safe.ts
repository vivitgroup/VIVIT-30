"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {and,eq} from "drizzle-orm";
import {auth} from "@/lib/auth";
import {db,clients,creativeTasks,users,notifications,auditLogs,sql} from "@/lib/db";
import {isDualOperator} from "@/lib/dual-operator";

type CreativeTaskInsert=typeof creativeTasks.$inferInsert;
const TASK_TYPES=["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"] as const;
const TASK_PRIORITIES=["URGENT","HIGH","MEDIUM","LOW"] as const;

export async function createTaskRoleSafe(formData:FormData){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");
  const role=String(session.user.role||"");if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))throw new Error("Forbidden");
  const email=String(session.user.email||"");
  const workspaceId=String(session.user.workspaceId||"").trim(),userId=String(session.user.id||"").trim();if(!workspaceId||!userId)throw new Error("Workspace unavailable");
  const title=String(formData.get("title")||"").trim(),clientId=String(formData.get("clientId")||"").trim(),type=String(formData.get("type")||"").trim(),brief=String(formData.get("brief")||"").trim(),tov=String(formData.get("tov")||"").trim(),priority=String(formData.get("priority")||"").trim(),assignedToId=String(formData.get("assignedToId")||"").trim()||null,deadline=String(formData.get("deadline")||"").trim(),caption=String(formData.get("caption")||"").trim()||null,referenceUrl=String(formData.get("referenceUrl")||"").trim().slice(0,2000),referenceKind=String(formData.get("referenceKind")||"LINK").toUpperCase()==="IMAGE"?"IMAGE":"LINK",deadlineDate=new Date(deadline);
  if(!title||!clientId||!brief||!(TASK_TYPES as readonly string[]).includes(type)||!(TASK_PRIORITIES as readonly string[]).includes(priority)||!deadline||Number.isNaN(deadlineDate.getTime()))throw new Error("Invalid task data");
  if(referenceUrl){let parsed:URL;try{parsed=new URL(referenceUrl)}catch{throw new Error("Reference must be a valid URL")};if(!["http:","https:"].includes(parsed.protocol))throw new Error("Reference must use HTTP or HTTPS");}
  const [client]=await db.select({id:clients.id,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
  if(!client)throw new Error("Client not found");
  const dual=isDualOperator(email)&&(role==="ACCOUNT_MANAGER"||role==="MEDIA_BUYER");
  if(dual&&client.accountManagerId!==userId&&client.mediaBuyerId!==userId)throw new Error("Client access denied");
  if(!dual&&role==="ACCOUNT_MANAGER"&&client.accountManagerId!==userId)throw new Error("Client access denied");
  if(!dual&&role==="MEDIA_BUYER"&&client.mediaBuyerId!==userId)throw new Error("Client access denied");
  if(assignedToId){const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,assignedToId),eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!creator)throw new Error("Invalid creator assignment");}
  const taskId=await db.transaction(async tx=>{
    const [task]=await tx.insert(creativeTasks).values({workspaceId,title,clientId,type:type as CreativeTaskInsert["type"],brief,tov:tov||null,priority:priority as CreativeTaskInsert["priority"],status:"PENDING",assignedToId,deadline:deadlineDate,caption,createdById:userId}).returning({id:creativeTasks.id});
    if(referenceUrl)await tx.execute(sql`insert into task_references(id,workspace_id,task_id,kind,url,label,created_by,created_at) values(${crypto.randomUUID()},${workspaceId},${task.id},${referenceKind},${referenceUrl},'Reference',${userId},now())`);
    if(assignedToId)await tx.insert(notifications).values({userId:assignedToId,type:"TASK_ASSIGNED",title:`New task assigned: ${title}`,message:`Deadline: ${deadlineDate.toLocaleDateString()}${referenceUrl?" · Reference attached":""}`,link:`/dashboard/creative/${task.id}`});
    await tx.insert(auditLogs).values({workspaceId,userId,action:"task_created",entity:"CreativeTask",entityId:task.id,newValues:JSON.stringify({title,clientId,type,priority,createdByRole:role,dualOperator:dual,hasReference:Boolean(referenceUrl),referenceKind:referenceUrl?referenceKind:null})});
    return task.id;
  });
  for(const path of ["/dashboard/creative","/dashboard/tasks-inbox","/dashboard/today","/dashboard/calendar"])revalidatePath(path);
  redirect(`/dashboard/creative/${taskId}`);
}
