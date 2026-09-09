export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,fileDocuments,auditLogs,clients,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const BUCKET="vivit-files";
const MAX_SIZE=500*1024*1024;
const PART_MAX=45*1024*1024;
const PREFIX="multipart:";
const base=()=>String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY!}`});
const clean=(v:unknown,n=700)=>String(v||"").trim().slice(0,n);
const safeMime=(v:unknown)=>clean(v,160).toLowerCase();

type Manifest={v:1;parts:Array<{path:string;size:number}>;size:number;mime:string};
type FileRow={id:string;workspaceId:string;uploadedBy:string;clientId:string|null;taskId:string|null;name:string;storagePath:string;mimeType:string|null;sizeBytes:number;category:string};

function encodeManifest(m:Manifest){return PREFIX+Buffer.from(JSON.stringify(m),"utf8").toString("base64url")}
function decodeManifest(value:string):Manifest|null{
 if(!value.startsWith(PREFIX))return null;
 try{
  const parsed=JSON.parse(Buffer.from(value.slice(PREFIX.length),"base64url").toString("utf8")) as Manifest;
  if(parsed?.v!==1||!Array.isArray(parsed.parts)||!parsed.parts.length||parsed.parts.length>16)return null;
  if(!Number.isFinite(parsed.size)||parsed.size<=0||parsed.size>MAX_SIZE)return null;
  if(parsed.parts.some(p=>!p?.path||!Number.isFinite(p.size)||p.size<=0||p.size>PART_MAX))return null;
  return parsed;
 }catch{return null}
}
async function sessionScope(){
 const session=await auth();if(!session?.user)return null;
 const u=session.user as unknown as Record<string,unknown>;
 const workspaceId=clean(u.workspaceId,160),userId=clean(u.id,160),role=clean(u.role,80);
 return workspaceId&&userId?{workspaceId,userId,role}:null;
}
async function canAccess(row:FileRow,workspaceId:string,userId:string,role:string){
 if(row.workspaceId!==workspaceId)return false;
 if(role==="SUPER_ADMIN"||row.uploadedBy===userId)return true;
 if(row.taskId){
  const task=Array.from(await db.execute(sql`
   select t.assigned_to_id,c.user_id,c.account_manager_id,c.media_buyer_id
   from creative_tasks t join clients c on c.id=t.client_id
   where t.id=${row.taskId} and t.workspace_id=${workspaceId} and c.workspace_id=${workspaceId}
     and t.archived_at is null and t.deleted_at is null and c.is_active=true limit 1
  `)) as Array<{assigned_to_id:string|null;user_id:string|null;account_manager_id:string|null;media_buyer_id:string|null}>;
  const t=task[0];if(!t)return false;
  return (role==="CREATOR"&&t.assigned_to_id===userId)||(role==="CLIENT"&&t.user_id===userId)||(role==="ACCOUNT_MANAGER"&&t.account_manager_id===userId)||(role==="MEDIA_BUYER"&&t.media_buyer_id===userId);
 }
 if(row.clientId){
  const [c]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,row.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
  if(!c)return false;
  return (role==="CLIENT"&&c.userId===userId)||(role==="ACCOUNT_MANAGER"&&c.accountManagerId===userId)||(role==="MEDIA_BUYER"&&c.mediaBuyerId===userId);
 }
 return false;
}
async function signRead(path:string){
 const r=await fetch(`${base()}/storage/v1/object/sign/${BUCKET}/${path}`,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:1800})});
 const d=await r.json().catch(()=>({})) as {signedURL?:string};return d.signedURL?`${base()}/storage/v1${d.signedURL}`:null;
}
async function objectInfo(path:string){
 const r=await fetch(`${base()}/storage/v1/object/info/${BUCKET}/${path}`,{headers:headers(),cache:"no-store"});
 const d=await r.json().catch(()=>({})) as Record<string,unknown>;
 const meta=(d.metadata||{}) as Record<string,unknown>;
 return {ok:r.ok,size:Number(meta.size??d.size??0),mime:safeMime(meta.mimetype??meta.contentType??d.mimetype??d.contentType)};
}
async function linkTaskDelivery(workspaceId:string,taskId:string,fileId:string){
 const deliveryUrl=`/api/files/multipart/stream?id=${encodeURIComponent(fileId)}`;
 await db.execute(sql`
  update creative_tasks
  set file_url=${deliveryUrl},updated_at=now()
  where id=${taskId}
    and workspace_id=${workspaceId}
    and archived_at is null
    and deleted_at is null
 `);
}

export async function GET(req:NextRequest){
 const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!base()||!process.env.SUPABASE_SERVICE_KEY)return NextResponse.json({error:"Storage is not configured."},{status:503});
 const id=clean(req.nextUrl.searchParams.get("id"),100);if(!id)return NextResponse.json({error:"File id is required."},{status:400});
 const [raw]=await db.select().from(fileDocuments).where(and(eq(fileDocuments.id,id),eq(fileDocuments.workspaceId,s.workspaceId))).limit(1);
 const row=raw as FileRow|undefined;if(!row)return NextResponse.json({error:"File not found."},{status:404});
 if(!(await canAccess(row,s.workspaceId,s.userId,s.role)))return NextResponse.json({error:"Forbidden"},{status:403});
 const manifest=decodeManifest(row.storagePath);if(!manifest)return NextResponse.json({error:"File is not multipart."},{status:400});
 const urls=await Promise.all(manifest.parts.map(p=>signRead(p.path)));
 if(urls.some(x=>!x))return NextResponse.json({error:"Could not prepare all file parts."},{status:502});
 return NextResponse.json({parts:urls,size:manifest.size,mime:manifest.mime,name:row.name},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
 const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!base()||!process.env.SUPABASE_SERVICE_KEY)return NextResponse.json({error:"Storage is not configured."},{status:503});
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const parts=Array.isArray(body.parts)?body.parts.map(x=>({path:clean((x as Record<string,unknown>)?.path,700),size:Number((x as Record<string,unknown>)?.size||0)})):[];
 const size=Number(body.size||0),mime=safeMime(body.mimeType),name=clean(body.name,255)||"File",category=clean(body.category,40)||"GENERAL",clientId=body.clientId?clean(body.clientId,100):null,taskId=body.taskId?clean(body.taskId,100):null;
 if(!Number.isFinite(size)||size<=0||size>MAX_SIZE||!parts.length||parts.length>16)return NextResponse.json({error:"Invalid multipart upload."},{status:400});
 if(parts.some(p=>!p.path||!Number.isFinite(p.size)||p.size<=0||p.size>PART_MAX||!p.path.startsWith(`${s.workspaceId}/`)||!p.path.includes(`/${s.userId}/`)||p.path.includes("..")))return NextResponse.json({error:"Invalid multipart part."},{status:403});
 if(parts.reduce((n,p)=>n+p.size,0)!==size)return NextResponse.json({error:"Multipart size does not match the original file."},{status:409});
 if(taskId||clientId){
  let allowed=false;
  if(taskId){
   const task=Array.from(await db.execute(sql`select t.client_id,t.assigned_to_id,c.user_id,c.account_manager_id,c.media_buyer_id from creative_tasks t join clients c on c.id=t.client_id where t.id=${taskId} and t.workspace_id=${s.workspaceId} and c.workspace_id=${s.workspaceId} and t.archived_at is null and t.deleted_at is null and c.is_active=true limit 1`)) as Array<{client_id:string;assigned_to_id:string|null;user_id:string|null;account_manager_id:string|null;media_buyer_id:string|null}>;
   const t=task[0];if(t&&(!clientId||clientId===t.client_id))allowed=s.role==="SUPER_ADMIN"||(s.role==="CREATOR"&&t.assigned_to_id===s.userId)||(s.role==="CLIENT"&&t.user_id===s.userId)||(s.role==="ACCOUNT_MANAGER"&&t.account_manager_id===s.userId)||(s.role==="MEDIA_BUYER"&&t.media_buyer_id===s.userId);
  }else if(clientId){
   const [c]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,s.workspaceId),eq(clients.isActive,true))).limit(1);
   if(c)allowed=s.role==="SUPER_ADMIN"||(s.role==="CLIENT"&&c.userId===s.userId)||(s.role==="ACCOUNT_MANAGER"&&c.accountManagerId===s.userId)||(s.role==="MEDIA_BUYER"&&c.mediaBuyerId===s.userId);
  }
  if(!allowed)return NextResponse.json({error:"You cannot attach this file to the selected client or task."},{status:403});
 }
 for(const part of parts){
  const info=await objectInfo(part.path);if(!info.ok)return NextResponse.json({error:"One uploaded part could not be verified."},{status:409});
  if(!Number.isFinite(info.size)||info.size<=0||info.size!==part.size)return NextResponse.json({error:"Stored multipart part size does not match."},{status:409});
 }
 const manifest:Manifest={v:1,parts,size,mime};const storagePath=encodeManifest(manifest);
 const existing=await db.select({id:fileDocuments.id,taskId:fileDocuments.taskId}).from(fileDocuments).where(and(eq(fileDocuments.workspaceId,s.workspaceId),eq(fileDocuments.storagePath,storagePath))).limit(1);
 if(existing[0]){
  if(taskId&&existing[0].taskId===taskId)await linkTaskDelivery(s.workspaceId,taskId,existing[0].id);
  return NextResponse.json({success:true,fileId:existing[0].id});
 }
 const created=await db.transaction(async tx=>{
  const [row]=await tx.insert(fileDocuments).values({workspaceId:s.workspaceId,uploadedBy:s.userId,name,storagePath,mimeType:mime,sizeBytes:size,category,clientId,taskId}).returning();
  await tx.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:"file_uploaded_multipart",entity:"file_documents",entityId:row.id,newValues:JSON.stringify({name,size,mime,category,clientId,taskId,parts:parts.length})});
  if(taskId){
   const deliveryUrl=`/api/files/multipart/stream?id=${encodeURIComponent(row.id)}`;
   await tx.execute(sql`
    update creative_tasks
    set file_url=${deliveryUrl},updated_at=now()
    where id=${taskId}
      and workspace_id=${s.workspaceId}
      and archived_at is null
      and deleted_at is null
   `);
  }
  return row;
 });
 return NextResponse.json({success:true,file:{...created,canEdit:true,isArchived:false}});
}

export async function DELETE(req:NextRequest){
 const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;const id=clean(body?.id,100);if(!id)return NextResponse.json({error:"File id is required."},{status:400});
 const [raw]=await db.select().from(fileDocuments).where(and(eq(fileDocuments.id,id),eq(fileDocuments.workspaceId,s.workspaceId))).limit(1);const row=raw as FileRow|undefined;if(!row)return NextResponse.json({error:"File not found."},{status:404});
 if(!(s.role==="SUPER_ADMIN"||row.uploadedBy===s.userId))return NextResponse.json({error:"You can only delete files you uploaded."},{status:403});
 const manifest=decodeManifest(row.storagePath);if(!manifest)return NextResponse.json({error:"File is not multipart."},{status:400});
 for(const p of manifest.parts){const r=await fetch(`${base()}/storage/v1/object/${BUCKET}/${p.path}`,{method:"DELETE",headers:headers()});if(!r.ok&&r.status!==404)return NextResponse.json({error:"Could not delete all stored file parts."},{status:502})}
 await db.transaction(async tx=>{
  await tx.delete(fileDocuments).where(and(eq(fileDocuments.id,id),eq(fileDocuments.workspaceId,s.workspaceId)));
  await tx.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:"file_deleted",entity:"file_documents",entityId:id,oldValues:JSON.stringify({name:row.name,size:row.sizeBytes,multipart:true})});
 });
 return NextResponse.json({success:true,state:"deleted"});
}