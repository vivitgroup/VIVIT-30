export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,fileDocuments,clients,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const BUCKET="vivit-files";
const PREFIX="multipart:";
const MAX_RESPONSE=4*1024*1024;
const base=()=>String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const storageHeaders=()=>({apikey:process.env.SUPABASE_SERVICE_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY!}`});
const clean=(v:unknown,n=700)=>String(v||"").trim().slice(0,n);

type Manifest={v:1;parts:Array<{path:string;size:number}>;size:number;mime:string};
type FileRow={id:string;workspaceId:string;uploadedBy:string;clientId:string|null;taskId:string|null;storagePath:string;mimeType:string|null;name:string};

function decodeManifest(value:string):Manifest|null{
 if(!value.startsWith(PREFIX))return null;
 try{
  const parsed=JSON.parse(Buffer.from(value.slice(PREFIX.length),"base64url").toString("utf8")) as Manifest;
  if(parsed?.v!==1||!Array.isArray(parsed.parts)||!parsed.parts.length||!Number.isFinite(parsed.size)||parsed.size<=0)return null;
  if(parsed.parts.some(p=>!p?.path||!Number.isFinite(p.size)||p.size<=0))return null;
  if(parsed.parts.reduce((n,p)=>n+p.size,0)!==parsed.size)return null;
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

function locate(parts:Manifest["parts"],globalOffset:number){
 let cursor=0;
 for(const part of parts){
  const next=cursor+part.size;
  if(globalOffset<next)return {part,localOffset:globalOffset-cursor,partStart:cursor};
  cursor=next;
 }
 return null;
}

async function loadAuthorizedFile(req:NextRequest){
 const s=await sessionScope();if(!s)return {error:NextResponse.json({error:"Unauthorized"},{status:401})};
 if(!base()||!process.env.SUPABASE_SERVICE_KEY)return {error:NextResponse.json({error:"Storage is not configured."},{status:503})};
 const id=clean(req.nextUrl.searchParams.get("id"),100);if(!id)return {error:NextResponse.json({error:"File id is required."},{status:400})};
 const [raw]=await db.select().from(fileDocuments).where(and(eq(fileDocuments.id,id),eq(fileDocuments.workspaceId,s.workspaceId))).limit(1);
 const row=raw as FileRow|undefined;if(!row)return {error:NextResponse.json({error:"File not found."},{status:404})};
 if(!(await canAccess(row,s.workspaceId,s.userId,s.role)))return {error:NextResponse.json({error:"Forbidden"},{status:403})};
 const manifest=decodeManifest(row.storagePath);if(!manifest)return {error:NextResponse.json({error:"File is not multipart."},{status:400})};
 return {row,manifest};
}

export async function GET(req:NextRequest){
 const loaded=await loadAuthorizedFile(req);if("error" in loaded)return loaded.error;
 const {row,manifest}=loaded;
 const range=req.headers.get("range");
 let start=0;
 if(range){const match=/bytes=(\d+)-/i.exec(range);if(match)start=Number(match[1])}
 if(!Number.isFinite(start)||start<0||start>=manifest.size)return new NextResponse(null,{status:416,headers:{"Content-Range":`bytes */${manifest.size}`,"Accept-Ranges":"bytes"}});
 const located=locate(manifest.parts,start);if(!located)return new NextResponse(null,{status:416});
 const maxWithinPart=located.part.size-located.localOffset;
 const length=Math.min(MAX_RESPONSE,maxWithinPart,manifest.size-start);
 const localEnd=located.localOffset+length-1;
 const upstream=await fetch(`${base()}/storage/v1/object/authenticated/${BUCKET}/${located.part.path}`,{
  headers:{...storageHeaders(),Range:`bytes=${located.localOffset}-${localEnd}`},cache:"no-store"
 });
 if(!upstream.ok&&upstream.status!==206)return NextResponse.json({error:"Could not stream stored video data."},{status:502});
 const body=await upstream.arrayBuffer();
 return new NextResponse(body,{status:206,headers:{
  "Content-Type":manifest.mime||row.mimeType||"application/octet-stream",
  "Content-Length":String(body.byteLength),
  "Content-Range":`bytes ${start}-${start+body.byteLength-1}/${manifest.size}`,
  "Accept-Ranges":"bytes",
  "Cache-Control":"private, no-store",
  "Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
  "X-Content-Type-Options":"nosniff"
 }});
}

export async function HEAD(req:NextRequest){
 const loaded=await loadAuthorizedFile(req);if("error" in loaded)return loaded.error;
 const {row,manifest}=loaded;
 return new NextResponse(null,{status:200,headers:{
  "Content-Type":manifest.mime||row.mimeType||"application/octet-stream",
  "Content-Length":String(manifest.size),
  "Accept-Ranges":"bytes",
  "Cache-Control":"private, no-store",
  "Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
  "X-Content-Type-Options":"nosniff"
 }});
}
