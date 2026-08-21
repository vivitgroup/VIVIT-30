// @ts-nocheck -- Drizzle's generated client shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, mediaMetrics, creativeTasks, financeRecords, contacts, salesActivities, salesLeads, onboardingProgress } from "@/lib/db";
import { eq, and, gte, desc, sum, count } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

async function logActivity(clientId: string, fd: FormData) {
  "use server";
  const {auth:getAuth}=await import("@/lib/auth");
  const {db,salesActivities,salesLeads}=await import("@/lib/db");
  const {eq}=await import("drizzle-orm");
  const session=await getAuth();
  if(!session?.user) return;
  // Find or create a lead for this client
  const [lead]=await db.select().from(salesLeads).where(eq(salesLeads.clientId,clientId)).limit(1);
  const leadId=lead?.id||clientId;
  await db.insert(salesActivities).values({
    leadId, userId:session.user.id!,
    type:fd.get("type") as string,
    notes:fd.get("notes") as string||null,
    outcome:fd.get("outcome") as string||null,
    nextActionDate:fd.get("nextDate")? new Date(fd.get("nextDate") as string):null,
  });
  const {revalidatePath}=await import("next/cache");
  revalidatePath(`/dashboard/clients/${clientId}`);
}

async function updateClient(id: string, fd: FormData) {
  "use server";
  const {db,clients}=await import("@/lib/db");
  const {eq}=await import("drizzle-orm");
  await db.update(clients).set({
    companyName:fd.get("companyName") as string,
    industry:fd.get("industry") as string||null,
    website:fd.get("website") as string||null,
    monthlyRetainer:parseFloat(fd.get("monthlyRetainer") as string)||0,
    mediaBudget:parseFloat(fd.get("mediaBudget") as string)||0,
    internalNotes:fd.get("notes") as string||null,
    updatedAt:new Date(),
  }).where(eq(clients.id,id));
  const {revalidatePath}=await import("next/cache");
  revalidatePath(`/dashboard/clients/${id}`);
}

