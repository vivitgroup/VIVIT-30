"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import type {Session} from "next-auth";
import {db,clients,contacts,auditLogs,notifications,calendarEvents,creativeTasks,users,fileDocuments} from "@/lib/db";
import {eq,and,ilike} from "drizzle-orm";

function sanitize(str:string|null|undefined,maxLen=500):string{
  if(!str)return "";
  return str.trim().slice(0,maxLen).replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/javascript:/gi,"").replace(/on\w+=/gi,"");
}
function validateUrl(url:string):boolean{try{const u=new URL(url);return ["http:","https:"].includes(u.protocol)}catch{return false}}
type AuthSession=Session|null;
type AuthenticatedSession=Session&{user:NonNullable<Session["user"]>};
type CreativeTaskInsert=typeof creativeTasks.$inferInsert;
type TaskType=CreativeTaskInsert["type"];
type TaskPriority=CreativeTaskInsert["priority"];
type TaskStatus=CreativeTaskInsert["status"];
const TASK_TYPES:readonly TaskType[]=["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"];
const TASK_PRIORITIES:readonly TaskPriority[]=["URGENT","HIGH","MEDIUM","LOW"];
const TASK_STATUSES:readonly TaskStatus[]=["PENDING","IN_PROGRESS","REVIEW","APPROVED","REJECTED","REVISION","COMPLETED"];
function isTaskType(value:string):value is TaskType{return (TASK_TYPES as readonly string[]).includes(value)}
function isTaskPriority(value:string):value is TaskPriority{return (TASK_PRIORITIES as readonly string[]).includes(value)}
function isTaskStatus(value:string):value is TaskStatus{return (TASK_STATUSES as readonly string[]).includes(value)}
function roleOf(session:AuthSession):string{return String(session?.user?.role||"")}
function requireRole(session:AuthSession,allowed:string[]):asserts session is AuthenticatedSession{
  if(!session?.user)throw new Error("Unauthorized");
  if(!allowed.includes(roleOf(session)))throw new Error("Forbidden");
}
function workspaceOf(session:AuthenticatedSession):string{
  const workspaceId=String(session.user.workspaceId||"").trim();
  if(!workspaceId)throw new Error("Workspace unavailable");
  return workspaceId;
}
async function requireClientAccess(session:AuthSession,clientId:string,write=false){
  requireRole(session,write?["SUPER_ADMIN","ACCOUNT_MANAGER"]:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"]);
  const workspaceId=workspaceOf(session);
  const [row]=await db.select({id:clients.id,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
  if(!row)throw new Error("Client not found");
  const role=roleOf(session),uid=String(session.user.id||"");
  if(role!=="SUPER_ADMIN"&&(role==="ACCOUNT_MANAGER"?row.accountManagerId!==uid:row.mediaBuyerId!==uid))throw new Error("Client access denied");
  return{workspaceId,row};
}
async function taskForAccess(session:AuthSession,taskId:string){
  if(!session?.user)throw new Error("Unauthorized");
  const workspaceId=workspaceOf(session as AuthenticatedSession);
  const [task]=await db.select().from(creativeTasks).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId))).limit(1);
  if(!task)throw new Error("Task not found");
  return{workspaceId,task};
}

