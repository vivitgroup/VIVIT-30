// @ts-nocheck
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, sql } from "@/lib/db";
import { Role } from "@/lib/types";
import Link from "next/link";

const money=(n:any)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));
const statusTone=(s:string)=>s==="PAID"?"ok":s==="PARTIAL"?"warn":"danger";

export default async function AccountsPaymentPage(){
 const session=await auth();
 if(!session?.user) redirect("/login");
 const role=(session.user as any).role as Role;
 if(![Role.SUPER_ADMIN,Role.ACCOUNTANT,Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");
 const rows:any[]=Array.from(await db.execute(sql`
  select c.id,c.company_name,c.account_manager_id,c.media_buyer_id,
   p.payment_day,p.responsible_name,p.phone,p.currency,p.amount_due,p.amount_paid,p.amount_remaining,p.payment_ratio,p.payment_status,
   p.source_account_manager,p.source_sales,p.source_media_buyer,p.videos,p.statics,p.carousels,p.notes,
   am.name as account_manager_name,mb.name as media_buyer_name,
   coalesce(sa.sales_names,'—') as sales_names,coalesce(ca.creator_names,'—') as creator_names
  from clients c
  join client_payment_profiles p on p.client_id=c.id and p.workspace_id='default'
  left join users am on am.id=c.account_manager_id
  left join users mb on mb.id=c.media_buyer_id
  left join lateral (select string_agg(u.name,', ' order by u.name) sales_names from client_sales_assignments a join users u on u.id=a.sales_user_id where a.client_id=c.id and a.workspace_id='default') sa on true
  left join lateral (select string_agg(u.name,', ' order by u.name) creator_names from client_creator_assignments a join users u on u.id=a.creator_id where a.client_id=c.id and a.workspace_id='default') ca on true
  where c.workspace_id='default' order by p.amount_remaining desc,c.company_name asc
 `));
 const totalDue=rows.reduce((s,r)=>s+Number(r.amount_due||0),0),paid=rows.reduce((s,r)=>s+Number(r.amount_paid||0),0),remaining=rows.reduce((s,r)=>s+Number(r.amount_remaining||0),0),collection=totalDue?Math.round(paid/totalDue*100):0;
 return <div className="pay-page"><style>{`
 .pay-page{display:flex;flex-direction:column;gap:18px;min-width:0}.pay-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.pay-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pay-kpi{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:16px;box-shadow:var(--shadow-sm)}.pay-kpi span{font-size:12px;color:var(--text-muted);font-weight:650}.pay-kpi b{display:block;margin-top:7px;font-size:23px;color:var(--text-primary)}.pay-table-wrap{overflow:auto;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px}.pay-table{width:100%;border-collapse:collapse;min-width:1240px}.pay-table th{position:sticky;top:0;background:var(--bg-tertiary);padding:12px;text-align:left;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--card-border)}.pay-table td{padding:12px;border-bottom:1px solid var(--card-border);color:var(--text-secondary);font-size:12.5px;vertical-align:top}.pay-name{font-weight:800;color:var(--text-primary);font-size:13px}.pay-muted{font-size:11px;color:var(--text-muted);margin-top:3px}.pay-status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800}.pay-status.ok{background:#ecfdf3;color:#027a48}.pay-status.warn{background:#fff7ed;color:#c2410c}.pay-status.danger{background:#fef2f2;color:#b42318}.pay-content{display:flex;gap:5px;flex-wrap:wrap}.pay-chip{padding:3px 7px;border-radius:999px;background:var(--bg-tertiary);font-size:10px;font-weight:700;color:var(--text-secondary)}.pay-mobile{display:none}.pay-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}.pay-row{display:flex;justify-content:space-between;gap:12px}.pay-row span:first-child{font-size:11px;color:var(--text-muted)}.pay-row span:last-child{font-size:12px;color:var(--text-primary);text-align:right}.pay-progress{height:7px;background:var(--bg-tertiary);border-radius:999px;overflow:hidden}.pay-progress i{display:block;height:100%;background:var(--vivit-blue);border-radius:999px}
 @media(max-width:900px){.pay-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pay-table-wrap{display:none}.pay-mobile{display:grid;gap:10px}.pay-head h1{font-size:1.55rem}}
 @media(max-width:520px){.pay-kpis{grid-template-columns:1fr 1fr}.pay-kpi{padding:13px}.pay-kpi b{font-size:18px}.pay-head .btn{width:100%;text-align:center}}
 `}</style>
 <div className="pay-head"><div><h1 className="page-title">Accounts Payment</h1><p className="page-subtitle">Live collection status across {rows.length} active client payment profiles</p></div><Link className="btn btn-secondary" href="/dashboard/clients" style={{textDecoration:"none"}}>Back to Clients</Link></div>
 <div className="pay-kpis"><div className="pay-kpi"><span>Total due</span><b>{money(totalDue)}</b></div><div className="pay-kpi"><span>Collected</span><b>{money(paid)}</b></div><div className="pay-kpi"><span>Outstanding</span><b>{money(remaining)}</b></div><div className="pay-kpi"><span>Collection rate</span><b>{collection}%</b></div></div>
 <div className="pay-table-wrap"><table className="pay-table"><thead><tr><th>Client</th><th>Payment</th><th>Due / Paid</th><th>Outstanding</th><th>Account team</th><th>Content plan</th><th>Notes</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><div className="pay-name">{r.company_name}</div><div className="pay-muted">Day {r.payment_day||"—"} · {r.responsible_name||"—"}</div><div className="pay-muted">{r.phone||"No phone"}</div></td><td><span className={`pay-status ${statusTone(String(r.payment_status||""))}`}>{r.payment_status||"PENDING"}</span><div className="pay-muted">{Math.round(Number(r.payment_ratio||0)*100)}% collected</div></td><td><b style={{color:"var(--text-primary)"}}>{money(r.amount_due)}</b><div className="pay-muted">Paid {money(r.amount_paid)}</div></td><td><b style={{color:Number(r.amount_remaining)>0?"#b42318":"#027a48"}}>{money(r.amount_remaining)}</b></td><td><div><b style={{color:"var(--text-primary)"}}>AM:</b> {r.account_manager_name||r.source_account_manager||"—"}</div><div className="pay-muted">Media: {r.media_buyer_name||r.source_media_buyer||"—"}</div><div className="pay-muted">Sales: {r.sales_names}</div><div className="pay-muted">Creators: {r.creator_names}</div></td><td><div className="pay-content"><span className="pay-chip">{r.videos||0} Videos</span><span className="pay-chip">{r.statics||0} Statics</span><span className="pay-chip">{r.carousels||0} Carousels</span></div></td><td style={{maxWidth:260}}>{r.notes||"—"}</td></tr>)}</tbody></table></div>
 <div className="pay-mobile">{rows.map(r=>{const pct=Math.max(0,Math.min(100,Math.round(Number(r.payment_ratio||0)*100)));return <div className="pay-card" key={r.id}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><div className="pay-name">{r.company_name}</div><div className="pay-muted">Payment day {r.payment_day||"—"}</div></div><span className={`pay-status ${statusTone(String(r.payment_status||""))}`}>{r.payment_status||"PENDING"}</span></div><div className="pay-row"><span>Due</span><span>{money(r.amount_due)}</span></div><div className="pay-row"><span>Paid</span><span>{money(r.amount_paid)}</span></div><div className="pay-row"><span>Outstanding</span><span>{money(r.amount_remaining)}</span></div><div className="pay-progress"><i style={{width:`${pct}%`}}/></div><div className="pay-row"><span>Account Manager</span><span>{r.account_manager_name||r.source_account_manager||"—"}</span></div><div className="pay-row"><span>Sales</span><span>{r.sales_names}</span></div><div className="pay-row"><span>Creators</span><span>{r.creator_names}</span></div><div className="pay-content"><span className="pay-chip">{r.videos||0} Videos</span><span className="pay-chip">{r.statics||0} Statics</span><span className="pay-chip">{r.carousels||0} Carousels</span></div>{r.notes&&<div className="pay-muted">{r.notes}</div>}</div>})}</div>
 </div>;
}
