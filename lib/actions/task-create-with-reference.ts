"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {auth} from "@/lib/auth";
import {db,clients,creativeTasks,users,notifications,auditLogs,fileDocuments,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const TYPES=new Set(["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"]);
const PRIORITIES=new Set(["URGENT","HIGH","MEDIUM","LOW"]);
const clean=(v:unknown,n=4000)=>String(v??"").trim().slice(0,n);
const validUrl=(value:string)=>{if(!value)return true;try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"}catch{return false}};
const safeName=(name:string)=>name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(-140)||"reference";

export async function createTaskWithReference(formData:FormData){
 const session=await auth();if(!session?.user)throw new Error("Unauthorized");
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=clean(session.user.workspaceId,160);
 if(!workspaceId||!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))throw new Error("Forbidden");
 const title=clean(formData.get("title"),180),clientId=clean(formData.get("clientId"),100),type=clean(formData.get("type"),40),brief=clean(formData.get("brief"),6000),tov=clean(formData.get("tov"),1500),priority=clean(formData.get("priority"),30),assignedToId=clean(formData.get("assignedToId"),100)||null,deadlineRaw=clean(formData.get("deadline"),40),caption=clean(formData.get("caption"),5000)||null,referenceUrl=clean(formData.get("referenceUrl"),1000)||null;
 const deadline=new Date(deadlineRaw);if(!title||!clientId||!brief||!TYPES.has(type)||!PRIORITIES.has(priority)||Number.isNaN(deadline.getTime()))throw new Error("Invalid task data");if(referenceUrl&&!validUrl(referenceUrl))throw new Error("Reference link must be a valid http(s) URL.");
 const [client]=await db.select({id:clients.id,accountManagerId:clients.accountManagerId,isActive:clients.isActive}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId))).limit(1);if(!client||!client.isActive)throw new Error("Client unavailable");if(role==="ACCOUNT_MANAGER"&&client.accountManagerId!==userId)throw new Error("Client access denied");
 if(assignedToId){const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,assignedToId),eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true))).limit(1);if(!creator)throw new Error("Invalid creator assignment");}
 const image=formData.get("referenceImage"),hasImage=image instanceof File&&image.size>0;let storagePath:string|null=null,referenceFileId:string|null=null;
 if(hasImage){if(!image.type.startsWith("image/"))throw new Error("Reference attachment must be an image.");if(image.size>25*1024*1024)throw new Error("Reference image must be 25 MB or smaller.");const base=String(process.env.SUPABASE_URL||"").replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_KEY;if(!base||!key)throw new Error("Reference image storage is unavailable.");storagePath=`${workspaceId}/${new Date().getFullYear()}/${userId}/${crypto.randomUUID()}-${safeName(image.name)}`;const upload=await fetch(`${base}/storage/v1/object/vivit-files/${storagePath}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":image.type,"x-upsert":"false"},body:Buffer.from(await image.arrayBuffer())});if(!upload.ok)throw new Error("Reference image upload failed.");referenceFileId=crypto.randomUUID();}
 const taskId=crypto.randomUUID();
 try{
  await db.transaction(async tx=>{
   await tx.insert(creativeTasks).values({id:taskId,workspaceId,title,clientId,type:type as typeof creativeTasks.$inferInsert["type"],brief,tov:tov||null,priority:priority as typeof creativeTasks.$inferInsert["priority"],status:"PENDING",assignedToId,deadline,caption,createdById:userId});
   if(referenceFileId&&storagePath&&image instanceof File)await tx.insert(fileDocuments).values({id:referenceFileId,workspaceId,uploadedBy:userId,clientId,taskId,name:image.name,storagePath,mimeType:image.type,sizeBytes:image.size,category:"BRIEF"});
   await tx.execute(sql`update creative_tasks set reference_url=${referenceUrl},reference_file_id=${referenceFileId} where id=${taskId} and workspace_id=${workspaceId}`);
  });
 }catch(error){if(storagePath&&process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_KEY){const base=String(process.env.SUPABASE_URL).replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_KEY;await fetch(`${base}/storage/v1/object/vivit-files/${storagePath}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}}).catch(()=>null)}throw error}
 if(assignedToId)await db.insert(notifications).values({userId:assignedToId,type:"TASK_ASSIGNED",title:`New task assigned: ${title}`,message:`Deadline: ${deadline.toLocaleDateString()}`,link:`/dashboard/creative/${taskId}`});
 await db.insert(auditLogs).values({workspaceId,userId,action:"task_created",entity:"CreativeTask",entityId:taskId,newValues:JSON.stringify({title,clientId,type,priority,hasReferenceUrl:Boolean(referenceUrl),hasReferenceImage:Boolean(referenceFileId)})});
 revalidatePath("/dashboard/creative");redirect(`/dashboard/creative/${taskId}`);
}
