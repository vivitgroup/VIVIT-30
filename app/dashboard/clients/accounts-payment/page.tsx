export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, sql, auditLogs } from "@/lib/db";
import { Role } from "@/lib/types";
import Link from "next/link";

type PaymentRow={
  id:string;
  company_name:string;
  payment_day:number|null;
  responsible_name:string|null;
  phone:string|null;
  currency:string|null;
  amount_due:number|string|null;
  amount_paid:number|string|null;
  amount_remaining:number|string|null;
  payment_ratio:number|string|null;
  payment_status:string|null;
  notes:string|null;
  account_manager_name:string|null;
  media_buyer_name:string|null;
  has_profile:boolean;
};

const money=(n:number|string|null|undefined,currency:string)=>new Intl.NumberFormat("en-EG",{style:"currency",currency,maximumFractionDigits:2}).format(Number(n||0));
const statusTone=(s:string)=>s==="PAID"?"ok":s==="PARTIAL"?"warn":s==="SETUP_REQUIRED"?"setup":"danger";

async function saveFinanceSetup(formData:FormData){
  "use server";
  const session=await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const role=session.user.role as Role;
  if(![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(role))throw new Error("Finance setup is restricted to Accountant and Super Admin.");
  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");
  if(!workspaceId||!userId)throw new Error("Workspace unavailable");

  const clientId=String(formData.get("clientId")||"").trim();
  const responsibleName=String(formData.get("responsibleName")||"").trim().slice(0,160);
  const phone=String(formData.get("phone")||"").trim().slice(0,60);
  const currency=String(formData.get("currency")||"").trim().toUpperCase().slice(0,3);
  const amountDue=Number(formData.get("amountDue"));
  const paymentDay=Number(formData.get("paymentDay"));
  const notes=String(formData.get("notes")||"").trim().slice(0,1000);
  if(!clientId)throw new Error("Client is required");
  if(!responsibleName)throw new Error("Finance contact is required");
  if(!phone)throw new Error("Finance phone is required");
  if(!/^[A-Z]{3}$/.test(currency))throw new Error("Use a valid 3-letter currency code");
  if(!Number.isFinite(amountDue)||amountDue<=0)throw new Error("Client amount must be greater than zero");
  if(!Number.isInteger(paymentDay)||paymentDay<1||paymentDay>31)throw new Error("Payment day must be between 1 and 31");

  await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`client-finance-setup:${workspaceId}:${clientId}`}))`);
    const clientRows=Array.from(await tx.execute(sql`
      select c.id,c.company_name,am.name as account_manager_name
      from clients c
      left join users am on am.id=c.account_manager_id and am.workspace_id=${workspaceId}
      where c.id=${clientId} and c.workspace_id=${workspaceId} and c.is_active=true
      limit 1
    `)) as Array<{id:string;company_name:string;account_manager_name:string|null}>;
    const client=clientRows[0];
    if(!client)throw new Error("Client not found");

    await tx.execute(sql`
      insert into client_payment_profiles (
        workspace_id,client_id,payment_day,responsible_name,phone,currency,
        amount_due,amount_paid,amount_remaining,payment_ratio,payment_status,
        source_account_manager,notes,updated_at
      ) values (
        ${workspaceId},${clientId},${paymentDay},${responsibleName},${phone},${currency},
        ${amountDue},0,${amountDue},0,'PENDING',${client.account_manager_name},${notes||null},now()
      )
      on conflict (workspace_id,client_id) do update set
        payment_day=excluded.payment_day,
        responsible_name=excluded.responsible_name,
        phone=excluded.phone,
        currency=excluded.currency,
        amount_due=excluded.amount_due,
        amount_remaining=greatest(excluded.amount_due-client_payment_profiles.amount_paid,0),
        payment_ratio=case when excluded.amount_due>0 then least(100,(client_payment_profiles.amount_paid/excluded.amount_due)*100) else 0 end,
        payment_status=case
          when client_payment_profiles.amount_paid>=excluded.amount_due then 'PAID'
          when client_payment_profiles.amount_paid>0 then 'PARTIAL'
          else 'PENDING'
        end,
        source_account_manager=excluded.source_account_manager,
        notes=excluded.notes,
        updated_at=now()
    `);
    await tx.execute(sql`update clients set monthly_retainer=${amountDue},currency=${currency},updated_at=now() where id=${clientId} and workspace_id=${workspaceId}`);
    await tx.insert(auditLogs).values({
      workspaceId,userId,action:"client_finance_setup",entity:"client_payment_profiles",entityId:clientId,
      newValues:JSON.stringify({amountDue,currency,paymentDay,responsibleName,source:"accounts-payment"}),
    });
  });
  revalidatePath("/dashboard/clients/accounts-payment");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/finance");
}

export default async function AccountsPaymentPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=session.user.role as Role,workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId)redirect("/login");
  if(![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(role))redirect("/dashboard/universe");

  const rows:PaymentRow[]=Array.from(await db.execute(sql`
    select c.id,c.company_name,p.payment_day,p.responsible_name,p.phone,
      coalesce(p.currency,c.currency,'EGP') as currency,
      p.amount_due,p.amount_paid,p.amount_remaining,p.payment_ratio,p.payment_status,p.notes,
      am.name account_manager_name,mb.name media_buyer_name,
      (p.id is not null) as has_profile
    from clients c
    left join client_payment_profiles p on p.client_id=c.id and p.workspace_id=${workspaceId}
    left join users am on am.id=c.account_manager_id and am.workspace_id=${workspaceId}
    left join users mb on mb.id=c.media_buyer_id and mb.workspace_id=${workspaceId}
    where c.workspace_id=${workspaceId} and c.is_active=true
    order by (p.id is null) desc,coalesce(p.amount_remaining,0) desc,c.company_name asc
  `));

  const configured=rows.filter(r=>r.has_profile),pending=rows.filter(r=>!r.has_profile);
  const currencies=[...new Set(configured.map(r=>String(r.currency||"EGP").toUpperCase()))],singleCurrency=currencies.length===1?currencies[0]:null;
  const totalDue=configured.reduce((s,r)=>s+Number(r.amount_due||0),0),paid=configured.reduce((s,r)=>s+Number(r.amount_paid||0),0),remaining=configured.reduce((s,r)=>s+Number(r.amount_remaining||0),0),collection=totalDue?Math.round(paid/totalDue*100):0;
  const aggregate=(n:number)=>singleCurrency?money(n,singleCurrency):configured.length?"Mixed currencies":"—";

  return <div className="pay-page"><style>{`
    .pay-page{display:flex;flex-direction:column;gap:18px;min-width:0}.pay-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.pay-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pay-kpi,.pay-table-wrap,.setup-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px}.pay-kpi{padding:16px}.pay-kpi span{font-size:12px;color:var(--text-muted)}.pay-kpi b{display:block;margin-top:7px;font-size:23px}.pay-table-wrap{overflow:auto}.pay-table{width:100%;border-collapse:collapse;min-width:900px}.pay-table th,.pay-table td{padding:12px;text-align:left;border-bottom:1px solid var(--card-border);font-size:12px}.pay-table th{background:var(--bg-tertiary);color:var(--text-muted);font-size:10px;text-transform:uppercase}.pay-status{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800}.pay-status.ok{background:#ecfdf3;color:#027a48}.pay-status.warn{background:#fff7ed;color:#c2410c}.pay-status.danger{background:#fef2f2;color:#b42318}.pay-status.setup{background:#eff6ff;color:#1d4ed8}.setup-list{display:grid;gap:12px}.setup-card{padding:16px}.setup-form{display:grid;grid-template-columns:1.2fr .8fr .7fr .7fr 1.3fr auto;gap:8px;align-items:end}.setup-form label{font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase}.setup-form input{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid var(--card-border);border-radius:10px;background:var(--bg-secondary);color:var(--text-primary)}@media(max-width:1000px){.setup-form{grid-template-columns:1fr 1fr}.pay-kpis{grid-template-columns:1fr 1fr}}@media(max-width:600px){.setup-form{grid-template-columns:1fr}.pay-kpis{grid-template-columns:1fr 1fr}}
  `}</style>
    <div className="pay-head"><div><h1 className="page-title">Accounts Payment</h1><p className="page-subtitle">Finance-only setup and collection status. New clients stay visible here until their amount is configured.</p></div><Link className="btn btn-secondary" href="/dashboard/clients">Back to Clients</Link></div>

    {pending.length>0&&<section className="setup-list"><div><h2 className="card-title">Finance setup required</h2><p className="page-subtitle">{pending.length} new client{pending.length===1?"":"s"} waiting for Accountant / Super Admin.</p></div>{pending.map(r=><div className="setup-card" key={r.id}><div style={{marginBottom:12}}><b>{r.company_name}</b><div className="page-subtitle">Added by account team · AM: {r.account_manager_name||"—"} · Media: {r.media_buyer_name||"—"}</div></div><form action={saveFinanceSetup} className="setup-form"><input type="hidden" name="clientId" value={r.id}/><label>Finance contact<input name="responsibleName" required maxLength={160}/></label><label>Phone<input name="phone" required maxLength={60}/></label><label>Amount<input name="amountDue" required type="number" min="0.01" step="0.01" inputMode="decimal"/></label><label>Currency<input name="currency" required defaultValue={String(r.currency||"EGP").toUpperCase()} maxLength={3} pattern="[A-Za-z]{3}"/></label><label>Payment day<input name="paymentDay" required type="number" min="1" max="31" step="1"/></label><label>Notes<input name="notes" maxLength={1000}/></label><button className="btn btn-primary" type="submit">Save finance setup</button></form></div>)}</section>}

    <div className="pay-kpis"><div className="pay-kpi"><span>Total due</span><b>{aggregate(totalDue)}</b></div><div className="pay-kpi"><span>Collected</span><b>{aggregate(paid)}</b></div><div className="pay-kpi"><span>Outstanding</span><b>{aggregate(remaining)}</b></div><div className="pay-kpi"><span>Collection rate</span><b>{singleCurrency?`${collection}%`:configured.length?"Per currency":"—"}</b></div></div>

    <div className="pay-table-wrap"><table className="pay-table"><thead><tr><th>Client</th><th>Status</th><th>Due</th><th>Paid</th><th>Outstanding</th><th>Account team</th><th>Notes</th></tr></thead><tbody>{rows.map(r=>{const currency=String(r.currency||"EGP").toUpperCase(),status=r.has_profile?String(r.payment_status||"PENDING"):"SETUP_REQUIRED";return <tr key={r.id}><td><b>{r.company_name}</b><div>{r.has_profile?`Day ${r.payment_day||"—"}`:"Waiting for Finance"}</div></td><td><span className={`pay-status ${statusTone(status)}`}>{status}</span></td><td>{r.has_profile?money(r.amount_due,currency):"—"}</td><td>{r.has_profile?money(r.amount_paid,currency):"—"}</td><td><b>{r.has_profile?money(r.amount_remaining,currency):"—"}</b></td><td>AM: {r.account_manager_name||"—"}<br/>Media: {r.media_buyer_name||"—"}</td><td>{r.notes||"—"}</td></tr>})}</tbody></table></div>
  </div>;
}
