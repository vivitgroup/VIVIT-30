import fs from "node:fs";
const file="lib/actions/index.ts";
let s=fs.readFileSync(file,"utf8");
const re=/export async function updateClient\(clientId:string,formData:FormData\)\{[\s\S]*?\n\}\n\n(?=export async function markNotificationRead)/;
const hardened=`export async function updateClient(clientId:string,formData:FormData){
  const session=await auth();const access=await requireClientAccess(session,clientId,true),workspaceId=access.workspaceId,updateRole=roleOf(session),userId=String(session!.user!.id||"");
  const [existingClient]=await db.select({companyName:clients.companyName,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId,updatedAt:clients.updatedAt}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(!existingClient)throw new Error("Client not found");
  let nextAm=existingClient.accountManagerId,nextMb=existingClient.mediaBuyerId;
  if(updateRole==="SUPER_ADMIN"){nextAm=String(formData.get("accountManagerId")||"")||null;nextMb=String(formData.get("mediaBuyerId")||"")||null}
  if(nextAm){const [am]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextAm),eq(users.workspaceId,workspaceId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!am)throw new Error("Invalid account manager")}
  if(nextMb){const [mb]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextMb),eq(users.workspaceId,workspaceId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);if(!mb)throw new Error("Invalid media buyer")}
  const companyName=sanitize(String(formData.get("companyName")||""),160);if(companyName.length<2)throw new Error("Company name is required");
  const nonNegative=(name:string)=>{const n=Number(formData.get(name)||0);if(!Number.isFinite(n)||n<0)throw new Error("Invalid client financial data");return n},monthlyRetainer=nonNegative("monthlyRetainer"),mediaBudget=nonNegative("mediaBudget"),contractValue=nonNegative("contractValue");
  const contractStart=formData.get("contractStart")?new Date(String(formData.get("contractStart"))):null,contractEnd=formData.get("contractEnd")?new Date(String(formData.get("contractEnd"))):null;if((contractStart&&Number.isNaN(contractStart.getTime()))||(contractEnd&&Number.isNaN(contractEnd.getTime()))||(contractStart&&contractEnd&&contractEnd<contractStart))throw new Error("Invalid contract dates");
  await db.transaction(async tx=>{const [duplicate]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);if(duplicate&&duplicate.id!==clientId)throw new Error("A client with this company name already exists");const changed=await tx.update(clients).set({companyName,industry:String(formData.get("industry")||"")||null,website:String(formData.get("website")||"")||null,monthlyRetainer,mediaBudget,contractValue,accountManagerId:nextAm,mediaBuyerId:nextMb,metaAdsLink:String(formData.get("metaAdsLink")||"")||null,tiktokAdsLink:String(formData.get("tiktokAdsLink")||"")||null,snapchatAdsLink:String(formData.get("snapchatAdsLink")||"")||null,googleAdsLink:String(formData.get("googleAdsLink")||"")||null,internalNotes:String(formData.get("internalNotes")||"")||null,contractStart,contractEnd,updatedAt:new Date()}).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),eq(clients.updatedAt,existingClient.updatedAt))).returning({id:clients.id});if(!changed.length)throw new Error("Client changed concurrently; refresh and try again");await tx.insert(auditLogs).values({workspaceId,userId,action:"client_updated",entity:"Client",entityId:clientId,oldValues:JSON.stringify({companyName:existingClient.companyName,accountManagerId:existingClient.accountManagerId,mediaBuyerId:existingClient.mediaBuyerId}),newValues:JSON.stringify({companyName,accountManagerId:nextAm,mediaBuyerId:nextMb})})});
  revalidatePath(\`/dashboard/clients/\${clientId}\`);revalidatePath("/dashboard/clients");redirect(\`/dashboard/clients/\${clientId}\`);
}

`;
const updateClientMatch=s.match(re);
if(!updateClientMatch)throw new Error("Missing legacy updateClient function");
const updateClientSource=updateClientMatch[0];
const alreadyHardened=updateClientSource.includes("Client changed concurrently; refresh and try again")&&updateClientSource.includes('action:"client_updated"')&&updateClientSource.includes("eq(clients.updatedAt,existingClient.updatedAt)");
if(!alreadyHardened)s=s.replace(re,hardened);
fs.writeFileSync(file,s);
const qa="scripts/qa-clients.mjs";let q=fs.readFileSync(qa,"utf8");
if(!q.includes("Legacy client update is atomic audited and concurrency guarded"))q=q.replace('check("Existing client update validates ownership and assignments"','check("Legacy client update is atomic audited and concurrency guarded",actions.includes(\'action:"client_updated"\')&&actions.includes("Client changed concurrently")&&actions.includes("eq(clients.updatedAt,existingClient.updatedAt)")&&actions.includes("await tx.insert(auditLogs)"));\ncheck("Existing client update validates ownership and assignments"');
fs.writeFileSync(qa,q);
console.log(alreadyHardened?"legacy client update hardening already applied":"legacy client update hardening enforced");
