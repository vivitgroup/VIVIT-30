// @ts-nocheck -- live Supabase schema contains the complete file metadata fields.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db,fileDocuments,auditLogs,clients,creativeTasks,sql } from "@/lib/db";
import { eq,and,desc,inArray,or } from "drizzle-orm";

const BUCKET="vivit-files",MAX_SIZE=100*1024*1024;
const base=()=>String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY!}`});
const safeName=(name:string)=>name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(-140)||"file";

async function ensureBucket(){
  const payload={id:BUCKET,name:BUCKET,public:false,file_size_limit:MAX_SIZE,allowed_mime_types:null};
  const create=await fetch(`${base()}/storage/v1/bucket`,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(create.ok||create.status===409){await fetch(`${base()}/storage/v1/bucket/${BUCKET}`,{method:"PUT",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({public:false,file_size_limit:MAX_SIZE,allowed_mime_types:null})}).catch(()=>null);return;}
  try{
    await db.execute(sql`insert into storage.buckets (id,name,public,file_size_limit)
      values (${BUCKET},${BUCKET},false,${MAX_SIZE})
      on conflict (id) do update set public=false,file_size_limit=${MAX_SIZE}`);
    return;
  }catch(e){console.error("Storage bucket provisioning failed",e);}
  throw new Error("Storage bucket is unavailable");
}
async function scopeFor(role:string,userId:string){
  const own:any=eq(fileDocuments.uploadedBy,userId);
  if(role==="SUPER_ADMIN")return eq(fileDocuments.workspaceId,"default");
  if(role==="CLIENT"){const rows=await db.select({id:clients.id}).from(clients).where(eq(clients.userId,userId));return rows.length?or(own,inArray(fileDocuments.clientId,rows.map(x=>x.id))):own;}
  if(role==="ACCOUNT_MANAGER"||role==="MEDIA_BUYER"){const rows=await db.select({id:clients.id}).from(clients).where(and(eq(clients.isActive,true),role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):eq(clients.mediaBuyerId,userId)));return rows.length?or(own,inArray(fileDocuments.clientId,rows.map(x=>x.id))):own;}
  if(role==="CREATOR"){const rows=await db.select({id:creativeTasks.id}).from(creativeTasks).where(eq(creativeTasks.assignedToId,userId));return rows.length?or(own,inArray(fileDocuments.taskId,rows.map(x=>x.id))):own;}
  if(role==="ACCOUNTANT")return or(own,inArray(fileDocuments.category,["CONTRACT","INVOICE","FINANCE","SHEET"]));
  return own;
}
async function validateLinks(role:string,userId:string,clientId:string|null,taskId:string|null,category:string){
  if(!clientId&&!taskId)return true;
  if(role==="SUPER_ADMIN")return true;
  if(taskId){
    const [task]=await db.select({clientId:creativeTasks.clientId,assignedToId:creativeTasks.assignedToId}).from(creativeTasks).where(eq(creativeTasks.id,taskId)).limit(1);
    if(!task||clientId&&task.clientId!==clientId)return false;
    if(role==="CREATOR")return task.assignedToId===userId;
    clientId=task.clientId;
  }
  if(!clientId)return false;
  const [client]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(eq(clients.id,clientId)).limit(1);
  if(!client)return false;
  if(role==="ACCOUNT_MANAGER")return client.accountManagerId===userId;
  if(role==="MEDIA_BUYER")return client.mediaBuyerId===userId;
  if(role==="CLIENT")return client.userId===userId;
  if(role==="ACCOUNTANT")return ["CONTRACT","INVOICE","FINANCE","SHEET"].includes(category);
  return false;
}
export async function GET(){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const role=String((session.user as any).role),userId=String((session.user as any).id);
  const rows=await db.select().from(fileDocuments).where(await scopeFor(role,userId)).orderBy(desc(fileDocuments.createdAt)).limit(100);
  const files=await Promise.all(rows.map(async f=>{const r=await fetch(`${base()}/storage/v1/object/sign/${BUCKET}/${f.storagePath}`,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:900})});const d=await r.json().catch(()=>({}));return {...f,url:d.signedURL?`${base()}/storage/v1${d.signedURL}`:null};}));
  return NextResponse.json({files},{headers:{"Cache-Control":"private, max-age=15, stale-while-revalidate=30"}});
}
export async function POST(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!base()||!process.env.SUPABASE_SERVICE_KEY)return NextResponse.json({error:"Storage is not configured."},{status:503});
  const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
  const userId=String((session.user as any).id);
  if(body.op==="sign"){
    const name=String(body.name||""),size=Number(body.size||0);
    if(!name||!Number.isFinite(size)||size<=0)return NextResponse.json({error:"Choose a valid file."},{status:400});
    if(size>MAX_SIZE)return NextResponse.json({error:"Maximum file size is 100 MB."},{status:413});
    try{await ensureBucket()}catch{return NextResponse.json({error:"Storage bucket is unavailable."},{status:503})}
    const path=`${new Date().getFullYear()}/${userId}/${crypto.randomUUID()}-${safeName(name)}`;
    const signed=await fetch(`${base()}/storage/v1/object/upload/sign/${BUCKET}/${path}`,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({upsert:false})});
    const data=await signed.json().catch(()=>({}));if(!signed.ok)return NextResponse.json({error:data.message||data.error||"Could not prepare the upload."},{status:502});
    const relative=data.url||data.signedURL||data.signedUrl;if(!relative)return NextResponse.json({error:"Storage did not return an upload URL."},{status:502});
    return NextResponse.json({uploadUrl:relative.startsWith("http")?relative:`${base()}/storage/v1${relative}`,path,maxSize:MAX_SIZE});
  }
  if(body.op==="complete"){
    const path=String(body.path||""),size=Number(body.size||0);
    if(!path.includes(`/${userId}/`)||path.includes(".."))return NextResponse.json({error:"Invalid file path."},{status:403});
    if(size<=0||size>MAX_SIZE)return NextResponse.json({error:"Invalid file size."},{status:400});
    const role=String((session.user as any).role),category=String(body.category||"GENERAL").slice(0,40),clientId=body.clientId?String(body.clientId):null,taskId=body.taskId?String(body.taskId):null;
    if(!(await validateLinks(role,userId,clientId,taskId,category)))return NextResponse.json({error:"You cannot attach this file to the selected client or task."},{status:403});
    const info=await fetch(`${base()}/storage/v1/object/info/${BUCKET}/${path}`,{headers:headers()});if(!info.ok)return NextResponse.json({error:"Upload was not completed."},{status:409});
    const existing=await db.select({id:fileDocuments.id}).from(fileDocuments).where(eq(fileDocuments.storagePath,path)).limit(1);if(existing[0])return NextResponse.json({success:true,fileId:existing[0].id});
    const [row]=await db.insert(fileDocuments).values({uploadedBy:userId,name:String(body.name||"File").slice(0,255),storagePath:path,mimeType:String(body.mimeType||"application/octet-stream"),sizeBytes:size,category,clientId,taskId}).returning();
    await db.insert(auditLogs).values({userId,action:"file_uploaded",entity:"file_documents",entityId:row.id,newValues:JSON.stringify({name:row.name,size})});
    return NextResponse.json({success:true,file:row});
  }
  return NextResponse.json({error:"Unsupported operation."},{status:400});
}
