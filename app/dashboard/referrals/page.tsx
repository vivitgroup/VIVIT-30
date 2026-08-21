export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, referrals } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Role } from "@/lib/types";

async function sendReferral(fd: FormData) {
  "use server";
  const email = fd.get("email") as string;
  if (!email) return;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await fetch(`${base}/api/referrals`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ email }),
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/referrals");
}

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const allReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, "default"))
    .orderBy(referrals.createdAt);

  const stats = {
    total: allReferrals.length,
    pending: allReferrals.filter(r=>r.status==="PENDING").length,
    converted: allReferrals.filter(r=>r.status==="CONVERTED").length,
    revenue: allReferrals.filter(r=>r.status==="CONVERTED").length * 149, // avg plan value
  };

  const STATUS_COLOR: Record<string,string> = {
    PENDING:"bg-yellow-500/10 text-yellow-400",
    SIGNED_UP:"bg-blue-500/10 text-blue-400",
    CONVERTED:"bg-green-500/10 text-green-400",
  };

  return (
    <div className="max-w-4xl space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">🔗 Referral Program</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">Refer other agencies and earn 20% discount each</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {l:"Total Sent",    v:stats.total,     c:"#244D87"},
          {l:"Pending",       v:stats.pending,   c:"#f59e0b"},
          {l:"Converted",     v:stats.converted, c:"#10b981"},
          {l:"Revenue Generated", v:`$${stats.revenue.toLocaleString()}`, c:"#8b5cf6"},
        ].map(k=>(
          <div key={k.l} className="card-vivit text-center py-4">
            <p className="text-3xl font-black" style={{color:k.c}}>{k.v}</p>
            <p className="text-xs text-[#6B8FAF] mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Incentive Banner */}
      <div style={{background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(0,119,182,0.1))",border:"1px solid rgba(139,92,246,0.25)",borderRadius:"16px",padding:"20px 24px"}}>
        <h2 className="font-bold text-purple-400 mb-1">🎁 How it Works</h2>
        <div className="grid grid-cols-3 gap-4 mt-3">
          {[
            {icon:"1️⃣",text:"Invite another agency by email"},
            {icon:"2️⃣",text:"They sign up and convert to a paid plan"},
            {icon:"3️⃣",text:"You both get 20% off for 3 months"},
          ].map(s=>(
            <div key={s.text} className="flex items-start gap-2">
              <span className="text-lg">{s.icon}</span>
              <p className="text-sm text-[#6B8FAF]">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Send Referral */}
      <div className="card">
        <h2 className="font-semibold text-[#244D87] text-sm uppercase tracking-wider mb-4">📧 Send Referral Invite</h2>
        <form action={sendReferral} className="flex gap-3">
          <input name="email" type="email" required placeholder="agency@email.com" className="vivit-input flex-1" />
          <button type="submit" className="btn-grad flex-shrink-0">Send Invite →</button>
        </form>
        <p className="text-xs text-[#3D5577] mt-2">They will receive a branded email with a signup link and discount code.</p>
      </div>

      {/* Referral List */}
      {allReferrals.length > 0 && (
        <div className="card-vivit !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 font-semibold">Referral History</div>
          {allReferrals.map(r=>(
            <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03] last:border-0">
              <div>
                <p className="font-semibold text-sm">{r.referredEmail}</p>
                <p className="text-xs text-[#3D5577]">Code: <span className="font-mono font-bold text-[#244D87]">{r.code}</span> · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`badge text-[11px] ${STATUS_COLOR[r.status]??"bg-gray-500/10 text-gray-400"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ FEATURE 20: Partner & Reseller Portal ═══ */}
      <div className="card" style={{background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(0,119,182,0.04))",border:"1px solid rgba(245,158,11,0.2)"}}>
        <h2 className="font-semibold text-yellow-400 mb-1">🤝 Partner & Reseller Program</h2>
        <p className="text-xs text-muted mb-4">White-label and resell Vivit ERP to your network — earn 25% recurring commission</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            {tier:"Silver Partner",  commission:"15%",threshold:"3+ clients",    perks:["Co-branded reports","Partner badge","Priority support"],color:"#9ca3af"},
            {tier:"Gold Partner",    commission:"20%",threshold:"10+ clients",   perks:["White-label portal","Custom domain","Dedicated CSM"],   color:"#f59e0b"},
            {tier:"Platinum Partner",commission:"25%",threshold:"25+ clients",   perks:["Full white-label","Revenue sharing","API priority"],    color:"#8b5cf6"},
          ].map(tier=>(
            <div key={tier.tier} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🤝</span>
                <p className="font-bold text-sm" style={{color:tier.color}}>{tier.tier}</p>
              </div>
              <p className="text-2xl font-black mb-1" style={{color:tier.color}}>{tier.commission}<span className="text-xs text-muted"> /mo recurring</span></p>
              <p className="text-xs text-muted mb-2">Min. {tier.threshold} managed</p>
              <div className="space-y-0.5">
                {tier.perks.map(p => <p key={p} className="text-[11px] text-muted">✓ {p}</p>)}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-sm font-semibold mb-2">📊 Your Partner Dashboard</p>
            <div className="space-y-2">
              {[
                {l:"Sub-Workspaces Managed",v:"3",c:"#244D87"},
                {l:"MRR from Partners",      v:"$1,050",c:"#10b981"},
                {l:"Pending Commissions",    v:"$315",  c:"#f59e0b"},
                {l:"Your Tier",             v:"Silver", c:"#9ca3af"},
              ].map(k=>(
                <div key={k.l} className="flex justify-between">
                  <span className="text-xs text-muted">{k.l}</span>
                  <span className="text-sm font-bold" style={{color:k.c}}>{k.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-sm font-semibold mb-2">🔗 Your Referral Links</p>
            <div className="space-y-2">
              {["14-day Free Trial","20% First Month Off","Demo Request"].map(link=>(
                <div key={link} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{link}</span>
                  <span className="text-[10px] badge-info px-2 py-0.5 rounded">Available after partner activation</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-dim mt-3">All referral conversions tracked automatically and credited within 24h</p>
          </div>
        </div>
      </div>

    </div>
  );
}
