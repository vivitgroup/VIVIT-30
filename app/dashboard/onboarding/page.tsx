export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, onboardingProgress, auditLogs, sql } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";

const STEPS = [
  { id:"contract",     label:"Contract Signed",            category:"Legal",      icon:"📝", desc:"Client contract signed and filed" },
  { id:"access",       label:"Ad Account Access",          category:"Tech",       icon:"🔑", desc:"Meta, TikTok, Google access granted" },
  { id:"assets",       label:"Brand Assets Received",      category:"Creative",   icon:"🎨", desc:"Logo, fonts, brand guidelines received" },
  { id:"brief",        label:"Client Brief Completed",     category:"Strategy",   icon:"📋", desc:"Full brief and goals documented" },
  { id:"kickoff",      label:"Kickoff Call Done",          category:"Management", icon:"📞", desc:"Kickoff call with all stakeholders done" },
  { id:"portal",       label:"Client Portal Setup",        category:"Tech",       icon:"💻", desc:"Client login created and portal tested" },
  { id:"tracking",     label:"Pixel/Tracking Installed",   category:"Tech",       icon:"📡", desc:"Conversion tracking setup and verified" },
  { id:"first_task",   label:"First Creative Task",        category:"Creative",   icon:"🎬", desc:"First creative task created and assigned" },
  { id:"first_report", label:"First Report Sent",          category:"Reporting",  icon:"📊", desc:"First performance report delivered" },
  { id:"nps_baseline", label:"Baseline NPS Collected",     category:"Management", icon:"⭐", desc:"Initial satisfaction score from client" },
];

const CATEGORY_COLOR: Record<string,string> = {
  Legal:"#8b5cf6", Tech:"#244D87", Creative:"#ec4899",
  Strategy:"#f59e0b", Management:"#10b981", Reporting:"#00B4D8",
};

