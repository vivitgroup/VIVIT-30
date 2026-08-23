"use client";

import { useEffect, useMemo, useState } from "react";

type Platform = "META" | "TIKTOK";

export default function MediaIntegrationsPage() {
  const [data, setData] = useState<any>({ clients: [], accounts: [], campaigns: [], configured: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [waStatus, setWaStatus] = useState<any>({ configured: false });

  async function load() {
    setLoading(true);
    const [p, w] = await Promise.all([fetch("/api/platform-link", { cache: "no-store" }), fetch("/api/whatsapp", { cache: "no-store" })]);
    if (p.ok) setData(await p.json());
    if (w.ok) setWaStatus(await w.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function linkCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const r = await fetch("/api/platform-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, op: "link", syncNow: true }) });
    const d = await r.json();
    setMessage(r.ok ? (d.sync?.ok ? `Linked and synced ${d.sync.days} day(s).` : `IDs linked. ${d.sync?.error || "Add/authorize API credentials to sync data."}`) : d.error || "Could not link campaign.");
    if (r.ok) { form.reset(); await load(); }
    setBusy(false);
  }

  async function syncCampaign(id: string) {
    setBusy(true); setMessage("");
    const r = await fetch("/api/platform-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "sync", internalCampaignId: id }) });
    const d = await r.json();
    setMessage(r.ok ? `Synced ${d.days} day(s) of performance.` : d.error || "Sync failed.");
    if (r.ok) await load();
    setBusy(false);
  }

  async function whatsapp(e: React.FormEvent<HTMLFormElement>, mode: "direct" | "send") {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget, body = Object.fromEntries(new FormData(form).entries());
    const r = await fetch("/api/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, mode }) });
    const d = await r.json();
    if (r.ok && mode === "direct" && d.url) window.open(d.url, "_blank", "noopener,noreferrer");
    setMessage(r.ok ? (mode === "direct" ? "WhatsApp opened." : `Message sent${d.messageId ? ` · ${d.messageId}` : ""}.`) : d.error || "WhatsApp action failed.");
    setBusy(false);
  }

  const accountById = useMemo(() => new Map(data.accounts.map((a: any) => [a.id, a])), [data.accounts]);
  const clientName = (id: string) => data.clients.find((c: any) => c.id === id)?.name || "Client";

  if (loading) return <div className="card"><div className="empty-state">Loading integrations…</div></div>;

  return <div style={{ display: "grid", gap: 18 }}>
    <div>
      <h1 className="page-title">Platform Integrations</h1>
      <p className="page-subtitle">Link Meta and TikTok by account + campaign ID, then sync performance. Open or send WhatsApp messages from the same workspace.</p>
    </div>

    {message && <div className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") || message.toLowerCase().includes("error") ? "media-error" : "media-success"}>{message}</div>}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {(["META", "TIKTOK"] as Platform[]).map(platform => <div className="card" key={platform}>
        <div className="card-header"><div><p className="card-title">{platform === "META" ? "Meta Ads" : "TikTok Ads"}</p><p className="page-subtitle" style={{ margin: 0 }}>{data.configured?.[platform] ? "API credentials detected" : "IDs can be saved now; API authorization is still required for live sync"}</p></div><span className={`badge ${data.configured?.[platform] ? "badge-green" : "badge-amber"}`}>{data.configured?.[platform] ? "API READY" : "ID MODE"}</span></div>
        <div className="card-body"><form className="media-form" onSubmit={linkCampaign}>
          <input type="hidden" name="platform" value={platform}/>
          <label>Client<select name="clientId" required className="form-select"><option value="">Select client</option>{data.clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>{platform === "META" ? "Ad Account ID" : "Advertiser ID"}<input name="adAccountId" required inputMode="numeric" className="form-input" placeholder={platform === "META" ? "123456789012345" : "7123456789012345678"}/></label>
          <label>Campaign ID<input name="campaignId" required inputMode="numeric" className="form-input" placeholder="Campaign ID"/></label>
          <label>Account name (optional)<input name="accountName" className="form-input" placeholder="Brand Ad Account"/></label>
          <label>Campaign name (optional)<input name="campaignName" className="form-input" placeholder="August Leads"/></label>
          <button className="btn btn-primary" disabled={busy}>Link IDs & Sync →</button>
        </form></div>
      </div>)}
    </div>

    <div className="card">
      <div className="card-header"><div><p className="card-title">Linked campaigns</p><p className="page-subtitle" style={{ margin: 0 }}>The account ID stays visible next to every linked campaign.</p></div></div>
      <div className="card-body-flush"><div className="table-scroll"><table className="data-table"><thead><tr><th>Client</th><th>Platform</th><th>Account ID</th><th>Campaign</th><th>Campaign ID</th><th>Status</th><th>Last sync</th><th></th></tr></thead><tbody>
        {data.campaigns.map((c: any) => { const a: any = accountById.get(c.connectionId); return <tr key={c.id}><td>{clientName(c.clientId)}</td><td>{c.platform}</td><td><code>{a?.adAccountId || "—"}</code></td><td><strong>{c.name}</strong></td><td><code>{c.externalId}</code></td><td><span className="badge badge-blue">{c.status}</span></td><td>{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "Not synced"}</td><td><button className="btn btn-ghost btn-sm" disabled={busy || !["META", "TIKTOK"].includes(c.platform)} onClick={() => syncCampaign(c.id)}>Sync</button></td></tr> })}
      </tbody></table></div>{!data.campaigns.length && <div className="empty-state">No linked campaigns yet.</div>}</div>
    </div>

    <div className="card">
      <div className="card-header"><div><p className="card-title">WhatsApp</p><p className="page-subtitle" style={{ margin: 0 }}>Open a chat directly on WhatsApp, or send from VIVIT ERP through WhatsApp Cloud API.</p></div><span className={`badge ${waStatus.configured ? "badge-green" : "badge-amber"}`}>{waStatus.configured ? "CLOUD API READY" : "DIRECT CHAT READY"}</span></div>
      <div className="card-body"><form className="media-form" onSubmit={e => whatsapp(e, "send")}>
        <label>Client (optional)<select name="clientId" className="form-select"><option value="">No client</option>{data.clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>WhatsApp number<input name="to" required className="form-input" inputMode="tel" placeholder="01012345678 or +201012345678"/></label>
        <label style={{ gridColumn: "1/-1" }}>Message<textarea name="message" className="form-input" rows={4} placeholder="Type the message…"/></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-success" disabled={busy} onClick={e => whatsapp({ preventDefault: () => {}, currentTarget: (e.currentTarget.closest("form") as HTMLFormElement) } as any, "direct")}>Open WhatsApp ↗</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !waStatus.configured}>Send from VIVIT ERP</button>
        </div>
        {!waStatus.configured && <p className="page-subtitle" style={{ gridColumn: "1/-1", margin: 0 }}>Direct chat works now. To send inside the ERP, configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID for the Meta WhatsApp Cloud API.</p>}
      </form></div>
    </div>
  </div>;
}
