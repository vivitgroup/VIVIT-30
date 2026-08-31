export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, webhooks, auditLogs } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const EVENT_TYPES=["task.created","task.approved","task.completed","client.created","lead.won","invoice.paid","lead.created","task.revision","*"];
function safeWebhookUrl(raw:string){
  try{
    const u=new URL(raw);
    const host=u.hostname.toLowerCase();
    if(u.protocol!=="https:")return null;
    if(host==="localhost"||host.endsWith(".localhost")||host==="0.0.0.0"||host==="127.0.0.1"||host==="::1"||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host))return null;
    return u.toString();
  }catch{return null;}
}
type WebhookSession={user?:{role?:string|null;workspaceId?:string|null}|null}|null;
function workspaceOf(session:WebhookSession){const workspaceId=String(session?.user?.workspaceId||"").trim();return workspaceId||null;}

export async function dispatchWebhook(event:string,payload:Record<string,unknown>,workspaceId:string){
  if(!workspaceId)throw new Error("workspaceId is required for webhook dispatch");
  if(!EVENT_TYPES.includes(event)&&event!=="*")return;
  const hooks=await db.select().from(webhooks).where(and(eq(webhooks.workspaceId,workspaceId),eq(webhooks.isActive,true)));
  for(const hook of hooks){
    let events:string[]=[];try{const parsed=JSON.parse(hook.events??"[]");events=Array.isArray(parsed)?parsed.filter((v:unknown):v is string=>typeof v==="string"):[];}catch{}
    if(!events.includes(event)&&!events.includes("*"))continue;
    const target=safeWebhookUrl(hook.url);if(!target)continue;
    const body=JSON.stringify({event,timestamp:new Date().toISOString(),workspaceId,data:payload});
    const sig=crypto.createHmac("sha256",hook.secret).update(body).digest("hex");
    let delivered=false;
    for(let attempt=0;attempt<3;attempt++){
      if(attempt>0)await new Promise(r=>setTimeout(r,Math.min(1000*attempt,3000)));
      try{
        const res=await fetch(target,{method:"POST",headers:{"Content-Type":"application/json","X-Vivit-Signature":`sha256=${sig}`,"X-Vivit-Event":event,"X-Vivit-Attempt":String(attempt+1),"X-Vivit-Delivery":crypto.randomUUID()},body,signal:AbortSignal.timeout(5000)});
        if(res.ok){await db.update(webhooks).set({lastCalledAt:new Date(),failCount:0}).where(and(eq(webhooks.id,hook.id),eq(webhooks.workspaceId,workspaceId)));delivered=true;break;}
      }catch{}
    }
    if(!delivered){const failCount=(hook.failCount??0)+1;await db.update(webhooks).set({failCount,isActive:failCount<10}).where(and(eq(webhooks.id,hook.id),eq(webhooks.workspaceId,workspaceId)));}
  }
}

function isAdmin(session:WebhookSession){return !!session?.user&&session.user.role==="SUPER_ADMIN";}
export async function GET(){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!isAdmin(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session);if(!workspaceId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const hooks=await db.select({id:webhooks.id,workspaceId:webhooks.workspaceId,url:webhooks.url,events:webhooks.events,isActive:webhooks.isActive,failCount:webhooks.failCount,lastCalledAt:webhooks.lastCalledAt,createdAt:webhooks.createdAt}).from(webhooks).where(eq(webhooks.workspaceId,workspaceId)).orderBy(desc(webhooks.createdAt));
  return NextResponse.json({hooks,events:EVENT_TYPES},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!isAdmin(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session),userId=String(session.user.id||"");if(!workspaceId||!userId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid JSON body"},{status:400});
  const url=safeWebhookUrl(String(body.url||""));const events=Array.isArray(body.events)?[...new Set(body.events.map((v:unknown)=>String(v)))]:[];
  if(!url||!events.length||events.some((e:string)=>!EVENT_TYPES.includes(e)))return NextResponse.json({error:"A public HTTPS URL and valid events are required"},{status:400});
  const secret=crypto.randomBytes(32).toString("hex");
  const hook=await db.transaction(async tx=>{const [created]=await tx.insert(webhooks).values({workspaceId,url,events:JSON.stringify(events),secret,isActive:true,failCount:0}).returning({id:webhooks.id,url:webhooks.url,events:webhooks.events,isActive:webhooks.isActive,createdAt:webhooks.createdAt});await tx.insert(auditLogs).values({workspaceId,userId,action:"webhook_created",entity:"webhooks",entityId:created.id,newValues:JSON.stringify({url,events})});return created});
  return NextResponse.json({...hook,secret,message:"Save the secret — it won't be shown again."},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!isAdmin(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session),userId=String(session.user.id||"");if(!workspaceId||!userId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const body=await req.json().catch(()=>null);const id=String(body?.id||"");if(!id)return NextResponse.json({error:"id required"},{status:400});
  const rows=await db.transaction(async tx=>{const changed=await tx.delete(webhooks).where(and(eq(webhooks.id,id),eq(webhooks.workspaceId,workspaceId))).returning({id:webhooks.id,url:webhooks.url});if(changed.length)await tx.insert(auditLogs).values({workspaceId,userId,action:"webhook_deleted",entity:"webhooks",entityId:id,newValues:JSON.stringify({url:changed[0].url})});return changed});
  if(!rows.length)return NextResponse.json({error:"Webhook not found"},{status:404});
  return NextResponse.json({success:true},{headers:{"Cache-Control":"private, no-store"}});
}