export async function createClient(formData:FormData){
  const session=await auth();requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);const workspaceId=workspaceOf(session),userId=String(session.user.id||"");
  const creatorRole=roleOf(session),requestedAm=creatorRole==="ACCOUNT_MANAGER"?userId:String(formData.get("accountManagerId")||"")||null,requestedMb=String(formData.get("mediaBuyerId")||"")||null;
  if(requestedAm){const [am]=await db.select({id:users.id}).from(users).where(and(eq(users.id,requestedAm),eq(users.workspaceId,workspaceId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!am)throw new Error("Invalid account manager")}
  if(requestedMb){const [mb]=await db.select({id:users.id}).from(users).where(and(eq(users.id,requestedMb),eq(users.workspaceId,workspaceId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!mb)throw new Error("Invalid media buyer")}
  const companyName=sanitize(String(formData.get("companyName")||""),160);if(companyName.length<2)throw new Error("Company name is required");
  const nonNegative=(name:string)=>{const n=Number(formData.get(name)||0);if(!Number.isFinite(n)||n<0)throw new Error("Invalid client financial data");return n},monthlyRetainer=nonNegative("monthlyRetainer"),mediaBudget=nonNegative("mediaBudget"),contractValue=nonNegative("contractValue");
  const contractStart=formData.get("contractStart")?new Date(String(formData.get("contractStart"))):null,contractEnd=formData.get("contractEnd")?new Date(String(formData.get("contractEnd"))):null;if((contractStart&&Number.isNaN(contractStart.getTime()))||(contractEnd&&Number.isNaN(contractEnd.getTime()))||(contractStart&&contractEnd&&contractEnd<contractStart))throw new Error("Invalid contract dates");
  const clientId=await db.transaction(async tx=>{const [duplicate]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);if(duplicate)throw new Error("A client with this company name already exists");const [client]=await tx.insert(clients).values({workspaceId,companyName,industry:String(formData.get("industry")||"")||null,website:String(formData.get("website")||"")||null,monthlyRetainer,mediaBudget,contractValue,accountManagerId:requestedAm,mediaBuyerId:requestedMb,metaAdsLink:String(formData.get("metaAdsLink")||"")||null,tiktokAdsLink:String(formData.get("tiktokAdsLink")||"")||null,snapchatAdsLink:String(formData.get("snapchatAdsLink")||"")||null,googleAdsLink:String(formData.get("googleAdsLink")||"")||null,internalNotes:String(formData.get("internalNotes")||"")||null,contractStart,contractEnd}).returning({id:clients.id});const contactName=String(formData.get("contactName")||"");if(contactName)await tx.insert(contacts).values({clientId:client.id,name:contactName,isPrimary:true,email:String(formData.get("contactEmail")||"")||null,phone:String(formData.get("contactPhone")||"")||null,whatsapp:String(formData.get("contactWhatsapp")||"")||null,title:String(formData.get("contactTitle")||"")||null});await tx.insert(auditLogs).values({workspaceId,userId,action:"client_created",entity:"Client",entityId:client.id,newValues:JSON.stringify({companyName})});return client.id});
  revalidatePath("/dashboard/clients");redirect(`/dashboard/clients/${clientId}`);
}

export async function updateClient(clientId:string,formData:FormData){
  const session=await auth();const access=await requireClientAccess(session,clientId,true),workspaceId=access.workspaceId,updateRole=roleOf(session),userId=String(session!.user!.id||"");
  const [existingClient]=await db.select({companyName:clients.companyName,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId,updatedAt:clients.updatedAt}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(!existingClient)throw new Error("Client not found");
  let nextAm=existingClient.accountManagerId,nextMb=existingClient.mediaBuyerId;
  if(updateRole==="SUPER_ADMIN"){nextAm=String(formData.get("accountManagerId")||"")||null;nextMb=String(formData.get("mediaBuyerId")||"")||null}
  if(nextAm){const [am]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextAm),eq(users.workspaceId,workspaceId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!am)throw new Error("Invalid account manager")}
  if(nextMb){const [mb]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextMb),eq(users.workspaceId,workspaceId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!mb)throw new Error("Invalid media buyer")}
  const companyName=sanitize(String(formData.get("companyName")||""),160);if(companyName.length<2)throw new Error("Company name is required");
  const nonNegative=(name:string)=>{const n=Number(formData.get(name)||0);if(!Number.isFinite(n)||n<0)throw new Error("Invalid client financial data");return n},monthlyRetainer=nonNegative("monthlyRetainer"),mediaBudget=nonNegative("mediaBudget"),contractValue=nonNegative("contractValue");
  const contractStart=formData.get("contractStart")?new Date(String(formData.get("contractStart"))):null,contractEnd=formData.get("contractEnd")?new Date(String(formData.get("contractEnd"))):null;if((contractStart&&Number.isNaN(contractStart.getTime()))||(contractEnd&&Number.isNaN(contractEnd.getTime()))||(contractStart&&contractEnd&&contractEnd<contractStart))throw new Error("Invalid contract dates");
  await db.transaction(async tx=>{const [duplicate]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);if(duplicate&&duplicate.id!==clientId)throw new Error("A client with this company name already exists");const changed=await tx.update(clients).set({companyName,industry:String(formData.get("industry")||"")||null,website:String(formData.get("website")||"")||null,monthlyRetainer,mediaBudget,contractValue,accountManagerId:nextAm,mediaBuyerId:nextMb,metaAdsLink:String(formData.get("metaAdsLink")||"")||null,tiktokAdsLink:String(formData.get("tiktokAdsLink")||"")||null,snapchatAdsLink:String(formData.get("snapchatAdsLink")||"")||null,googleAdsLink:String(formData.get("googleAdsLink")||"")||null,internalNotes:String(formData.get("internalNotes")||"")||null,contractStart,contractEnd,updatedAt:new Date()}).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),eq(clients.updatedAt,existingClient.updatedAt))).returning({id:clients.id});if(!changed.length)throw new Error("Client changed concurrently; refresh and try again");await tx.insert(auditLogs).values({workspaceId,userId,action:"client_updated",entity:"Client",entityId:clientId,oldValues:JSON.stringify({companyName:existingClient.companyName,accountManagerId:existingClient.accountManagerId,mediaBuyerId:existingClient.mediaBuyerId}),newValues:JSON.stringify({companyName,accountManagerId:nextAm,mediaBuyerId:nextMb})})});
  revalidatePath(`/dashboard/clients/${clientId}`);revalidatePath("/dashboard/clients");redirect(`/dashboard/clients/${clientId}`);
}

