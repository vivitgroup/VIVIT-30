export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,approvalTokens,creativeTasks,clients,contacts,auditLogs,sql} from "@/lib/db";
import {eq,and} from "drizzle-orm";
import crypto from "crypto";
import {canAccessClient} from "@/lib/client-access";
import {hashApprovalToken,escapeHtml,safeHttpUrl} from "@/lib/approval-security";

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=String(session.user.workspaceId||"").trim(),userId=String(session.user.id||"");if(!workspaceId||!userId)return NextResponse.json({error:"Workspace context is required"},{status:403});
 const body=await req.json().catch(()=>null),taskId=String(body?.taskId||"").trim();if(!taskId)return NextResponse.json({error:"taskId required"},{status:400});
 const base=String(process.env.NEXTAUTH_URL||"").replace(/\/$/,"");if(!safeHttpUrl(base))return NextResponse.json({error:"Application URL is not configured"},{status:503});
 const [task]=await db.select().from(creativeTasks).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),sql`${creativeTasks.id} in (select id from creative_tasks where workspace_id=${workspaceId} and archived_at is null)`)).limit(1);if(!task)return NextResponse.json({error:"Task not found"},{status:404});
 if(!(await canAccessClient(session,task.clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
 if(task.status!=="APPROVED"||task.approvedByClient)return NextResponse.json({error:"Task must be internally approved and awaiting client review"},{status:409});
 const [client]=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.id,task.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(!client)return NextResponse.json({error:"Client is inactive or unavailable"},{status:409});
 const [contact]=await db.select({email:contacts.email,name:contacts.name}).from(contacts).innerJoin(clients,eq(contacts.clientId,clients.id)).where(and(eq(contacts.clientId,task.clientId),eq(contacts.isPrimary,true),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
 const rawToken=crypto.randomBytes(32).toString("hex"),tokenHash=hashApprovalToken(rawToken),expiresAt=new Date(Date.now()+48*60*60*1000),approvalUrl=`${base}/approve/${rawToken}`;
 try{await db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`approval-token:${workspaceId}:${taskId}:approve`}))`);
  const [freshTask]=await tx.select({id:creativeTasks.id,status:creativeTasks.status,clientId:creativeTasks.clientId,approvedByClient:creativeTasks.approvedByClient}).from(creativeTasks).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"APPROVED"),eq(creativeTasks.approvedByClient,false),sql`${creativeTasks.id} in (select id from creative_tasks where workspace_id=${workspaceId} and archived_at is null)`)).limit(1);
  if(!freshTask||freshTask.clientId!==task.clientId)throw new Error("TASK_STATE_CHANGED");
  await tx.delete(approvalTokens).where(and(eq(approvalTokens.taskId,taskId),eq(approvalTokens.clientId,task.clientId),eq(approvalTokens.action,"approve"),sql`${approvalTokens.usedAt} is null`));
  const [issued]=await tx.insert(approvalTokens).values({taskId,clientId:task.clientId,token:tokenHash,action:"approve",expiresAt}).returning({id:approvalTokens.id});
  await tx.insert(auditLogs).values({workspaceId,userId,action:"creative_approval_token_issued",entity:"approval_tokens",entityId:issued.id,newValues:JSON.stringify({taskId,clientId:task.clientId,action:"approve",expiresAt:expiresAt.toISOString(),recipientConfigured:Boolean(contact?.email)})});
 })}catch(error){if(error instanceof Error&&error.message==="TASK_STATE_CHANGED")return NextResponse.json({error:"Task approval state changed. Refresh and try again."},{status:409});throw error}
 const fileUrl=safeHttpUrl(task.fileUrl);let emailSent=false;
 if(contact?.email&&process.env.RESEND_API_KEY){const safeTask=escapeHtml(task.title),safeContact=escapeHtml(contact.name||"there"),safeCompany=escapeHtml(client.companyName),safeApproval=escapeHtml(approvalUrl),safeFile=fileUrl?escapeHtml(fileUrl):null;const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from:process.env.EMAIL_FROM??"VIVIT ERP <noreply@vivitcrm.com>",to:[contact.email],subject:`Creative ready for review: ${task.title}`.slice(0,180),html:`<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px"><h1>Creative Ready for Review</h1><h2>${safeTask}</h2><p>Hi ${safeContact},</p><p>${safeCompany}'s creative is ready for review.</p>${safeFile?`<p><a href="${safeFile}">View creative file</a></p>`:""}<p><a href="${safeApproval}">Review &amp; Approve</a></p><p>Link expires in 48 hours · VIVIT GROUP</p></div>`})}).catch(()=>null);emailSent=Boolean(response?.ok)}
 return NextResponse.json({success:true,approvalUrl,expiresAt,emailSent},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})
}
