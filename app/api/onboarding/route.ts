export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, onboardingProgress, clients, mediaMetrics, creativeTasks,
  financeRecords, contacts, calendarEvents, auditLogs, sql } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

const AUTO_STEPS=["profile_created","contact_added","media_metrics_added","first_task_created","first_invoice_sent","calendar_scheduled","creative_approved","portal_active","budget_set","contract_signed"] as const;
const MANUAL_STEPS=["contract","access","assets","brief","kickoff","portal","tracking","first_task","first_report","nps_baseline"] as const;
const ALLOWED_STEPS=new Set<string>([...AUTO_STEPS,...MANUAL_STEPS]);

async function computeProgress(clientId:string,workspaceId:string):Promise<Record<string,boolean>>{
  const [cl]=await db.select().from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
  if(!cl)return{};
  const [metricCount,taskCount,invoiceCount,contactCount,calCount,approvedTask]=await Promise.all([
    db.select({cnt:count()}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),eq(mediaMetrics.clientId,clientId))).then(r=>r[0]),
    db.select({cnt:count()}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.clientId,clientId))).then(r=>r[0]),
    db.select({cnt:count()}).from(financeRecords).where(and(eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.clientId,clientId))).then(r=>r[0]),
    db.select({cnt:count()}).from(contacts).where(eq(contacts.clientId,clientId)).then(r=>r[0]),
    db.select({cnt:count()}).from(calendarEvents).where(and(eq(calendarEvents.workspaceId,workspaceId),eq(calendarEvents.clientId,clientId))).then(r=>r[0]),
    db.select({cnt:count()}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.clientId,clientId),eq(creativeTasks.status,"APPROVED"))).then(r=>r[0]),
  ]);
  return{profile_created:true,contact_added:Number(contactCount?.cnt??0)>0,media_metrics_added:Number(metricCount?.cnt??0)>0,first_task_created:Number(taskCount?.cnt??0)>0,first_invoice_sent:Number(invoiceCount?.cnt??0)>0,calendar_scheduled:Number(calCount?.cnt??0)>0,creative_approved:Number(approvedTask?.cnt??0)>0,portal_active:!!cl.userId,budget_set:Number(cl.mediaBudget??0)>0,contract_signed:!!cl.contractStart};
}

export async function GET(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const workspaceId=String(session.user.workspaceId||""),clientId=String(req.nextUrl.searchParams.get("clientId")||"");
  if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});if(!clientId)return NextResponse.json({error:"clientId required"},{status:400});
  if(!(await canAccessClient(session,clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
  const computed=await computeProgress(clientId,workspaceId);if(!Object.keys(computed).length)return NextResponse.json({error:"Client not found"},{status:404});
  const total=Object.keys(computed).length,done=Object.values(computed).filter(Boolean).length,pct=total?Math.round(done/total*100):0;
  const labels:Record<string,string>={profile_created:"Client profile created",contact_added:"Primary contact added",media_metrics_added:"First media metrics entered",first_task_created:"First creative task created",first_invoice_sent:"First invoice generated",calendar_scheduled:"First content scheduled",creative_approved:"First creative approved",portal_active:"Client portal activated",budget_set:"Monthly budget configured",contract_signed:"Contract dates set"};
  return NextResponse.json({clientId,steps:Object.entries(computed).map(([key,isDone])=>({key,done:isDone,label:labels[key]??key})),done,total,pct,isComplete:pct===100,message:pct===100?"✅ Onboarding complete!":`${done}/${total} steps complete — ${pct}%`},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");if(!workspaceId||!userId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
  const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid JSON body"},{status:400});
  const clientId=String(body.clientId||""),step=String(body.step||"");if(!clientId||!step)return NextResponse.json({error:"clientId and step required"},{status:400});if(!ALLOWED_STEPS.has(step))return NextResponse.json({error:"Invalid onboarding step"},{status:400});if(typeof body.value!=="undefined"&&typeof body.value!=="boolean")return NextResponse.json({error:"value must be boolean"},{status:400});
  if(!(await canAccessClient(session,clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
  const value=body.value??true,now=value?new Date():null,lockKey=`onboarding:${clientId}:${step}`;
  const done=await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const [liveClient]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(!liveClient)throw new Error("Client is no longer active or available in this workspace");
    const [existing]=await tx.select().from(onboardingProgress).where(and(eq(onboardingProgress.clientId,clientId),eq(onboardingProgress.stepId,step))).limit(1);
    const update={completed:value,completedAt:now,completedBy:value?userId:null};
    let entityId:string;
    if(existing){await tx.update(onboardingProgress).set(update).where(and(eq(onboardingProgress.id,existing.id),eq(onboardingProgress.clientId,clientId)));entityId=existing.id}else{const [created]=await tx.insert(onboardingProgress).values({clientId,stepId:step,...update}).returning({id:onboardingProgress.id});entityId=created.id}
    await tx.insert(auditLogs).values({workspaceId,userId,action:"onboarding_step_updated",entity:"onboarding_progress",entityId,newValues:JSON.stringify({clientId,step,value})});
    const rows=await tx.select({completed:onboardingProgress.completed}).from(onboardingProgress).where(eq(onboardingProgress.clientId,clientId));return rows.filter(r=>r.completed).length;
  });
  return NextResponse.json({success:true,step,value,done},{headers:{"Cache-Control":"private, no-store"}});
}