export async function markNotificationRead(id:string){const session=await auth();if(!session?.user)return;await db.update(notifications).set({isRead:true}).where(and(eq(notifications.id,id),eq(notifications.userId,session.user.id!)));revalidatePath("/dashboard/notifications")}
export async function markAllNotificationsRead(){const session=await auth();if(!session?.user)return;await db.update(notifications).set({isRead:true}).where(and(eq(notifications.userId,session.user.id!),eq(notifications.isRead,false)));revalidatePath("/dashboard/notifications")}
export async function deleteNotification(id:string){const session=await auth();if(!session?.user)return;await db.delete(notifications).where(and(eq(notifications.id,id),eq(notifications.userId,session.user.id!)));revalidatePath("/dashboard/notifications")}

export async function createCalendarEvent(formData:FormData){
  const session=await auth(),clientId=sanitize(String(formData.get("clientId")||""),100),title=sanitize(String(formData.get("title")||""),160),dateValue=String(formData.get("date")||""),assetFileId=sanitize(String(formData.get("assetFileId")||""),100),taskId=sanitize(String(formData.get("taskId")||""),100);
  if(!clientId||!title||!dateValue||!assetFileId)throw new Error("Client, title, date and an image or video are required.");const eventDate=new Date(dateValue);if(Number.isNaN(eventDate.getTime()))throw new Error("Invalid schedule date.");
  const {workspaceId}=await requireClientAccess(session,clientId,true);
  const [asset]=await db.select({id:fileDocuments.id,mimeType:fileDocuments.mimeType}).from(fileDocuments).where(and(eq(fileDocuments.id,assetFileId),eq(fileDocuments.workspaceId,workspaceId),eq(fileDocuments.clientId,clientId))).limit(1);if(!asset||!String(asset.mimeType||"").match(/^(image|video)\//))throw new Error("The selected image or video is unavailable for this client.");
  if(taskId){const [task]=await db.select({id:creativeTasks.id}).from(creativeTasks).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.clientId,clientId))).limit(1);if(!task)throw new Error("The selected task is unavailable for this client.")}
  await db.insert(calendarEvents).values({workspaceId,clientId,title,date:eventDate,platform:sanitize(String(formData.get("platform")||""),40)||null,caption:sanitize(String(formData.get("caption")||""),4000)||null,taskId:taskId||null,hashtags:`asset:${assetFileId}`,status:"scheduled"});revalidatePath("/dashboard/calendar");
}
export async function markEventPosted(eventId:string){
  const session=await auth();requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);const workspaceId=workspaceOf(session);
  const [event]=await db.select({clientId:calendarEvents.clientId}).from(calendarEvents).where(and(eq(calendarEvents.id,eventId),eq(calendarEvents.workspaceId,workspaceId))).limit(1);if(!event)throw new Error("Event not found");
  await requireClientAccess(session,event.clientId,true);await db.update(calendarEvents).set({status:"posted",updatedAt:new Date()}).where(and(eq(calendarEvents.id,eventId),eq(calendarEvents.workspaceId,workspaceId)));revalidatePath("/dashboard/calendar");
}

