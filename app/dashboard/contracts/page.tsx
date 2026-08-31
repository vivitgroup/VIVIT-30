export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, contracts, clients, auditLogs } from "@/lib/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

const money=(n:number)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));
const CONTRACT_TYPES=["RETAINER","PROJECT","MEDIA_ONLY","FULL_SERVICE"] as const;
type ContractType=(typeof CONTRACT_TYPES)[number];
const isContractType=(value:string):value is ContractType=>CONTRACT_TYPES.some(type=>type===value);
const RENEWAL_DAYS=[7,14,30,60];

async function createContract(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(session.user.role))throw new Error("Unauthorized");
  const workspaceId=String(session.user.workspaceId||"").trim(),userId=String(session.user.id||"").trim();
  if(!workspaceId||!userId)throw new Error("Workspace unavailable");
  const clientId=String(fd.get("clientId")||"");
  const title=String(fd.get("title")||"").trim().slice(0,140);
  const startDateRaw=String(fd.get("startDate")||"");
  const endDateRaw=String(fd.get("endDate")||"");
  const type=String(fd.get("type")||"RETAINER");
  const value=Number(fd.get("value")||0);
  const renewalDays=Number(fd.get("renewalDays")||30);
  if(!clientId||!title||!startDateRaw||!endDateRaw)throw new Error("Complete the required contract fields");
  if(!isContractType(type)) throw new Error("Invalid contract type");
  if(!Number.isFinite(value)||value<0) throw new Error("Contract value must be zero or greater");
  if(!RENEWAL_DAYS.includes(renewalDays)) throw new Error("Invalid renewal alert period");
  const startDate=new Date(startDateRaw),endDate=new Date(endDateRaw);
  if(Number.isNaN(startDate.getTime())||Number.isNaN(endDate.getTime())) throw new Error("Invalid contract dates");
  if(endDate<=startDate) throw new Error("Contract end date must be after the start date");
  const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
  if(!client) throw new Error("Selected client does not exist in this workspace");
  const notes=String(fd.get("notes")||"").trim().slice(0,1000)||null,autoRenew=String(fd.get("autoRenew"))==="true";
  await db.transaction(async tx=>{
    const [freshClient]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
    if(!freshClient)throw new Error("Selected client is no longer active in this workspace");
    const [contract]=await tx.insert(contracts).values({clientId,title,type,value,startDate,endDate,autoRenew,renewalDays,status:"ACTIVE",notes}).returning({id:contracts.id});
    await tx.insert(auditLogs).values({workspaceId,userId,action:"contract_created",entity:"contracts",entityId:contract.id,newValues:JSON.stringify({clientId,title,type,value,startDate:startDate.toISOString(),endDate:endDate.toISOString(),autoRenew,renewalDays})});
  });
  const {revalidatePath}=await import("next/cache");
  revalidatePath("/dashboard/contracts");
}

