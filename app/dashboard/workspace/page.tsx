export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, apiKeys, webhooks, workflowRules, serviceCatalog } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Role } from "@/lib/types";

async function addService(fd: FormData) {
  "use server";
  const { db, serviceCatalog } = await import("@/lib/db");
  await db.insert(serviceCatalog).values({
    name: fd.get("name") as string,
    description: fd.get("description") as string || null,
    category: fd.get("category") as string,
    price: parseFloat(fd.get("price") as string) || 0,
    currency: fd.get("currency") as string || "USD",
    billingType: fd.get("billingType") as string || "MONTHLY",
    deliverables: JSON.stringify((fd.get("deliverables") as string || "").split("\n").filter(Boolean)),
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/workspace");
}

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const [keys, hooks, services] = await Promise.all([
    db.select({ id:apiKeys.id, name:apiKeys.name, permissions:apiKeys.permissions, createdAt:apiKeys.createdAt, lastUsedAt:apiKeys.lastUsedAt }).from(apiKeys).orderBy(desc(apiKeys.createdAt)).limit(5),
    db.select({ id:webhooks.id, url:webhooks.url, events:webhooks.events, isActive:webhooks.isActive }).from(webhooks).limit(5),
    db.select().from(serviceCatalog).where(eq(serviceCatalog.isActive, true)).orderBy(serviceCatalog.category),
  ]);

  const PLATFORMS = [
    { name:"Meta (Facebook & Instagram)", icon:"📘", color:"#1877F2", connected:!!process.env.META_ACCESS_TOKEN,    env:"META_ACCESS_TOKEN",    features:["Publish posts","Pull ad metrics","Page insights","Audience data"] },
    { name:"TikTok Business",             icon:"🎵", color:"#010101", connected:!!process.env.TIKTOK_ACCESS_TOKEN,  env:"TIKTOK_ACCESS_TOKEN",  features:["Publish videos","Ad analytics","Creator marketplace","Trend insights"] },
    { name:"WhatsApp Business",           icon:"💬", color:"#25D366", connected:!!process.env.WHATSAPP_TOKEN,       env:"WHATSAPP_TOKEN",       features:["Send messages","Templates","Broadcast lists","Read receipts"] },
    { name:"Google Analytics 4",          icon:"📊", color:"#E37400", connected:!!process.env.GA4_MEASUREMENT_ID,  env:"GA4_MEASUREMENT_ID",   features:["Website traffic","Conversion tracking","Audience insights","Campaign performance"] },
    { name:"LinkedIn Marketing",          icon:"💼", color:"#0A66C2", connected:false,                             env:"LINKEDIN_TOKEN",       features:["B2B publishing","Sponsored content","Lead gen forms","Company analytics"] },
    { name:"Snapchat Ads",                icon:"👻", color:"#FFFC00", connected:!!process.env.SNAPCHAT_TOKEN,      env:"SNAPCHAT_TOKEN",       features:["Campaign management","Audience targeting","Story ads","Conversion pixels"] },
  ];

  const SOFTWARE_ASSETS = [
    { name:"Adobe Creative Cloud", seats:5,  used:4, renewal:"2025-12-01", cost:600,  status:"active"  },
    { name:"Canva Pro",            seats:10, used:7, renewal:"2025-08-15", cost:120,  status:"active"  },
    { name:"Google Workspace",     seats:15, used:11,renewal:"2025-10-01", cost:180,  status:"active"  },
    { name:"Notion Team",          seats:10, used:6, renewal:"2025-09-01", cost:96,   status:"active"  },
    { name:"Semrush Business",     seats:3,  used:2, renewal:"2025-07-01", cost:450,  status:"expiring"},
    { name:"Loom Business",        seats:20, used:14,renewal:"2025-11-01", cost:150,  status:"active"  },
  ];

  const now = new Date();

  return (
    <div className="max-w-6xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">🏗️ Workspace & Integrations</h1>
        <p className="text-muted text-sm mt-0.5">Platform integrations, social publishing, API keys, and asset management</p>
      </div>

      {/* ═══ FEATURE 8: Social Publishing Hub ═══ */}
      <div className="card">
        <h2 className="font-semibold mb-1">📱 Social Publishing Hub</h2>
        <p className="text-xs text-muted mb-4">Connect platforms to publish directly from Vivit ERP content calendar</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS.map(p => (
            <div key={p.name} className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
              <span className="text-2xl flex-shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <span className={`badge text-[10px] font-bold ${p.connected ? "badge-success" : "badge-muted"}`}>
                    {p.connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.features.map(f => <span key={f} className="text-[10px] text-muted bg-white/[0.03] px-1.5 py-0.5 rounded">{f}</span>)}
                </div>
                {!p.connected && (
                  <p className="text-[10px] text-dim">Set <code className="text-[#00B4D8]">{p.env}</code> in environment variables to enable</p>
                )}
                {p.connected && p.name.includes("WhatsApp") && (
                  <a href="/api/whatsapp-templates" target="_blank" className="text-[10px] text-green-400 hover:text-green-300 transition-colors" style={{textDecoration:"none"}}>View message log →</a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-xs font-semibold text-[#244D87] mb-1">🚀 How Social Publishing Works</p>
          <p className="text-[11px] text-dim">1. Schedule post in Content Calendar → 2. Click "Publish" → 3. System calls platform API → 4. Confirms published → 5. Engagement pulled automatically at 24h</p>
        </div>
      </div>

      {/* ═══ FEATURE 13: Service Catalog ═══ */}
      <div className="card">
        <h2 className="font-semibold mb-4">📦 Service Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {services.length === 0 ? (
            <p className="text-sm text-muted col-span-3">No services added yet. Use the form below to add your service offerings.</p>
          ) : services.map(s => (
            <div key={s.id} className="p-3 rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-info text-[9px]">{s.category}</span>
                <span className="badge badge-muted text-[9px]">{s.billingType}</span>
              </div>
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-lg font-black grad-text mt-1">${s.price.toLocaleString()}<span className="text-xs text-muted">/{s.billingType === "MONTHLY" ? "mo" : s.billingType === "HOURLY" ? "hr" : "proj"}</span></p>
              {s.description && <p className="text-xs text-muted mt-1 line-clamp-2">{s.description}</p>}
              {s.deliverables && (
                <div className="mt-2 space-y-0.5">
                  {(JSON.parse(s.deliverables) as string[]).slice(0, 3).map((d,i) => (
                    <p key={i} className="text-[10px] text-muted">✓ {d}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <details>
          <summary className="text-xs text-[#244D87] cursor-pointer font-semibold">+ Add Service to Catalog</summary>
          <form action={addService} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div><label className="erp-label">Service Name *</label><input name="name" required placeholder="Social Media Management" className="form-input"/></div>
            <div><label className="erp-label">Category *</label>
              <select name="category" className="form-input">
                {["MEDIA","CREATIVE","STRATEGY","CONSULTING","PRODUCTION"].map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="erp-label">Price *</label><input name="price" type="number" required placeholder="5000" className="form-input"/></div>
            <div><label className="erp-label">Billing Type</label>
              <select name="billingType" className="form-input">
                {["MONTHLY","PROJECT","HOURLY"].map(b => <option key={b} value={b}>{b}</option>)}
              </select></div>
            <div className="md:col-span-2"><label className="erp-label">Description</label><input name="description" placeholder="Full social media management..." className="form-input"/></div>
            <div className="md:col-span-2"><label className="erp-label">Deliverables (one per line)</label><textarea name="deliverables" rows={3} placeholder={"4 Reels/month\n8 Graphics/month\nMonthly Report"} className="vivit-input resize-none"/></div>
            <div className="md:col-span-4"><button type="submit" className="btn btn-primary">Add to Catalog</button></div>
          </form>
        </details>
      </div>

      {/* Asset & License Management */}
      <div className="card">
        <h2 className="font-semibold mb-4">🖥️ Software Licenses & Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SOFTWARE_ASSETS.map(a => {
            const days = Math.ceil((new Date(a.renewal).getTime() - now.getTime()) / 86400000);
            const expiring = days < 30;
            const utilPct = Math.round((a.used / a.seats) * 100);
            return (
              <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <span className={`badge text-[9px] font-bold ${expiring ? "badge-warning" : "badge-success"}`}>
                      {expiring ? `⚠️ ${days}d` : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[11px] text-muted">{a.used}/{a.seats} seats</span>
                    <span className="text-[11px] text-dim">${a.cost}/yr</span>
                    <span className="text-[11px] text-dim">Renews {a.renewal}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${utilPct}%`, background: utilPct >= 90 ? "#ef4444" : utilPct >= 70 ? "#f59e0b" : "#10b981" }}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Keys */}
      <div className="card">
        <h2 className="font-semibold mb-4">🔑 API Keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted">No API keys generated yet. Create one from Settings.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Permissions</th><th>Last Used</th><th>Created</th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td className="font-semibold">{k.name}</td>
                  <td><span className="badge badge-info text-[10px]">{k.permissions}</span></td>
                  <td className="text-muted text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}</td>
                  <td className="text-muted text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-xs font-semibold text-[#244D87] mb-1">API v1 Endpoints</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {["/api/v1/clients","/api/v1/tasks","/api/v1/metrics"].map(ep => (
              <code key={ep} className="text-[10px] text-[#00B4D8] bg-white/[0.03] px-2 py-1 rounded">{ep}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