export async function createTask(formData:FormData){
  const session=await auth();requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const title=String(formData.get("title")||""),clientId=String(formData.get("clientId")||""),type=String(formData.get("type")||""),brief=String(formData.get("brief")||""),tov=String(formData.get("tov")||""),priority=String(formData.get("priority")||""),assignedToId=String(formData.get("assignedToId")||"")||null,deadline=String(formData.get("deadline")||""),caption=String(formData.get("caption")||"")||null;
  const {workspaceId}=await requireClientAccess(session,clientId,true),deadlineDate=new Date(deadline);if(!title||!clientId||!brief||!isTaskType(type)||!isTaskPriority(priority)||!deadline||Number.isNaN(deadlineDate.getTime()))throw new Error("Invalid task data");
  if(assignedToId){const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,assignedToId),eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!creator)throw new Error("Invalid creator assignment")}
  const taskId=await db.transaction(async tx=>{const [task]=await tx.insert(creativeTasks).values({workspaceId,title,clientId,type,brief,tov:tov||null,priority,status:"PENDING",assignedToId,deadline:deadlineDate,caption,createdById:session.user.id!}).returning({id:creativeTasks.id});if(assignedToId)await tx.insert(notifications).values({userId:assignedToId,type:"TASK_ASSIGNED",title:`New task assigned: ${title}`,message:`Deadline: ${deadlineDate.toLocaleDateString()}`,link:`/dashboard/creative/${task.id}`});await tx.insert(auditLogs).values({workspaceId,userId:session.user.id!,action:"task_created",entity:"CreativeTask",entityId:task.id,newValues:JSON.stringify({title,clientId,type,priority})});return task.id});revalidatePath("/dashboard/creative");redirect(`/dashboard/creative/${taskId}`);
}

export async function updateTaskStatus(taskId:string,status:string,revisionNotes?:string){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");if(!isTaskStatus(status))throw new Error("Invalid task status");
  const {workspaceId,task:taskBefore}=await taskForAccess(session,taskId),role=roleOf(session),uid=session.user.id!;
  const creatorTransitions:Record<string,string[]>={PENDING:["IN_PROGRESS"],IN_PROGRESS:["REVIEW"],REVISION:["IN_PROGRESS"]},managerTransitions:Record<string,string[]>={PENDING:["IN_PROGRESS"],IN_PROGRESS:["REVIEW"],REVISION:["IN_PROGRESS"],REVIEW:["APPROVED","REVISION","REJECTED"]};
  if(role==="CREATOR"){if(taskBefore.assignedToId!==uid||!(creatorTransitions[taskBefore.status]||[]).includes(status))throw new Error("Forbidden transition")}else if(["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)){await requireClientAccess(session,taskBefore.clientId,true);if(!(managerTransitions[taskBefore.status]||[]).includes(status))throw new Error("Forbidden transition")}else throw new Error("Forbidden");
  await db.transaction(async tx=>{const [task]=await tx.update(creativeTasks).set({status,completedAt:null,approvedByClient:false,clientApprovalAt:null,clientApprovalName:null,revisionCount:status==="REVISION"?(taskBefore.revisionCount??0)+1:taskBefore.revisionCount,revisionNotes:status==="REVISION"?(revisionNotes??null):null,updatedAt:new Date()}).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,taskBefore.status))).returning();if(!task)throw new Error("Task status changed concurrently; refresh and try again");if(task.assignedToId&&task.assignedToId!==uid){const msgs:Record<string,string>={APPROVED:`✅ "${task.title}" was approved internally.`,REJECTED:`❌ "${task.title}" was rejected.`,REVISION:`↩ "${task.title}" needs revision.`,IN_PROGRESS:`🎨 Work started on "${task.title}"`,REVIEW:`👀 "${task.title}" is ready for review`};await tx.insert(notifications).values({userId:task.assignedToId,type:"GENERAL",title:msgs[status]??`Task updated: ${status}`,message:`Status: ${status}`,link:`/dashboard/creative/${taskId}`})}if(status==="APPROVED"&&task.clientId){const [client]=await tx.select({userId:clients.userId}).from(clients).where(and(eq(clients.id,task.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(client?.userId)await tx.insert(notifications).values({userId:client.userId,type:"CREATIVE_READY",title:"Creative ready for your approval",message:task.title,link:"/dashboard/portal",priority:"high"})}await tx.insert(auditLogs).values({workspaceId,userId:uid,action:`task_${status.toLowerCase()}`,entity:"CreativeTask",entityId:taskId,oldValues:JSON.stringify({status:taskBefore.status}),newValues:JSON.stringify({status})})});
  for(const p of [`/dashboard/creative/${taskId}`,"/dashboard/creative","/dashboard/tasks-inbox","/dashboard/portal"])revalidatePath(p);
}

export async function submitTaskFile(taskId:string,fileName:string,fileUrl:string,notes:string){
  const session=await auth();requireRole(session,["CREATOR","SUPER_ADMIN","ACCOUNT_MANAGER"]);const {workspaceId,task:taskBefore}=await taskForAccess(session,taskId),role=String(session.user.role),isManager=["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role),allowedStatuses=isManager?["PENDING","IN_PROGRESS","REVIEW","REVISION"]:["IN_PROGRESS","REVISION"];
  if((!isManager&&taskBefore.assignedToId!==session.user.id)||!allowedStatuses.includes(taskBefore.status))throw new Error("Approved or completed work is locked.");if(isManager)await requireClientAccess(session,taskBefore.clientId,true);if(!validateUrl(String(fileUrl||"")))throw new Error("A valid uploaded file URL is required");
  await db.transaction(async tx=>{const [task]=await tx.update(creativeTasks).set({status:"REVIEW",fileUrl:fileUrl||null,completedAt:null,approvedByClient:false,clientApprovalAt:null,clientApprovalName:null,updatedAt:new Date()}).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,taskBefore.status))).returning();if(!task)throw new Error("Task changed concurrently; refresh and try again");if(task.createdById&&task.createdById!==session.user.id)await tx.insert(notifications).values({userId:task.createdById,type:"APPROVAL_REQUESTED",title:`📤 "${task.title}" submitted for internal review`,message:`${session.user.name} submitted. File: ${String(fileName||"").slice(0,200)}. ${String(notes||"").slice(0,500)}`,link:`/dashboard/creative/${taskId}`});await tx.insert(auditLogs).values({workspaceId,userId:String(session.user.id),action:"task_file_submitted",entity:"CreativeTask",entityId:taskId,oldValues:JSON.stringify({status:taskBefore.status}),newValues:JSON.stringify({status:"REVIEW",fileUrl})})});
  revalidatePath(`/dashboard/creative/${taskId}`);revalidatePath("/dashboard/creative");
}

