"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Platform = "META" | "TIKTOK";

export default function MediaIntegrationsPage() {
  const [data, setData] = useState<any>({ clients: [], accounts: [], campaigns: [], configured: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [waConfigured, setWaConfigured] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        fetch("/api/platform-link", { cache: "no-store" }),
        fetch("/api/whatsapp-templates", { cache: "no-store" }),
      ]);
      if (p.ok) setData(await p.json());
      if (w.ok) { const d = await w.json(); setWaConfigured(!!d.hasRealAPI); }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function linkCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget;
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const r = await fetch("/api/platform-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, op: "link", syncNow: true }) });
      const d = await r.json();
      setMessage(r.ok ? (d.sync?.ok ? `Linked and synced ${d.sync.days} day(s).` : `IDs linked. ${d.sync?.error || "API authorization is still required for live sync."}`) : d.error || "Could not link campaign.");
      if (r.ok) { form.reset(); await load(); }
    } finally { setBusy(false); }
  }

  async function syncCampaign(id: string) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/platform-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "sync", internalCampaignId: id }) });
      const d = await r.json();
      setMessage(r.ok ? `Synced ${d.days} day(s) of performance.` : d.error || "Sync failed.");
      if (r.ok) await load();
    } finally { setBusy(false); }
  }

  const accountById = useMemo(() => new Map(data.accounts.map((a: any) => [a.id, a])), [data.accounts]);
  const clientName = (id: string) => data.clients.find((c: any) => c.id === id)?.name || "Client";

  if (loading) return <div className="card"><div className="empty-state">Loading integrations…</div></div>;

  return <div style={{ display: "grid", gap: 18 }}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div><h1 className="page-title">Platform Integrations</h1><p className="page-subtitle">Enter the account ID and campaign ID. VIVIT stores the relationship and syncs live data whenever platform credentials are available.</p></div>
      <Link href="/dashboard/whatsapp" className="btn btn-success" style={{textDecoration:"none"}}>💬 Open WhatsApp</Link>
    </div>

    {message && <div className={/failed|could not|error|required|denied/i.test(message) ? "media-error" : "media-success"}>{message}</div>}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {(["META", "TIKTOK"] as Platform[]).map(platform => <div className="card" key={platform}>
        <div className="card-header"><div><p className="card-title">{platform === "META" ? "Meta Ads" : "TikTok Ads"}</p><p className="page-subtitle" style={{ margin: 0 }}>{data.configured?.[platform] ? "Live API sync is available" : "IDs can be linked now; live sync activates after API authorization"}</p></div><span className={`badge ${data.configured?.[platform] ? "badge-green" : "badge-amber"}`}>{data.configured?.[platform] ? "LIVE SYNC" : "ID LINKING"}</span></div>
        <div className="card-body"><form className="media-form" onSubmit={linkCampaign}>
          <input type="hidden" name="platform" value={platform}/>
          <label>Client<select name="clientId" required className="form-select"><option value="">Select client</option>{data.clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>{platform === "META" ? "Ad Account ID" : "Advertiser ID"}<input name="adAccountId" required inputMode="numeric" pattern="[0-9]*" className="form-input" placeholder={platform === "META" ? "123456789012345" : "7123456789012345678"}/></label>
          <label>Campaign ID<input name="campaignId" required inputMode="numeric" pattern="[0-9]*" className="form-input" placeholder="Campaign ID"/></label>
          <label>Account name (optional)<input name="accountName" className="form-input" placeholder="Brand Ad Account"/></label>
          <label>Campaign name (optional)<input name="campaignName" className="form-input" placeholder="August Leads"/></label>
          <button className="btn btn-primary" disabled={busy}>{busy?"Working…":"Link IDs & Sync →"}</button>
        </form></div>
      </div>)}
    </div>

    <div className="card">
      <div className="card-header"><div><p className="card-title">Linked campaigns</p><p className="page-subtitle" style={{ margin: 0 }}>Account ID and Campaign ID remain visible for operational checks.</p></div></div>
      <div className="card-body-flush"><div className="table-scroll"><table className="data-table"><thead><tr><th>Client</th><th>Platform</th><th>Account ID</th><th>Campaign</th><th>Campaign ID</th><th>Status</th><th>Last sync</th><th></th></tr></thead><tbody>
        {data.campaigns.map((c: any) => { const a: any = accountById.get(c.connectionId); return <tr key={c.id}><td>{clientName(c.clientId)}</td><td>{c.platform}</td><td><code>{a?.adAccountId || "—"}</code></td><td><strong>{c.name}</strong></td><td><code>{c.externalId}</code></td><td><span className="badge badge-blue">{c.status}</span></td><td>{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "Not synced"}</td><td><button className="btn btn-ghost btn-sm" disabled={busy || !["META", "TIKTOK"].includes(c.platform)} onClick={() => syncCampaign(c.id)}>Sync</button></td></tr> })}
      </tbody></table></div>{!data.campaigns.length && <div className="empty-state">No linked campaigns yet.</div>}</div>
    </div>

    <div className="card">
      <div className="card-header"><div><p className="card-title">WhatsApp</p><p className="page-subtitle" style={{ margin: 0 }}>Direct chat is available now. In-system sending uses the existing WhatsApp Cloud API workspace.</p></div><span className={`badge ${waConfigured ? "badge-green" : "badge-amber"}`}>{waConfigured ? "CLOUD API READY" : "DIRECT CHAT READY"}</span></div>
      <div className="card-body" style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><p className="page-subtitle" style={{margin:0,maxWidth:700}}>Use the WhatsApp workspace to enter any number, open the conversation directly, or send from VIVIT when Cloud API credentials are active.</p><Link href="/dashboard/whatsapp" className="btn btn-success" style={{textDecoration:"none"}}>Open WhatsApp Workspace →</Link></div>
    </div>
  </div>;
}
