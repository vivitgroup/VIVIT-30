export const dynamic="force-dynamic";
import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {auth} from "@/lib/auth";
import {db,clients,users,auditLogs} from "@/lib/db";
import {and,eq,inArray,ilike} from "drizzle-orm";
import {Role} from "@/lib/types";

const clean=(v:FormDataEntryValue|null,n=500)=>String(v||"").trim().slice(0,n);
const numberValue=(v:FormDataEntryValue|null)=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?n:0};
const dateValue=(v:FormDataEntryValue|null)=>{const s=String(v||"");if(!s)return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d};

async function saveClient(clientId:string,fd:FormData){
  "use server";
  const session=await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const role=(session.user as any).role as Role;
  const userId=String((session.user as any).id);
  if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(role))throw new Error("Forbidden");

  const [existing]=await db.select().from(clients).where(and(eq(clients.id,clientId),eq(clients.isActive,true))).limit(1);
  if(!existing)throw new Error("Client not found");
  if(role===Role.ACCOUNT_MANAGER&&existing.accountManagerId!==userId)throw new Error("Client access denied");

  const companyName=clean(fd.get("companyName"),160);
  if(companyName.length<2)throw new Error("Company name is required");
  const duplicate=await db.select({id:clients.id}).from(clients).where(and(ilike(clients.companyName,companyName),eq(clients.workspaceId,existing.workspaceId))).limit(2);
  if(duplicate.some(x=>x.id!==clientId))throw new Error("A client with this company name already exists");

  const contractStart=dateValue(fd.get("contractStart"));
  const contractEnd=dateValue(fd.get("contractEnd"));
  if(contractStart&&contractEnd&&contractEnd<contractStart)throw new Error("Contract end date must be on or after the start date");

  let accountManagerId=existing.accountManagerId;
  let mediaBuyerId=existing.mediaBuyerId;
  if(role===Role.SUPER_ADMIN){
    accountManagerId=clean(fd.get("accountManagerId"),80)||null;
    mediaBuyerId=clean(fd.get("mediaBuyerId"),80)||null;
    if(accountManagerId){const [u]=await db.select({id:users.id}).from(users).where(and(eq(users.id,accountManagerId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true))).limit(1);if(!u)throw new Error("Choose a valid active account manager");}
    if(mediaBuyerId){const [u]=await db.select({id:users.id}).from(users).where(and(eq(users.id,mediaBuyerId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true))).limit(1);if(!u)throw new Error("Choose a valid active media buyer");}
  }

  await db.update(clients).set({
    companyName,
    industry:clean(fd.get("industry"),100)||null,
    website:clean(fd.get("website"),500)||null,
    monthlyRetainer:numberValue(fd.get("monthlyRetainer")),
    mediaBudget:numberValue(fd.get("mediaBudget")),
    contractValue:numberValue(fd.get("contractValue")),
    contractStart,
    contractEnd,
    accountManagerId,
    mediaBuyerId,
    metaAdsLink:clean(fd.get("metaAdsLink"),500)||null,
    googleAdsLink:clean(fd.get("googleAdsLink"),500)||null,
    tiktokAdsLink:clean(fd.get("tiktokAdsLink"),500)||null,
    snapchatAdsLink:clean(fd.get("snapchatAdsLink"),500)||null,
    internalNotes:clean(fd.get("internalNotes"),2000)||null,
    updatedAt:new Date(),
  } as any).where(eq(clients.id,clientId));

  await db.insert(auditLogs).values({userId,action:"client_updated",entity:"Client",entityId:clientId,newValues:JSON.stringify({companyName,accountManagerId,mediaBuyerId})} as any);
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}`);
}

const toDateInput=(v:Date|null|undefined)=>v?new Date(v).toISOString().slice(0,10):"";

export default async function EditClientPage({params}:{params:Promise<{id:string}>}){
  const session=await auth();if(!session?.user)redirect("/login");
  const role=(session.user as any).role as Role;
  const {id}=await params;
  if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(role))redirect(`/dashboard/clients/${id}`);
  const [client]=await db.select().from(clients).where(and(eq(clients.id,id),eq(clients.isActive,true))).limit(1);
  if(!client)redirect("/dashboard/clients");
  const team=role===Role.SUPER_ADMIN?await db.select({id:users.id,name:users.name,role:users.role}).from(users).where(and(eq(users.isActive,true),inArray(users.role,["ACCOUNT_MANAGER","MEDIA_BUYER"] as any))):[];
  return <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:980}}>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Link href={`/dashboard/clients/${id}`} className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>← Client workspace</Link><div><h1 className="page-title" style={{margin:0}}>Edit {client.companyName}</h1><p className="page-subtitle">Update the live client profile and ownership safely.</p></div></div>
    <form action={saveClient.bind(null,id)} style={{display:"grid",gap:14}}>
      <section className="card"><div className="card-title" style={{marginBottom:12}}>Company & contract</div><div className="form-grid"><label className="form-label">COMPANY NAME<input className="form-input" name="companyName" required minLength={2} defaultValue={client.companyName}/></label><label className="form-label">INDUSTRY<input className="form-input" name="industry" defaultValue={client.industry||""}/></label><label className="form-label">WEBSITE<input className="form-input" name="website" type="url" defaultValue={client.website||""}/></label><label className="form-label">MONTHLY RETAINER<input className="form-input" name="monthlyRetainer" type="number" min="0" step="0.01" defaultValue={client.monthlyRetainer||0}/></label><label className="form-label">MEDIA BUDGET<input className="form-input" name="mediaBudget" type="number" min="0" step="0.01" defaultValue={client.mediaBudget||0}/></label><label className="form-label">CONTRACT VALUE<input className="form-input" name="contractValue" type="number" min="0" step="0.01" defaultValue={client.contractValue||0}/></label><label className="form-label">START DATE<input className="form-input" name="contractStart" type="date" defaultValue={toDateInput(client.contractStart)}/></label><label className="form-label">END DATE<input className="form-input" name="contractEnd" type="date" defaultValue={toDateInput(client.contractEnd)}/></label></div></section>
      {role===Role.SUPER_ADMIN&&<section className="card"><div className="card-title" style={{marginBottom:12}}>Ownership</div><div className="form-grid"><label className="form-label">ACCOUNT MANAGER<select className="form-select" name="accountManagerId" defaultValue={client.accountManagerId||""}><option value="">Unassigned</option>{team.filter(x=>x.role==="ACCOUNT_MANAGER").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="form-label">MEDIA BUYER<select className="form-select" name="mediaBuyerId" defaultValue={client.mediaBuyerId||""}><option value="">Unassigned</option>{team.filter(x=>x.role==="MEDIA_BUYER").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div></section>}
      <section className="card"><div className="card-title" style={{marginBottom:12}}>Advertising & notes</div><div className="form-grid"><label className="form-label">META ADS<input className="form-input" name="metaAdsLink" type="url" defaultValue={client.metaAdsLink||""}/></label><label className="form-label">GOOGLE ADS<input className="form-input" name="googleAdsLink" type="url" defaultValue={client.googleAdsLink||""}/></label><label className="form-label">TIKTOK ADS<input className="form-input" name="tiktokAdsLink" type="url" defaultValue={client.tiktokAdsLink||""}/></label><label className="form-label">SNAPCHAT ADS<input className="form-input" name="snapchatAdsLink" type="url" defaultValue={client.snapchatAdsLink||""}/></label></div><label className="form-label" style={{marginTop:12}}>INTERNAL NOTES<textarea className="form-input" name="internalNotes" rows={5} defaultValue={client.internalNotes||""}/></label></section>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}><Link href={`/dashboard/clients/${id}`} className="btn btn-ghost" style={{textDecoration:"none"}}>Cancel</Link><button className="btn btn-primary" type="submit">Save client</button></div>
    </form>
  </div>;
}