export default async function ContractsPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  if(![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(session.user.role))redirect("/dashboard");
  const workspaceId=String(session.user.workspaceId||"").trim();if(!workspaceId)redirect("/login?reason=workspace_missing");

  const allClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).orderBy(clients.companyName);
  const clientIds=allClients.map(c=>c.id);
  const allContracts=clientIds.length?await db.select().from(contracts).where(inArray(contracts.clientId,clientIds)).orderBy(desc(contracts.endDate)):[];
  const clientMap=Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));
  const now=new Date();
  const active=allContracts.filter(c=>c.status==="ACTIVE");
  const expiring=active.filter(c=>{const d=Math.ceil((new Date(c.endDate).getTime()-now.getTime())/86400000);return d>=0&&d<=30});
  const totalValue=active.reduce((s,c)=>s+Number(c.value||0),0);
  const autoRenew=active.filter(c=>c.autoRenew).length;
  const badge=(status:string)=>status==="ACTIVE"?"badge-green":status==="CANCELLED"?"badge-red":status==="RENEWED"?"badge-blue":"badge-gray";

  return <div className="contracts-page"><style>{`
    .contracts-page{display:flex;flex-direction:column;gap:18px;min-width:0}.contracts-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.contract-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.contract-kpi{padding:16px;border:1px solid var(--card-border);border-radius:15px;background:var(--card-bg);box-shadow:var(--shadow-sm)}.contract-kpi span{display:block;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em}.contract-kpi strong{display:block;margin-top:6px;font:800 22px Sora,sans-serif;color:var(--text-primary)}.contract-alert{border:1px solid var(--amber-border);background:var(--amber-bg);border-radius:14px;padding:14px 16px}.contract-alert h3{font-size:13px;color:var(--text-primary);margin-bottom:8px}.contract-alert-list{display:flex;gap:8px;flex-wrap:wrap}.contract-alert-pill{font-size:11px;font-weight:700;color:var(--amber);background:var(--card-bg);border:1px solid var(--amber-border);padding:6px 9px;border-radius:999px}.contract-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.contract-form .span-2{grid-column:1/-1}.contract-table{overflow-x:auto}.contract-table table{min-width:880px}.contract-empty{text-align:center;padding:42px 20px;color:var(--text-muted)}@media(max-width:800px){.contract-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.contract-form{grid-template-columns:1fr}.contract-form .span-2{grid-column:auto}.contracts-head .btn{width:100%;justify-content:center}}@media(max-width:480px){.contract-kpis{grid-template-columns:1fr}}
  `}</style>
    <div className="contracts-head"><div><h1 className="page-title">Contracts</h1><p className="page-subtitle">Active agreements, values and renewal dates</p></div><Link href="/dashboard/finance" className="btn btn-ghost" style={{textDecoration:"none"}}>Finance →</Link></div>

    <div className="contract-kpis">
      <div className="contract-kpi"><span>Active contracts</span><strong>{active.length}</strong></div>
      <div className="contract-kpi"><span>Expiring in 30 days</span><strong>{expiring.length}</strong></div>
      <div className="contract-kpi"><span>Active contract value</span><strong>{money(totalValue)}</strong></div>
      <div className="contract-kpi"><span>Auto renew</span><strong>{autoRenew}</strong></div>
    </div>

    {expiring.length>0&&<div className="contract-alert"><h3>⚠️ Contracts requiring renewal attention</h3><div className="contract-alert-list">{expiring.map(c=>{const days=Math.ceil((new Date(c.endDate).getTime()-now.getTime())/86400000);return <span key={c.id} className="contract-alert-pill">{clientMap[c.clientId]||"Client"} · {days}d left</span>})}</div></div>}

    <details className="card"><summary className="card-title" style={{cursor:"pointer",listStyle:"none"}}>＋ Add contract</summary><div className="card-body" style={{paddingInline:0,paddingBottom:0}}><form action={createContract} className="contract-form">
      <div><label className="form-label">Client *</label><select name="clientId" required className="form-select"><option value="">Select client…</option>{allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}</select></div>
      <div><label className="form-label">Title *</label><input name="title" required maxLength={140} className="form-input" placeholder="Annual retainer"/></div>
      <div><label className="form-label">Type</label><select name="type" className="form-select">{CONTRACT_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
      <div><label className="form-label">Contract value (EGP)</label><input name="value" type="number" min="0" step="1" className="form-input" placeholder="35000"/></div>
      <div><label className="form-label">Start date *</label><input name="startDate" type="date" required className="form-input"/></div>
      <div><label className="form-label">End date *</label><input name="endDate" type="date" required className="form-input"/></div>
      <div><label className="form-label">Renewal alert</label><select name="renewalDays" defaultValue="30" className="form-select"><option value="7">7 days before</option><option value="14">14 days before</option><option value="30">30 days before</option><option value="60">60 days before</option></select></div>
      <div><label className="form-label">Auto renew</label><select name="autoRenew" className="form-select"><option value="false">No</option><option value="true">Yes</option></select></div>
      <div className="span-2"><label className="form-label">Notes</label><textarea name="notes" rows={3} maxLength={1000} className="form-input" placeholder="Commercial or renewal notes"/></div>
      <div className="span-2"><button type="submit" className="btn btn-primary">Save contract</button></div>
    </form></div></details>

    <div className="card"><div className="card-header"><p className="card-title">All contracts</p><span className="badge badge-gray">{allContracts.length}</span></div><div className="card-body-flush contract-table">{allContracts.length===0?<div className="contract-empty"><div style={{fontSize:34}}>📋</div><strong>No contracts recorded</strong><p style={{fontSize:12,marginTop:4}}>Add the first agreement above when it is signed.</p></div>:<table className="data-table"><thead><tr><th>Client</th><th>Contract</th><th>Type</th><th>Value</th><th>Start</th><th>End</th><th>Renewal</th><th>Status</th></tr></thead><tbody>{allContracts.map(c=>{const days=Math.ceil((new Date(c.endDate).getTime()-now.getTime())/86400000);return <tr key={c.id}><td style={{fontWeight:750}}>{clientMap[c.clientId]||"—"}</td><td>{c.title}</td><td>{String(c.type).replace(/_/g," ")}</td><td style={{fontWeight:750}}>{money(Number(c.value||0))}</td><td>{new Date(c.startDate).toLocaleDateString("en-GB")}</td><td style={{color:c.status==="ACTIVE"&&days<=30?"var(--amber)":"inherit",fontWeight:c.status==="ACTIVE"&&days<=30?700:500}}>{new Date(c.endDate).toLocaleDateString("en-GB")}{c.status==="ACTIVE"&&days>=0&&days<=30?` · ${days}d`:""}</td><td>{c.autoRenew?"Auto":"Manual"}</td><td><span className={`badge ${badge(c.status)}`}>{c.status}</span></td></tr>})}</tbody></table>}</div></div>
  </div>;
}