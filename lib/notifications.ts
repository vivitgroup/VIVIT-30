import {createHash} from "node:crypto";
import {and,eq} from "drizzle-orm";
import {db,emailLogs,notifications,users,workspaces} from "@/lib/db";
import {safeInternalPath} from "@/lib/safe-navigation";

type NotificationInput={
  workspaceId:string;
  userId:string;
  eventKey:string;
  type:string;
  title:string;
  message:string;
  link?:string|null;
  priority?:"low"|"normal"|"high"|"urgent";
};

type EmailInput={
  workspaceId:string;
  to:string;
  subject:string;
  type:string;
  html:string;
  idempotencyKey:string;
};

type EmailResult={status:"sent"|"failed"|"duplicate";id:string;providerId?:string};

const stableId=(kind:string,...parts:string[])=>createHash("sha256").update([kind,...parts].join("\u001f")).digest("hex");
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export async function createNotification(input:NotificationInput){
  const workspaceId=input.workspaceId.trim();
  const userId=input.userId.trim();
  const eventKey=input.eventKey.trim();
  if(!workspaceId||!userId||!eventKey)throw new Error("Invalid notification scope");

  const [recipient]=await db.select({id:users.id})
    .from(users)
    .where(and(eq(users.id,userId),eq(users.workspaceId,workspaceId),eq(users.isActive,true)))
    .limit(1);
  if(!recipient)throw new Error("Notification recipient is outside the authenticated workspace");

  const id=stableId("notification",workspaceId,userId,eventKey);
  await db.insert(notifications).values({
    id,
    userId,
    type:input.type.slice(0,80),
    title:input.title.slice(0,180),
    message:input.message.slice(0,2000),
    link:safeInternalPath(input.link??null),
    priority:input.priority??"normal",
  }).onConflictDoNothing({target:notifications.id});
  return {id};
}

export async function sendWorkspaceEmail(input:EmailInput):Promise<EmailResult>{
  const workspaceId=input.workspaceId.trim();
  const to=input.to.trim().toLowerCase();
  const idempotencyKey=input.idempotencyKey.trim();
  if(!workspaceId||!to||!idempotencyKey||!input.subject.trim()||!input.type.trim())throw new Error("Invalid email delivery request");

  const [workspace]=await db.select({id:workspaces.id,resendApiKey:workspaces.resendApiKey})
    .from(workspaces)
    .where(and(eq(workspaces.id,workspaceId),eq(workspaces.isActive,true)))
    .limit(1);
  if(!workspace?.resendApiKey)return {status:"failed",id:stableId("email",workspaceId,to,idempotencyKey)};

  const id=stableId("email",workspaceId,to,idempotencyKey);
  const [existing]=await db.select({status:emailLogs.status,resendId:emailLogs.resendId})
    .from(emailLogs)
    .where(eq(emailLogs.id,id))
    .limit(1);
  if(existing?.status==="sent")return {status:"duplicate",id,providerId:existing.resendId??undefined};

  const safeSubject=input.subject.trim().slice(0,220);
  const safeType=input.type.trim().slice(0,80);
  if(existing){
    await db.update(emailLogs).set({status:"pending",subject:safeSubject,type:safeType,to}).where(eq(emailLogs.id,id));
  }else{
    await db.insert(emailLogs).values({id,to,subject:safeSubject,type:safeType,status:"pending"});
  }

  const from=process.env.RESEND_FROM_EMAIL?.trim();
  if(!from){
    await db.update(emailLogs).set({status:"failed"}).where(eq(emailLogs.id,id));
    return {status:"failed",id};
  }

  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{
          Authorization:`Bearer ${workspace.resendApiKey}`,
          "Content-Type":"application/json",
          "Idempotency-Key":id,
        },
        body:JSON.stringify({from,to:[to],subject:safeSubject,html:input.html}),
        cache:"no-store",
        signal:AbortSignal.timeout(5000),
      });
      if(response.ok){
        const payload=await response.json() as {id?:string};
        const providerId=typeof payload.id==="string"?payload.id.slice(0,200):null;
        await db.update(emailLogs).set({status:"sent",resendId:providerId}).where(eq(emailLogs.id,id));
        return {status:"sent",id,providerId:providerId??undefined};
      }
      if(response.status<500&&response.status!==429)break;
    }catch{
      // Provider/network details are intentionally not persisted or returned.
    }
    if(attempt<2)await sleep(250*(2**attempt));
  }

  await db.update(emailLogs).set({status:"failed"}).where(eq(emailLogs.id,id));
  return {status:"failed",id};
}
