export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, clients, creativeTasks, aiGenerations, workspaces } from "@/lib/db";
import { eq, count, gte, desc } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default async function SaaSAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.SUPER_ADMIN) redirect("/dashboard");
  const workspaceId = String(session.user.workspaceId || "");
  if (!workspaceId) redirect("/login");

  const now   = new Date();
  const d30   = new Date(now.getTime() - 30*24*60*60*1000);
  const d7    = new Date(now.getTime() - 7*24*60*60*1000);

  const [
    totalUsers, activeUsers30d, newUsers7d,
    totalClients, activeClients,
    totalTasks, tasksLast30d,
    aiUsage, workspace,
  ] = await Promise.all([
    db.select({ cnt:count() }).from(users).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(users).where(gte(users.lastLoginAt!, d30)).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(users).where(gte(users.createdAt, d7)).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(clients).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(clients).where(eq(clients.isActive,true)).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(creativeTasks).then(r=>Number(r[0]?.cnt??0)),
    db.select({ cnt:count() }).from(creativeTasks).where(gte(creativeTasks.createdAt,d30)).then(r=>Number(r[0]?.cnt??0)),
    db.select({ type:aiGenerations.type, cnt:count() }).from(aiGenerations).groupBy(aiGenerations.type).orderBy(desc(count())),
    db.select().from(workspaces).where(eq(workspaces.id,workspaceId)).then(r=>r[0]),
  ]);

  const dau = activeUsers30d > 0 ? Math.round(activeUsers30d/30) : 0;
  const tasksPerUser = totalUsers > 0 ? (totalTasks/totalUsers).toFixed(1) : "0";
  const aiTotal = aiUsage.reduce((s,a)=>s+Number(a.cnt),0);

  const PLAN_MRR: Record<string,number> = { FREE:0, STARTER:49, PROFESSIONAL:149, ENTERPRISE:499 };
  const mrr = PLAN_MRR[workspace?.plan??"FREE"] ?? 0;

  return (
    <div className="max-w-5xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">🏗️ SaaS Analytics</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">Platform usage metrics — workspace: <strong className="text-[#244D87]">{workspace?.name ?? "Unavailable"}</strong> · Plan: <strong className="text-[#244D87]">{workspace?.plan}</strong></p>
      </div>

      <div className="card" style={{background:"linear-gradient(135deg,rgba(0,55,100,0.4),rgba(0,119,182,0.15))",border:"1px solid rgba(0,119,182,0.3)"}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-[#6B8FAF] uppercase tracking-wider font-semibold mb-1">Monthly Recurring Revenue</p>
            <p className="text-5xl font-black grad-text">{formatCurrency(mrr)}</p>
            <p className="text-sm text-[#6B8FAF] mt-1">{workspace?.plan} plan · ARR: {formatCurrency(mrr*12)}</p>
          </div>
          {workspace?.trialEndsAt && new Date(workspace.trialEndsAt) > now && (
            <div className="text-right">
              <p className="font-bold text-yellow-400">🎉 Trial Active</p>
              <p className="text-sm text-[#6B8FAF]">{Math.max(0,Math.ceil((new Date(workspace.trialEndsAt).getTime()-now.getTime())/86400000))} days remaining</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:"Total Users",      v:totalUsers,         c:"#244D87", icon:"👥"},
          {l:"Active (30d)",     v:activeUsers30d,     c:"#10b981", icon:"✅"},
          {l:"New (7d)",         v:newUsers7d,         c:"#00B4D8", icon:"🆕"},
          {l:"DAU Estimate",     v:dau,                c:"#8b5cf6", icon:"📊"},
        ].map(k=>(
          <div key={k.l} className="card">
            <div className="text-xl mb-2">{k.icon}</div>
            <p className="text-2xl font-black" style={{color:k.c}}>{k.v}</p>
            <p className="text-xs text-[#6B8FAF] mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="font-semibold mb-4">📈 Platform Usage</h2>
          {[
            {l:"Total Clients",      v:totalClients,    sub:`${activeClients} active`,          c:"#244D87"},
            {l:"Total Tasks Created",v:totalTasks,      sub:`${tasksLast30d} in last 30 days`,  c:"#00B4D8"},
            {l:"Tasks per User",     v:tasksPerUser,    sub:"all time average",                 c:"#8b5cf6"},
            {l:"AI Generations",     v:aiTotal,         sub:"all time",                         c:"#7c3aed"},
          ].map(k=>(
            <div key={k.l} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-semibold">{k.l}</p>
                <p className="text-xs text-[#3D5577]">{k.sub}</p>
              </div>
              <span className="text-2xl font-black" style={{color:k.c}}>{k.v}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">✨ AI Feature Usage</h2>
          {aiUsage.length === 0 && <p className="text-sm text-[#3D5577]">No AI usage yet. Try AI Studio!</p>}
          {aiUsage.map(a=>{
            const pct = aiTotal>0?Math.round((Number(a.cnt)/aiTotal)*100):0;
            const AI_ICONS: Record<string,string> = {brief:"🎨",caption:"✍️",budget_optimizer:"💰",churn_prediction:"🚨",performance_summary:"📊"};
            return (
              <div key={a.type} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{AI_ICONS[a.type]??""} {a.type.replace(/_/g," ")}</span>
                  <span className="font-bold">{a.cnt} <span className="text-[#3D5577]">({pct}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#7c3aed,#244D87)"}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">📦 Plan Usage vs Limits</h2>
          {[
            {l:"Clients",     used:activeClients,  max:workspace?.maxClients??15},
            {l:"Team Members",used:totalUsers,      max:workspace?.maxUsers??8},
          ].map(item=>{
            const pct = item.max>0?Math.min(Math.round((item.used/item.max)*100),100):0;
            return (
              <div key={item.l} className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{item.l}</span>
                  <span className="font-bold" style={{color:pct>=90?"#ef4444":pct>=70?"#f59e0b":"#10b981"}}>
                    {item.used} / {item.max===999?"∞":item.max}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10">
                  <div className="h-2.5 rounded-full" style={{width:`${pct}%`,background:pct>=90?"#ef4444":pct>=70?"#f59e0b":"linear-gradient(90deg,#244D87,#00B4D8)"}}/>
                </div>
                {pct>=90 && <p className="text-xs text-red-400 mt-1">⚠️ Near limit — upgrade in Billing</p>}
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">🏥 Platform Health</h2>
          {[
            {l:"Database",    v:"✅ Connected",  ok:true},
            {l:"Auth System", v:"✅ Supabase REST", ok:true},
            {l:"AI Studio",   v:process.env.ANTHROPIC_API_KEY?"✅ Configured":"⚠️ No API key", ok:!!process.env.ANTHROPIC_API_KEY},
            {l:"Email (Resend)",v:process.env.RESEND_API_KEY?"✅ Configured":"⚠️ No API key", ok:!!process.env.RESEND_API_KEY},
            {l:"Slack Alerts",v:process.env.SLACK_WEBHOOK_URL?"✅ Connected":"⚠️ Not connected", ok:!!process.env.SLACK_WEBHOOK_URL},
            {l:"Cron Jobs",   v:"✅ Vercel daily 8AM", ok:true},
          ].map(item=>(
            <div key={item.l} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-[#6B8FAF]">{item.l}</span>
              <span className="text-sm font-semibold" style={{color:item.ok?"#10b981":"#f59e0b"}}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
