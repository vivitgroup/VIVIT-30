export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Role } from "@/lib/types";
import { createClient } from "@/lib/actions";
import Link from "next/link";

export default async function NewClientPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard/clients");

  const allUsers = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.isActive, true));
  const managers = allUsers.filter(u => u.role === "ACCOUNT_MANAGER");
  const buyers   = allUsers.filter(u => u.role === "MEDIA_BUYER");

  const industries = ["F&B","Retail","Real Estate","Entertainment","Hospitality","Technology","Marketing","Jewelry & Fashion","Healthcare","Education","Automotive","Other"];

  return (
    <div className="">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients" className="text-muted  text-xl">←</Link>
        <div>
          <h1 className="page-title">🏢 New Client</h1>
          <p className="text-sm text-muted mt-1">Add a new client to the CRM</p>
        </div>
      </div>

      <form action={createClient} style={{display:"flex",flexDirection:"column",gap:"20px"}}>
        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider">Company Info</h2>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Company Name *</label>
            <input name="companyName" required placeholder="e.g. West Court Development" className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Industry</label>
              <select name="industry" className="form-input">
                <option value="">Select…</option>
                {industries.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Website</label>
              <input name="website" type="url" placeholder="https://…" className="form-input" />
            </div>
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider">Contract & Financials</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Monthly Retainer ($)</label>
              <input name="monthlyRetainer" type="number" placeholder="15000" className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Media Budget ($)</label>
              <input name="mediaBudget" type="number" placeholder="50000" className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Contract Value ($)</label>
              <input name="contractValue" type="number" placeholder="180000" className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Contract Start</label>
              <input name="contractStart" type="date" className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Contract End</label>
              <input name="contractEnd" type="date" className="form-input" />
            </div>
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider">Team Assignment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Account Manager</label>
              <select name="accountManagerId" className="form-input">
                <option value="">Unassigned</option>
                {managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Media Buyer</label>
              <select name="mediaBuyerId" className="form-input">
                <option value="">Unassigned</option>
                {buyers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider">Ad Account Links</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {name:"metaAdsLink",    label:"📘 Meta Ads",    placeholder:"https://business.facebook.com/…"},
              {name:"tiktokAdsLink",  label:"🎵 TikTok Ads",  placeholder:"https://ads.tiktok.com/…"},
              {name:"snapchatAdsLink",label:"👻 Snapchat Ads",placeholder:"https://ads.snapchat.com/…"},
              {name:"googleAdsLink",  label:"🔍 Google Ads",  placeholder:"https://ads.google.com/…"},
            ].map(f=>(
              <div key={f.name}>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">{f.label}</label>
                <input name={f.name} type="url" placeholder={f.placeholder} className="form-input" />
              </div>
            ))}
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider">Primary Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Name</label><input name="contactName" placeholder="Ahmed Mohamed" className="form-input" /></div>
            <div><label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Title</label><input name="contactTitle" placeholder="Marketing Manager" className="form-input" /></div>
            <div><label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Email</label><input name="contactEmail" type="email" placeholder="ahmed@co.com" className="form-input" /></div>
            <div><label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label><input name="contactPhone" placeholder="+20100000000" className="form-input" /></div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-[#a78bfa] text-sm uppercase tracking-wider mb-3">Internal Notes</h2>
          <textarea name="internalNotes" rows={3} placeholder="Internal notes (not visible to client)…" className="vivit-input resize-none w-full" />
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/clients" className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border border-white/10 text-muted hover:bg-white/5 transition-colors">Cancel</Link>
          <button type="submit" className="btn-grad flex-1 justify-center py-3">Create Client →</button>
        </div>
      </form>
    </div>
  );
}
