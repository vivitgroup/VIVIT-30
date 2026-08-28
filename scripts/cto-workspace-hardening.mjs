import fs from "node:fs";

function mustReplace(src, from, to, label){
  if(!src.includes(from)) throw new Error(`Missing expected pattern: ${label}`);
  return src.replace(from,to);
}

// --- Assistant: make workspace request-scoped; never use a process-global tenant id.
{
  const p="app/api/assistant/route.ts";
  let s=fs.readFileSync(p,"utf8");
  s=mustReplace(s,'const W="default";\n','',"assistant W constant");
  s=s.replaceAll('${W}','${workspaceId}');
  const sigs=[
    ['async function clientScope(role:string,userId:string):Promise<any[]>{','async function clientScope(role:string,userId:string,workspaceId:string):Promise<any[]>{'],
    ['async function taskContext(role:string,userId:string,ids:string[]):Promise<any[]>{','async function taskContext(role:string,userId:string,ids:string[],workspaceId:string):Promise<any[]>{'],
    ['async function mediaContext(role:string,ids:string[]):Promise<any[]>{','async function mediaContext(role:string,ids:string[],workspaceId:string):Promise<any[]>{'],
    ['async function trackingContext(role:string,ids:string[]):Promise<any[]>','async function trackingContext(role:string,ids:string[],workspaceId:string):Promise<any[]>'],
    ['async function clientHealthContext(role:string,ids:string[]):Promise<any[]>','async function clientHealthContext(role:string,ids:string[],workspaceId:string):Promise<any[]>'],
    ['async function salesContext(role:string,userId:string):Promise<any[]>','async function salesContext(role:string,userId:string,workspaceId:string):Promise<any[]>'],
    ['async function financeContext(role:string,ids:string[]):Promise<{billing:any[];expenses:any[]}>','async function financeContext(role:string,ids:string[],workspaceId:string):Promise<{billing:any[];expenses:any[]}>'],
    ['async function actionStaff(role:string){','async function actionStaff(role:string,workspaceId:string){'],
    ['async function readUploadedImageForVivito(userId:string,attachment:any){','async function readUploadedImageForVivito(userId:string,attachment:any,workspaceId:string){']
  ];
  for(const [a,b] of sigs) s=mustReplace(s,a,b,`assistant signature ${a.slice(0,35)}`);
  const roleLine=' const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),attachments=Array.isArray(body.attachments)?';
  const roleNew=' const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),workspaceId=String((session.user as any).workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});\n const attachments=Array.isArray(body.attachments)?';
  s=mustReplace(s,roleLine,roleNew,"assistant POST workspace extraction");
  const calls=[
    ['clientScope(role,userId)','clientScope(role,userId,workspaceId)'],
    ['taskContext(role,userId,ids)','taskContext(role,userId,ids,workspaceId)'],
    ['mediaContext(role,ids)','mediaContext(role,ids,workspaceId)'],
    ['trackingContext(role,ids)','trackingContext(role,ids,workspaceId)'],
    ['clientHealthContext(role,ids)','clientHealthContext(role,ids,workspaceId)'],
    ['salesContext(role,userId)','salesContext(role,userId,workspaceId)'],
    ['financeContext(role,ids)','financeContext(role,ids,workspaceId)'],
    ['actionStaff(role)','actionStaff(role,workspaceId)'],
    ['readUploadedImageForVivito(userId,image)','readUploadedImageForVivito(userId,image,workspaceId)']
  ];
  for(const [a,b] of calls) s=s.replaceAll(a,b);
  if(s.includes('${W}')||s.includes('const W="default"')) throw new Error("Assistant still contains fixed workspace scope");
  fs.writeFileSync(p,s);
}

// --- Media Control V2: client directory must always be tenant-scoped before ownership filters.
{
  const p="app/api/media-control-v2/route.ts";
  let s=fs.readFileSync(p,"utf8");
  const start=s.indexOf('async function ctx(){');
  const end=s.indexOf('function validDate',start);
  if(start<0||end<0) throw new Error("media-control-v2 ctx block not found");
  const ctx=`async function ctx(){const s=await auth();if(!s?.user||!ROLES.includes(String((s.user as any).role)))return null;const role=String((s.user as any).role),userId=String((s.user as any).id),workspaceId=String((s.user as any).workspaceId||"");if(!workspaceId)return null;const ownerScope=role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):sql\`true\`;const owned=await db.select({id:clients.id,name:clients.companyName}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),ownerScope));return {role,userId,workspaceId,clients:owned,ids:owned.map(x=>x.id)}}\n`;
  s=s.slice(0,start)+ctx+s.slice(end);
  if(s.includes('eq(clients.workspaceId,"default")')) throw new Error("Media Control still contains default workspace");
  fs.writeFileSync(p,s);
}

// --- Client Portal: derive tenant from authenticated client session, not a constant.
{
  const p="app/dashboard/portal/page.tsx";
  let s=fs.readFileSync(p,"utf8");
  s=mustReplace(s,'const WORKSPACE="default";\n','',"portal workspace constant");
  s=s.replaceAll('${WORKSPACE}','${workspaceId}');
  const actionLine=' const userId=String((session.user as any).id),taskId=String(fd.get("taskId")||""),decision=String(fd.get("decision")||""),comment=String(fd.get("comment")||"").trim().slice(0,1000);';
  const actionNew=' const userId=String((session.user as any).id),workspaceId=String((session.user as any).workspaceId||"");if(!workspaceId)throw new Error("Workspace unavailable");const taskId=String(fd.get("taskId")||""),decision=String(fd.get("decision")||""),comment=String(fd.get("comment")||"").trim().slice(0,1000);';
  s=mustReplace(s,actionLine,actionNew,"portal action workspace");
  const pageLine=' const userId=String((session.user as any).id);';
  const pageNew=' const userId=String((session.user as any).id),workspaceId=String((session.user as any).workspaceId||"");if(!workspaceId)redirect("/login?reason=workspace_missing");';
  s=mustReplace(s,pageLine,pageNew,"portal page workspace");
  s=s.replace('where c.client_id=${client.id} and c.archived_at is null','where c.workspace_id=${workspaceId} and c.client_id=${client.id} and c.archived_at is null');
  // Review writes are additionally pinned to the authenticated workspace.
  s=s.replace('where id=${taskId} and client_id=${client.id} and archived_at is null','where id=${taskId} and client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null');
  if(s.includes('${WORKSPACE}')||s.includes('const WORKSPACE="default"')) throw new Error("Portal still contains fixed workspace scope");
  fs.writeFileSync(p,s);
}

console.log("CTO workspace hardening patch applied successfully.");