async function toggleStep(clientId: string, stepId: string, completed: boolean) {
  "use server";
  const { auth: getAuth } = await import("@/lib/auth");
  const { db, onboardingProgress, clients } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const session = await getAuth();
  const role = session?.user?.role as Role | undefined;
  if (!session?.user || ![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role!)) throw new Error("Unauthorized");
  if (!STEPS.some(step => step.id === stepId)) throw new Error("Invalid onboarding step");
  const userId = String(session.user.id||""), workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId||!userId)throw new Error("Workspace unavailable");
  if (role === Role.ACCOUNT_MANAGER) {
    const [ownedClient] = await db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, clientId),eq(clients.workspaceId,workspaceId),eq(clients.accountManagerId, userId), eq(clients.isActive, true))).limit(1);
    if (!ownedClient) throw new Error("Forbidden");
  } else {
    const [existingClient] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
    if (!existingClient) throw new Error("Client not found");
  }
  const lockKey=`onboarding-ui:${clientId}:${stepId}`;
  await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const [existing]=await tx.select().from(onboardingProgress).where(and(eq(onboardingProgress.clientId,clientId),eq(onboardingProgress.stepId,stepId))).limit(1);
    const values={completed,completedAt:completed?new Date():null,completedBy:completed?userId:null};
    let entityId:string;
    if(existing){await tx.update(onboardingProgress).set(values).where(and(eq(onboardingProgress.id,existing.id),eq(onboardingProgress.clientId,clientId)));entityId=existing.id}else{const [created]=await tx.insert(onboardingProgress).values({clientId,stepId,...values}).returning({id:onboardingProgress.id});entityId=created.id}
    await tx.insert(auditLogs).values({workspaceId,userId,action:"onboarding_step_updated",entity:"onboarding_progress",entityId,newValues:JSON.stringify({clientId,stepId,completed,source:"dashboard"})});
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/onboarding");
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");

  const userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)redirect("/login?reason=workspace_missing");
  const allClients = await db.select({ id: clients.id, companyName: clients.companyName, createdAt: clients.createdAt })
    .from(clients).where(role === Role.ACCOUNT_MANAGER
      ? and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true), eq(clients.accountManagerId, userId))
      : and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true))).orderBy(clients.createdAt);

  const clientIds = allClients.map(c => c.id);
  const allProgress = clientIds.length
    ? await db.select().from(onboardingProgress).where(inArray(onboardingProgress.clientId, clientIds))
    : [];
  
  const progressMap: Record<string, Record<string, boolean>> = {};
  for (const p of allProgress) {
    if (!progressMap[p.clientId]) progressMap[p.clientId] = {};
    progressMap[p.clientId][p.stepId] = p.completed;
  }

  const getCompletionPct = (clientId: string) => {
    const prg = progressMap[clientId] ?? {};
    const done = STEPS.filter(s => prg[s.id]).length;
    return Math.round((done/STEPS.length)*100);
  };

  const newClients = allClients.filter(c => getCompletionPct(c.id) < 100);
  const fullyOnboarded = allClients.filter(c => getCompletionPct(c.id) === 100);

  return (
    <div className="max-w-5xl space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">✅ Client Onboarding</h1>
          <p className="text-sm text-[#6B8FAF] mt-1">{newClients.length} in progress · {fullyOnboarded.length} fully onboarded</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {l:"Total Clients",   v:allClients.length,      c:"#244D87"},
          {l:"In Progress",     v:newClients.length,       c:"#f59e0b"},
          {l:"Fully Onboarded", v:fullyOnboarded.length,   c:"#10b981"},
        ].map(k=>(
          <div key={k.l} className="card-vivit text-center py-4">
            <p className="text-3xl font-black" style={{color:k.c}}>{k.v}</p>
            <p className="text-xs text-[#6B8FAF] mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      {allClients.map(client=>{
        const prg = progressMap[client.id] ?? {};
        const done = STEPS.filter(s=>prg[s.id]).length;
        const pct  = Math.round((done/STEPS.length)*100);
        const isComplete = pct === 100;
        return (
          <div key={client.id} className="card" style={{border:isComplete?"1px solid rgba(16,185,129,0.2)":undefined}}>
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>{client.companyName.slice(0,2).toUpperCase()}</div><div><p className="font-bold">{client.companyName}</p><p className="text-xs text-[#6B8FAF]">Client since {new Date(client.createdAt).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}</p></div></div><div className="text-right"><p className="text-2xl font-black" style={{color:isComplete?"#10b981":pct>=60?"#244D87":"#f59e0b"}}>{pct}%</p><p className="text-xs text-[#6B8FAF]">{done}/{STEPS.length} steps</p></div></div>
            <div className="h-2 rounded-full bg-white/10 mb-4"><div className="h-2 rounded-full transition-all" style={{width:`${pct}%`,background:isComplete?"#10b981":"linear-gradient(90deg,#244D87,#00B4D8)"}}/></div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{STEPS.map(step=>{const isDone=prg[step.id]===true;return <form key={step.id} action={async()=>{"use server";await toggleStep(client.id,step.id,!isDone);}}><button type="submit" className="w-full p-2.5 rounded-xl border transition-all text-left" style={{background:isDone?`${CATEGORY_COLOR[step.category]}12`:"rgba(255,255,255,0.02)",border:isDone?`1px solid ${CATEGORY_COLOR[step.category]}30`:"1px solid rgba(255,255,255,0.06)"}}><div className="flex items-center gap-1.5 mb-1"><span className="text-base">{isDone?"✅":step.icon}</span><span className="text-[10px] font-bold" style={{color:CATEGORY_COLOR[step.category]}}>{step.category}</span></div><p className="text-xs font-semibold leading-tight" style={{color:isDone?"#E8F4FD":"#6B8FAF"}}>{step.label}</p></button></form>})}</div>
            {isComplete&&<div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{background:"rgba(16,185,129,0.08)"}}><span className="text-sm">🎉</span><p className="text-xs text-green-400 font-semibold">Client fully onboarded! Ready for full service.</p></div>}
          </div>
        );
      })}

      <div className="card"><h2 className="font-semibold mb-4">🚀 Client Onboarding Process (ERP View)</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><p className="text-xs font-semibold text-[#244D87] uppercase tracking-wider mb-3">Phase 1 — Legal & Contract</p><div className="space-y-2">{[
          {step:"Service Agreement drafted",icon:"📄",tip:"Use contract template from /dashboard/contracts"},{step:"Contract signed by client",icon:"✍️",tip:"Digital signature via approval token email"},{step:"Payment terms agreed",icon:"💳",tip:"Set retainer + media budget in client profile"},{step:"Invoice schedule configured",icon:"🧾",tip:"Set up recurring invoice in Settings"},
        ].map(s=><div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"><span className="text-xl flex-shrink-0">{s.icon}</span><div><p className="text-sm font-semibold">{s.step}</p><p className="text-[11px] text-[#3D5577] mt-0.5">{s.tip}</p></div></div>)}</div></div>
        <div><p className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider mb-3">Phase 2 — Technical Setup</p><div className="space-y-2">{[
          {step:"Ad accounts access granted",icon:"📱",tip:"Meta, TikTok, Google, Snapchat — add links to client profile"},{step:"Brand assets received",icon:"🎨",tip:"Logo, colors, fonts — store in client color_palette field"},{step:"Client portal account created",icon:"👤",tip:"Create CLIENT user → linked to client record via userId"},{step:"Kickoff meeting scheduled",icon:"📅",tip:"Add to content calendar + log in communication log"},
        ].map(s=><div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"><span className="text-xl flex-shrink-0">{s.icon}</span><div><p className="text-sm font-semibold">{s.step}</p><p className="text-[11px] text-[#3D5577] mt-0.5">{s.tip}</p></div></div>)}</div></div>
        <div><p className="text-xs font-semibold text-[#10b981] uppercase tracking-wider mb-3">Phase 3 — Operations Start</p><div className="space-y-2">{[
          {step:"First creative tasks created",icon:"🎬",tip:"Use templates in /dashboard/creative/new"},{step:"Media buying campaigns launched",icon:"📣",tip:"Add first metrics entry in /dashboard/media"},{step:"Content calendar populated",icon:"📅",tip:"Schedule first month of posts"},{step:"Client NPS baseline set",icon:"⭐",tip:"Send NPS form via Client Portal on day 30"},
        ].map(s=><div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"><span className="text-xl flex-shrink-0">{s.icon}</span><div><p className="text-sm font-semibold">{s.step}</p><p className="text-[11px] text-[#3D5577] mt-0.5">{s.tip}</p></div></div>)}</div></div>
        <div><p className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider mb-3">Phase 4 — 30-Day Review</p><div className="space-y-2">{[
          {step:"First monthly report sent",icon:"📊",tip:"Generate from /dashboard/monthly-reports"},{step:"Performance score calculated",icon:"🏥",tip:"Run health score from Settings"},{step:"Churn risk assessed",icon:"🚨",tip:"Check churn probability in client detail"},{step:"Contract review scheduled",icon:"📋",tip:"Set calendar reminder 90 days before contract end"},
        ].map(s=><div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"><span className="text-xl flex-shrink-0">{s.icon}</span><div><p className="text-sm font-semibold">{s.step}</p><p className="text-[11px] text-[#3D5577] mt-0.5">{s.tip}</p></div></div>)}</div></div>
      </div></div>

      <div className="card" style={{background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,119,182,0.04))",border:"1px solid rgba(16,185,129,0.2)"}}><h2 className="font-semibold text-green-400 mb-1">🚀 Quick Start — New Agency Setup</h2><p className="text-xs text-muted mb-4">Complete these 5 steps in 30 minutes to go from 0 to fully operational</p><div className="space-y-3 mb-4">{[
        {n:1,icon:"🏢",task:"Add your first client",action:"Add Client",href:"/dashboard/clients/new",time:"5 min",tip:"Start with your most important existing client"},{n:2,icon:"📣",task:"Enter first month ad metrics",action:"Add Metrics",href:"/dashboard/media",time:"5 min",tip:"Add spend, leads, revenue for last month"},{n:3,icon:"🎨",task:"Create your first creative task",action:"New Task",href:"/dashboard/creative/new",time:"5 min",tip:"Use a template — brief auto-fills in seconds"},{n:4,icon:"💰",task:"Set up first invoice",action:"Go to Finance",href:"/dashboard/finance",time:"5 min",tip:"Add monthly retainer as your first finance record"},{n:5,icon:"👥",task:"Invite a team member",action:"Invite Team",href:"/dashboard/settings",time:"2 min",tip:"Add your Account Manager or Media Buyer first"},
      ].map(step=><div key={step.n} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02]"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{background:"linear-gradient(135deg,#17345F,#244D87)"}}>{step.n}</div><div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-lg">{step.icon}</span><p className="font-semibold text-sm">{step.task}</p><span className="badge badge-muted text-[9px]">{step.time}</span></div><p className="text-[11px] text-muted">💡 {step.tip}</p></div><a href={step.href} className="btn-grad text-xs py-1.5 px-3 flex-shrink-0" style={{textDecoration:"none"}}>{step.action} →</a></div>)}</div>
        <div className="grid grid-cols-3 gap-3 mb-4">{[{label:"After Step 1-2",desc:"You'll have: Client profile + Media KPIs (ROAS, CAC, CPL) showing live"},{label:"After Step 3",desc:"You'll have: Creative workflow active, tasks visible to creators"},{label:"After Step 4-5",desc:"You'll have: Invoice tracking, team onboarded, ready for clients"}].map(m=><div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5"><p className="text-xs font-semibold text-green-400 mb-1">{m.label}</p><p className="text-[10px] text-muted">{m.desc}</p></div>)}</div><div className="p-3 rounded-xl bg-white/[0.02] border border-white/5"><p className="text-xs font-semibold text-[#244D87]">📞 Need help? Book a 30-min setup call with the Vivit team →</p></div>
      </div>
    </div>
  );
}