export default async function ClientDetailPage({params}:{params:Promise<{id:string}>}) {
  const session=await auth();
  if(!session?.user) redirect("/login");
  const role=(session.user as any).role as Role;
  if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER].includes(role)) redirect("/dashboard");

  const {id}=await params;
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const isManager=[Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(role);

  const [client,tasks,invoices,allMetrics,contactList,activities]=await Promise.all([
    db.select().from(clients).where(eq(clients.id,id)).then(r=>r[0]),
    db.select().from(creativeTasks).where(eq(creativeTasks.clientId,id)).orderBy(desc(creativeTasks.updatedAt)).limit(20),
    db.select().from(financeRecords).where(and(eq(financeRecords.clientId,id),eq(financeRecords.year,now.getFullYear()))).orderBy(desc(financeRecords.month)).limit(12),
    db.select({adSpend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),revenue:sum(mediaMetrics.revenue),purchases:sum(mediaMetrics.purchases)}).from(mediaMetrics).where(and(eq(mediaMetrics.clientId,id),gte(mediaMetrics.date,monthStart))),
    db.select().from(contacts).where(eq(contacts.clientId,id)).orderBy(contacts.isPrimary),
    db.select().from(salesActivities).where(eq(salesActivities.leadId,id)).orderBy(desc(salesActivities.createdAt)).limit(15),
  ]);

  if(!client) redirect("/dashboard/clients");

  const spend  =Number(allMetrics[0]?.adSpend??0);
  const leads  =Number(allMetrics[0]?.leads??0);
  const rev    =Number(allMetrics[0]?.revenue??0);
  const purch  =Number(allMetrics[0]?.purchases??0);
  const roas   =spend>0?(rev/spend).toFixed(2):"0";
  const cac    =purch>0?formatCurrency(spend/purch):"—";
  const cpl    =leads>0?formatCurrency(spend/leads):"—";
  const totalPaid=invoices.reduce((s,r)=>s+r.paid,0);
  const totalRev =invoices.reduce((s,r)=>s+r.totalRevenue,0);
  const collRate =totalRev>0?Math.round((totalPaid/totalRev)*100):0;
  const pending=tasks.filter(t=>["REVIEW"].includes(t.status)).length;
  const done   =tasks.filter(t=>["APPROVED","COMPLETED"].includes(t.status)).length;
  const primary=contactList.find(c=>c.isPrimary)||contactList[0];
  const RISK_C:Record<string,string>={LOW:"#10b981",MEDIUM:"#f59e0b",HIGH:"#ef4444"};
  const TYPE_ICON:Record<string,string>={REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📊",MOTION_GRAPHIC:"✨",VIDEO_EDIT:"🎥",STORY:"📱",UGC:"👤"};
  const ACT_ICON:Record<string,string>={call:"📞",email:"📧",whatsapp:"💬",meeting:"🤝",note:"📝"};
  const MONTHS=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return(
    <div className="max-w-6xl space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
          {client.companyName.slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{client.companyName}</h1>
            <span className="badge text-xs font-bold px-2 py-1" style={{background:`${RISK_C[client.churnRisk]}15`,color:RISK_C[client.churnRisk]}}>{client.churnRisk} RISK</span>
            <span className="badge bg-blue-500/10 text-blue-400 text-xs">Health {client.healthScore}%</span>
            {(client as any).performanceScore&&<span className="badge bg-purple-500/10 text-purple-400 text-xs">Score {Math.round((client as any).performanceScore)}%</span>}
            {client.churnProbability>0.5&&<span className="badge bg-red-500/10 text-red-400 text-xs">⚠️ Churn {Math.round(client.churnProbability*100)}%</span>}
          </div>
          <div className="flex gap-3 mt-1 flex-wrap text-sm text-[#6B8FAF]">
            {client.industry&&<span>🏭 {client.industry}</span>}
            {client.website&&<a href={client.website} target="_blank" className="text-[#244D87] hover:underline">🌐 Website</a>}
            {client.lifetimeValue>0&&<span className="text-purple-400 font-semibold">💰 LTV {formatCurrency(client.lifetimeValue)}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {primary?.whatsapp&&<a href={`https://wa.me/${primary.whatsapp.replace(/\D/g,"")}`} target="_blank" className="text-xs px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold" style={{textDecoration:"none"}}>💬 WhatsApp</a>}
          {primary?.email&&<a href={`mailto:${primary.email}`} className="text-xs px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold" style={{textDecoration:"none"}}>📧 Email</a>}
          <Link href={`/dashboard/creative/new?clientId=${id}`} className="btn-grad text-xs py-1.5" style={{textDecoration:"none"}}>+ New Task</Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          {l:"Ad Spend MTD", v:formatCurrency(spend),    c:"#244D87"},
          {l:"Revenue MTD",  v:formatCurrency(rev),      c:"#10b981"},
          {l:"ROAS",         v:`${roas}x`,               c:parseFloat(roas)>=2?"#10b981":"#f59e0b"},
          {l:"CAC",          v:cac,                      c:"#ec4899"},
          {l:"CPL",          v:cpl,                      c:"#f59e0b"},
          {l:"Collection",   v:`${collRate}%`,           c:collRate>=80?"#10b981":collRate>=60?"#f59e0b":"#ef4444"},
        ].map(k=>(
          <div key={k.l} className="card-vivit !p-3">
            <p className="text-lg font-bold" style={{color:k.c}}>{k.v}</p>
            <p className="text-[11px] text-[#6B8FAF] mt-0.5">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — tasks + invoices */}
        <div className="lg:col-span-2 space-y-4">

          {/* Recent Tasks */}
          <div className="card-vivit !p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center">
              <span className="font-semibold text-sm">🎨 Tasks {pending>0&&<span className="ml-1 badge bg-yellow-500/10 text-yellow-400 text-[10px]">{pending} in review</span>}</span>
              <Link href={`/dashboard/creative/new?clientId=${id}`} className="text-xs text-[#244D87] hover:text-[#00B4D8]" style={{textDecoration:"none"}}>+ Create Task</Link>
            </div>
            {tasks.slice(0,8).map(t=>(
              <Link key={t.id} href={`/dashboard/creative/${t.id}`} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors" style={{textDecoration:"none"}}>
                <span className="text-lg">{TYPE_ICON[t.type]??""}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#E8F4FD]">{t.title}</p>
                  <p className="text-xs text-[#3D5577]">Due {new Date(t.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}{t.revisionCount>0&&` · ${t.revisionCount} revisions`}</p>
                </div>
                <span className={`badge text-[10px] ${t.status==="APPROVED"||t.status==="COMPLETED"?"bg-green-500/10 text-green-400":t.status==="REVIEW"?"bg-yellow-500/10 text-yellow-400":t.status==="REVISION"?"bg-orange-500/10 text-orange-400":"bg-blue-500/10 text-blue-400"}`}>{t.status}</span>
              </Link>
            ))}
            {tasks.length===0&&<p className="text-sm text-[#3D5577] px-5 py-4">No tasks yet.</p>}
          </div>

          {/* Invoices */}
          <div className="card-vivit !p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 font-semibold text-sm">💰 Invoices {now.getFullYear()}</div>
            {invoices.map(r=>(
              <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03] last:border-0">
                <div><p className="text-sm font-semibold">{MONTHS[r.month]} {r.year}</p><p className="text-xs text-[#6B8FAF]">{formatCurrency(r.totalRevenue)}</p></div>
                <div className="flex items-center gap-2">
                  <span className={`badge text-[10px] ${r.outstanding===0?"bg-green-500/10 text-green-400":r.paid>0?"bg-yellow-500/10 text-yellow-400":"bg-red-500/10 text-red-400"}`}>{r.outstanding===0?"Paid":r.paid>0?"Partial":"Unpaid"}</span>
                  {r.outstanding>0&&<span className="text-xs text-red-400">{formatCurrency(r.outstanding)}</span>}
                  <a href={`/api/pdf-report/${id}?month=${r.month}&year=${r.year}`} target="_blank" className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" style={{textDecoration:"none"}}>PDF</a>
                </div>
              </div>
            ))}
            {invoices.length===0&&<p className="text-sm text-[#3D5577] px-5 py-4">No invoices this year.</p>}
          </div>
        </div>

        {/* Right — contacts + comm log + notes */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* Contacts */}
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">📋 Contacts</h2>
            {contactList.map(ct=>(
              <div key={ct.id} className="py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{ct.name}{ct.isPrimary&&<span className="ml-1 text-[10px] text-[#244D87]">● Primary</span>}</p>
                    {ct.title&&<p className="text-xs text-[#6B8FAF]">{ct.title}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {ct.phone&&<a href={`tel:${ct.phone}`} className="text-[11px] text-[#244D87]">📞 {ct.phone}</a>}
                  {ct.whatsapp&&<a href={`https://wa.me/${ct.whatsapp.replace(/\D/g,"")}`} target="_blank" className="text-[11px] text-green-400">💬 WA</a>}
                  {ct.email&&<a href={`mailto:${ct.email}`} className="text-[11px] text-blue-400">📧</a>}
                </div>
              </div>
            ))}
            {contactList.length===0&&<p className="text-xs text-[#3D5577]">No contacts yet.</p>}
          </div>

          {/* Communication Log */}
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">💬 Communication Log</h2>
            {isManager&&(
              <details className="mb-3">
                <summary className="text-xs text-[#244D87] cursor-pointer">+ Log Activity</summary>
                <form action={async(fd)=>{"use server";await logActivity(id,fd);}} className="mt-2 space-y-2">
                  <select name="type" className="vivit-input text-sm">
                    {["call","email","whatsapp","meeting","note"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                  <input name="outcome" placeholder="Outcome (e.g. interested, callback)" className="vivit-input text-sm"/>
                  <textarea name="notes" rows={2} placeholder="Notes…" className="vivit-input text-sm resize-none"/>
                  <input name="nextDate" type="datetime-local" className="vivit-input text-sm"/>
                  <button type="submit" className="btn-grad text-xs w-full justify-center">Log</button>
                </form>
              </details>
            )}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activities.map(a=>(
                <div key={a.id} className="text-xs border-l-2 pl-3 py-1" style={{borderColor:"rgba(0,119,182,0.3)"}}>
                  <div className="flex items-center gap-2 text-[#6B8FAF] mb-0.5">
                    <span>{ACT_ICON[a.type]??""}</span>
                    <span className="capitalize font-semibold">{a.type}</span>
                    <span className="text-[#3D5577]">{new Date(a.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                  </div>
                  {a.notes&&<p className="text-[#E8F4FD]">{a.notes}</p>}
                  {a.outcome&&<p className="text-green-400">→ {a.outcome}</p>}
                </div>
              ))}
              {activities.length===0&&<p className="text-xs text-[#3D5577]">No activity logged yet.</p>}
            </div>
          </div>

          {/* Client Info + Notes */}
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">ℹ️ Client Info</h2>
            <div className="space-y-2 text-sm">
              {[
                {l:"Retainer",  v:formatCurrency(client.monthlyRetainer)+"/mo"},
                {l:"Ad Budget", v:formatCurrency(client.mediaBudget)+"/mo"},
                {l:"LTV",       v:client.lifetimeValue>0?formatCurrency(client.lifetimeValue):"—"},
                {l:"Currency",  v:client.currency},
                {l:"Contract",  v:client.contractEnd?`Ends ${new Date(client.contractEnd).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"})}`:"—"},
              ].map(k=>(
                <div key={k.l} className="flex justify-between border-b border-white/5 pb-1.5 last:border-0">
                  <span className="text-[#6B8FAF]">{k.l}</span>
                  <span className="font-semibold">{k.v}</span>
                </div>
              ))}
            </div>
            {client.internalNotes&&(
              <div className="mt-3 p-2 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-[#6B8FAF] font-semibold uppercase tracking-wider mb-1">Internal Notes</p>
                <p className="text-xs text-[#E8F4FD]">{client.internalNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Feature 28: Client Growth Tracking ═══ */}
      <div className="card">
        <h2 className="font-semibold mb-4">📈 Client Growth Timeline</h2>
        <div className="relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10"/>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {[
              {date:"Month 1",   event:"Starter Package",   value:client.monthlyRetainer*0.5,      icon:"🚀",color:"#244D87"},
              {date:"Month 3",   event:"First NPS Survey",  value:null,                             icon:"⭐",color:"#8b5cf6"},
              {date:"Month 4",   event:"Package Upgrade",   value:client.monthlyRetainer*0.75,      icon:"⬆️",color:"#10b981"},
              {date:"Month 6",   event:"Strategy Session",  value:null,                             icon:"🤝",color:"#f59e0b"},
              {date:"Today",     event:"Current Package",   value:client.monthlyRetainer,           icon:"💰",color:"#10b981"},
            ].map((item,i)=>(
              <div key={i} className="flex gap-4 items-start">
                <div className="absolute left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-10"
                  style={{background:item.color,marginTop:"2px"}}>·</div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-semibold text-sm">{item.event}</span>
                    {item.value && <span className="badge badge-success text-[10px]">${item.value.toLocaleString()}/mo</span>}
                    <span className="text-[10px] text-dim ml-auto">{item.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-sm">
          <span className="text-muted">Total Growth</span>
          <span className="font-bold text-green-400">+{Math.round(((client.monthlyRetainer/(client.monthlyRetainer*0.5))-1)*100)}% MoM avg</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">Lifetime Value</span>
          <span className="font-bold grad-text">${(client.lifetimeValue??0).toLocaleString()}</span>
        </div>
      </div>

    </div>
  );
}
