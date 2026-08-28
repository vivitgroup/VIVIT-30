import fs from "node:fs";
function replaceOnce(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}
{
 const p="app/dashboard/portal/page.tsx";let s=fs.readFileSync(p,"utf8");
 s=replaceOnce(s,"else await db.execute(sql`update creative_tasks set approved_by_client=false,status='REVISION',revision_notes=${comment},revision_count=coalesce(revision_count,0)+1,updated_at=now() where id=${taskId} and client_id=${client.id} and archived_at is null`);","else await db.execute(sql`update creative_tasks set approved_by_client=false,status='REVISION',revision_notes=${comment},revision_count=coalesce(revision_count,0)+1,updated_at=now() where id=${taskId} and client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null`);","portal revision workspace");
 s=replaceOnce(s,' const {revalidatePath}=await import("next/cache");revalidatePath("/dashboard/portal");',' const {revalidatePath}=await import("next/cache");for(const p of ["/dashboard/portal","/dashboard/creative","/dashboard/tasks-inbox","/dashboard/today","/dashboard/calendar"])revalidatePath(p);',"portal propagation revalidation");
 fs.writeFileSync(p,s);
}
{
 const p="app/api/media-control-v2/route.ts";let s=fs.readFileSync(p,"utf8");
 s=replaceOnce(s,'.values({clientId,connectionId:a.id,platform:a.platform,externalId,name,createdBy:c.userId})','.values({workspaceId:c.workspaceId,clientId,connectionId:a.id,platform:a.platform,externalId,name,createdBy:c.userId})',"campaign explicit workspace insert");
 s=s.replaceAll('db.insert(auditLogs).values({userId:c.userId,','db.insert(auditLogs).values({workspaceId:c.workspaceId,userId:c.userId,');
 fs.writeFileSync(p,s);
}
console.log("Portal/media final hardening applied.");
