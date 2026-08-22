export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, users, workspaces, auditLogs, notifications } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

async function requestPlan(fd:FormData){"use server";const session=await auth();if(!session?.user||(session.user as any).role!==Role.SUPER_ADMIN)throw new Error("Unauthorized");const userId=(session.user as any).id,requestedPlan=String(fd.get("plan")||"");if(!["FREE","STARTER","PROFESSIONAL","ENTERPRISE"].includes(requestedPlan))throw new Error("Invalid plan");await db.insert(auditLogs).values({userId,action:"billing_plan_requested",entity:"workspaces",entityId:"default",newValues:JSON.stringify({requestedPlan})} as any);await db.insert(notifications).values({userId,type:"BILLING_REQUEST",title:`Plan request: ${requestedPlan}`,message:"Your plan request was recorded. Billing setup is required before charging or changing limits.",link:"/dashboard/billing",priority:"normal"} as any);const {revalidatePath}=await import("next/cache");revalidatePath("/dashboard/billing");}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const [clientCount, userCount, workspace] = await Promise.all([
    db.select({ cnt: count() }).from(clients).where(eq(clients.isActive, true)).then(r => Number(r[0]?.cnt ?? 0)),
    db.select({ cnt: count() }).from(users).where(eq(users.isActive, true)).then(r => Number(r[0]?.cnt ?? 0)),
    db.select().from(workspaces).where(eq(workspaces.id, "default")).then(r => r[0]),
  ]);

  const plan = workspace?.plan ?? "STARTER";
  const maxClients = workspace?.maxClients ?? 15;
  const maxUsers   = workspace?.maxUsers ?? 8;
  const trialEnd   = workspace?.trialEndsAt;
  const daysLeft   = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000)) : 0;
  const onTrial    = trialEnd && new Date(trialEnd) > new Date();

  const PLANS = [
    { id:"FREE",         name:"Free",         price:0,    clients:5,   users:3,   features:["5 clients","3 users","Basic dashboard","Manual reports"] },
    { id:"STARTER",      name:"Starter",      price:49,   clients:15,  users:8,   features:["15 clients","8 users","AI Studio","Email notifications","Bulk operations"] },
    { id:"PROFESSIONAL", name:"Professional", price:149,  clients:50,  users:25,  features:["50 clients","25 users","Everything in Starter","API access","Webhooks","Revenue forecast","Advanced analytics"] },
    { id:"ENTERPRISE",   name:"Enterprise",   price:0,    clients:999, users:999, features:["Unlimited","White label","Custom domain","Dedicated support","Custom integrations","SLA guarantee"] },
  ];

  const PLAN_COLOR: Record<string,string> = { FREE:"#6b7280", STARTER:"#244D87", PROFESSIONAL:"#7c3aed", ENTERPRISE:"#f59e0b" };
  const currentPlan = PLANS.find(p => p.id === plan) ?? PLANS[1];
  const clientPct   = Math.min(Math.round((clientCount / maxClients) * 100), 100);
  const userPct     = Math.min(Math.round((userCount / maxUsers) * 100), 100);

  return (
    <div className="max-w-5xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">💳 Billing & Subscription</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">Manage your plan, usage and account limits</p>
      </div>

      {/* Trial Banner */}
      {onTrial && (
        <div style={{background:"linear-gradient(135deg,rgba(0,119,182,0.15),rgba(0,180,216,0.08))",border:"1px solid rgba(0,119,182,0.3)",borderRadius:"16px",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
          <div>
            <p className="font-bold text-[#00B4D8]">🎉 Free Trial Active — {daysLeft} days remaining</p>
            <p className="text-sm text-[#6B8FAF] mt-0.5">Enjoying all {currentPlan.name} features. No credit card required yet.</p>
          </div>
          <form action={requestPlan}><input type="hidden" name="plan" value="PROFESSIONAL"/><button className="btn-grad text-sm">Request Upgrade →</button></form>
        </div>
      )}

      {/* Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card" style={{border:`1px solid ${PLAN_COLOR[plan]}30`}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-[#6B8FAF] font-semibold uppercase tracking-wider">Current Plan</p>
              <h2 className="text-3xl font-black mt-1" style={{color:PLAN_COLOR[plan]}}>{currentPlan.name}</h2>
              <p className="text-sm text-[#6B8FAF] mt-1">{currentPlan.price > 0 ? `$${currentPlan.price}/month` : plan === "ENTERPRISE" ? "Custom pricing" : "Free forever"}</p>
            </div>
            <span className="badge text-sm px-3 py-1.5 font-bold" style={{background:PLAN_COLOR[plan]+"15",color:PLAN_COLOR[plan]}}>{plan}</span>
          </div>
          <div className="space-y-1">
            {currentPlan.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#6B8FAF]">
                <span className="text-green-400">✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <div className="card-vivit space-y-5">
          <h2 className="font-semibold">📊 Usage This Month</h2>
          {[
            { label:"Clients", used:clientCount, max:maxClients, pct:clientPct },
            { label:"Team Members", used:userCount, max:maxUsers, pct:userPct },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{item.label}</span>
                <span className="font-bold" style={{color:item.pct>=90?"#ef4444":item.pct>=70?"#f59e0b":"#10b981"}}>
                  {item.used} / {item.max === 999 ? "∞" : item.max}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10">
                <div className="h-2.5 rounded-full transition-all" style={{
                  width:`${item.pct}%`,
                  background:item.pct>=90?"#ef4444":item.pct>=70?"#f59e0b":"linear-gradient(90deg,#244D87,#00B4D8)"
                }}/>
              </div>
              {item.pct >= 90 && (
                <p className="text-xs text-red-400 mt-1">⚠️ Almost at limit — consider upgrading</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="card-vivit !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 font-semibold">Available Plans</div>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {PLANS.map((p, i) => (
            <div key={p.id} className={`p-5 ${i < PLANS.length-1 ? "border-r border-white/5" : ""}`}
              style={{background: p.id === plan ? `${PLAN_COLOR[p.id]}08` : "transparent"}}>
              {p.id === plan && <div className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{color:PLAN_COLOR[p.id]}}>Current Plan</div>}
              <p className="font-bold" style={{color:PLAN_COLOR[p.id]}}>{p.name}</p>
              <p className="text-xl font-black mt-1" style={{color:PLAN_COLOR[p.id]}}>{p.price > 0 ? `$${p.price}` : p.id === "ENTERPRISE" ? "Custom" : "Free"}</p>
              {p.price > 0 && <p className="text-xs text-[#3D5577]">/month</p>}
              <div className="mt-3 space-y-1.5">
                {p.features.map(f => <p key={f} className="text-xs text-[#6B8FAF]">✓ {f}</p>)}
              </div>
              {p.id !== plan && (
                <form action={requestPlan}><input type="hidden" name="plan" value={p.id}/><button className="mt-4 w-full text-xs py-2 px-3 rounded-xl border transition-all"
                  style={{border:`1px solid ${PLAN_COLOR[p.id]}30`,color:PLAN_COLOR[p.id],background:"transparent"}}>
                  {PLANS.indexOf(p) > PLANS.indexOf(currentPlan) ? "Request upgrade →" : "Request downgrade"}
                </button></form>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon:"📧", title:"Update Billing Email", desc:workspace?.billingEmail ?? "Not set", action:"Update",href:"/dashboard/settings#workspace" },
          { icon:"💳", title:"Payment Method", desc:"Contact billing to add or replace a card", action:"Contact Billing",href:"mailto:billing@vivitgroup.com?subject=VIVIT%20ERP%20payment%20method" },
          { icon:"📋", title:"Invoice History", desc:"View and download recorded invoices", action:"View Invoices",href:"/dashboard/finance" },
        ].map(item => (
          <div key={item.title} className="card-vivit flex items-center gap-4">
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-[#6B8FAF] truncate">{item.desc}</p>
            </div>
            <Link href={item.href} className="text-xs px-3 py-1.5 rounded-xl border border-[#244D87]/20 text-[#244D87] hover:bg-[#244D87]/10 transition-colors flex-shrink-0 no-underline">
              {item.action}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