export async function updateTaskCaption(taskId:string,caption:string){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");const {workspaceId,task}=await taskForAccess(session,taskId),role=roleOf(session),editable=["PENDING","IN_PROGRESS","REVIEW","REVISION"];
  if(!editable.includes(task.status))throw new Error("Approved or completed work is locked.");if(role==="CREATOR"){if(task.assignedToId!==session.user.id)throw new Error("This caption is locked.")}else if(["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)){await requireClientAccess(session,task.clientId,true)}else throw new Error("Forbidden");
  await db.transaction(async tx=>{const changed=await tx.update(creativeTasks).set({caption:String(caption||"").trim().slice(0,8000),updatedAt:new Date()}).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,task.status))).returning({id:creativeTasks.id});if(!changed.length)throw new Error("Task changed concurrently; refresh and try again");await tx.insert(auditLogs).values({workspaceId,userId:String(session.user.id),action:"task_caption_updated",entity:"CreativeTask",entityId:taskId,newValues:JSON.stringify({status:task.status})})});revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function markTaskPosted(taskId:string){
  const session=await auth();if(!session?.user)throw new Error("Unauthorized");const {workspaceId,task}=await taskForAccess(session,taskId);await requireClientAccess(session,task.clientId,true);if(task.status!=="COMPLETED"||!task.approvedByClient)throw new Error("Only client-approved completed tasks can be marked posted");if(task.isPosted)return;
  await db.transaction(async tx=>{const changed=await tx.update(creativeTasks).set({isPosted:true,postedAt:new Date(),updatedAt:new Date()}).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"COMPLETED"),eq(creativeTasks.approvedByClient,true))).returning({id:creativeTasks.id});if(!changed.length)throw new Error("Task state changed; refresh and try again");await tx.insert(auditLogs).values({workspaceId,userId:String(session.user.id),action:"task_marked_posted",entity:"CreativeTask",entityId:taskId,newValues:JSON.stringify({status:"COMPLETED",isPosted:true})})});revalidatePath(`/dashboard/creative/${taskId}`);revalidatePath("/dashboard/creative");
}
