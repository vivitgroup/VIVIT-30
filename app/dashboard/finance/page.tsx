// @ts-nocheck -- Drizzle's generated finance shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, financeRecords, companyExpenses, clients, paymentRecords } from "@/lib/db";
import { eq, desc, sum, gte, and, lt, lte } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

async function createInvoice(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, financeRecords } = await import("@/lib/db");
  const clientId  = fd.get("clientId") as string;
  const month     = parseInt(fd.get("month") as string) || new Date().getMonth()+1;
  const year      = parseInt(fd.get("year") as string)  || new Date().getFullYear();
  const retainer  = parseFloat(fd.get("retainer") as string) || 0;
  const adSpend   = parseFloat(fd.get("adSpend") as string)  || 0;
  const agencyFee = adSpend * 0.2;
  const total     = retainer + agencyFee;
  const dueDate   = new Date(year, month, 5);
  await db.insert(financeRecords).values({
    clientId, month, year, retainer, totalRevenue:total,
    paid:0, outstanding:total,
    invoiceStatus:"SENT",
    dueDate,
    invoiceNumber:`INV-${year}-${String(month).padStart(2,"0")}-${clientId.slice(0,4).toUpperCase()}`,
    commissionRate:10,
  }).onConflictDoNothing();
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

async function logExpense(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, companyExpenses } = await import("@/lib/db");
  await db.insert(companyExpenses).values({
    category:    fd.get("category") as string,
    description: fd.get("description") as string,
    amount:      parseFloat(fd.get("amount") as string) || 0,
    date:        new Date(),
    approvedBy:  (session.user as any).id,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

async function markPaid(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, financeRecords } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const id = fd.get("id") as string;
  const [r] = await db.select().from(financeRecords).where(eq(financeRecords.id,id));
  if (!r) return;
  await db.update(financeRecords).set({
    paid:r.totalRevenue, outstanding:0, invoiceStatus:"PAID", updatedAt:new Date()
  }).where(eq(financeRecords.id,id));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(role)) redirect("/dashboard");

  const now   = new Date();
  const month = now.getMonth()+1;
  const year  = now.getFullYear();
  const yrStart = new Date(year,0,1);

  const [allRecords, allClients, expensesYTD, recentExpenses] = await Promise.all([
    db.select({
      id:financeRecords.id, clientId:financeRecords.clientId,
      month:financeRecords.month, year:financeRecords.year,
      retainer:financeRecords.retainer, totalRevenue:financeRecords.totalRevenue,
      paid:financeRecords.paid, outstanding:financeRecords.outstanding,
      invoiceStatus:financeRecords.invoiceStatus, dueDate:financeRecords.dueDate,
      invoiceNumber:financeRecords.invoiceNumber, createdAt:financeRecords.createdAt,
    }).from(financeRecords).orderBy(desc(financeRecords.createdAt)).limit(50),
    db.select({id:clients.id,companyName:clients.companyName,monthlyRetainer:clients.monthlyRetainer})
      .from(clients).where(eq(clients.isActive,true)),
    db.select({total:sum(companyExpenses.amount),category:companyExpenses.category})
      .from(companyExpenses).where(gte(companyExpenses.date,yrStart))
      .groupBy(companyExpenses.category),
    db.select().from(companyExpenses).orderBy(desc(companyExpenses.date)).limit(10),
  ]);

  const clientMap = Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));
  const fmt = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  // KPIs
  const ytdRev     = allRecords.filter(r=>r.year===year).reduce((s,r)=>s+Number(r.totalRevenue),0);
  const ytdPaid    = allRecords.filter(r=>r.year===year).reduce((s,r)=>s+Number(r.paid),0);
  const outstanding= allRecords.filter(r=>Number(r.outstanding)>0).reduce((s,r)=>s+Number(r.outstanding),0);
  const totalExp   = expensesYTD.reduce((s,e)=>s+Number(e.total),0);
  const collRate   = ytdRev>0?Math.round(ytdPaid/ytdRev*100):0;

  // AR Aging buckets
  const bucket = (r: typeof allRecords[0]) => {
    if (!r.dueDate || Number(r.outstanding)<=0) return "paid";
    const days = Math.floor((now.getTime()-new Date(r.dueDate).getTime())/86400000);
    if (days<=0)  return "current";
    if (days<=30) return "1-30";
    if (days<=60) return "31-60";
    return "60+";
  };
  const aging = {
    current: allRecords.filter(r=>bucket(r)==="current"),
    "1-30":  allRecords.filter(r=>bucket(r)==="1-30"),
    "31-60": allRecords.filter(r=>bucket(r)==="31-60"),
    "60+":   allRecords.filter(r=>bucket(r)==="60+"),
  };

  const STATUS_COLORS: Record<string,string> = {
    PAID:"badge-green", SENT:"badge-amber", OVERDUE:"badge-red", DRAFT:"badge-gray"
  };
  const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-subtitle">Invoicing · AR Aging · Expenses · Cash Flow</p>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Export</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="finance-kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:"12px"}}>
        {[
          {label:"YTD Revenue",    value:fmt(ytdRev),          icon:"💰",color:"blue"},
          {label:"Collected",      value:fmt(ytdPaid),          icon:"✅",color:"green"},
          {label:"Outstanding",    value:fmt(outstanding),      icon:"⏳",color:outstanding>10000?"red":"amber"},
          {label:"YTD Expenses",   value:fmt(totalExp),         icon:"📊",color:"purple"},
          {label:"Collection Rate",value:`${collRate}%`,        icon:"📈",color:collRate>=90?"green":collRate>=75?"amber":"red"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.4rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* AR Aging */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">AR Aging Report</p>
          <span style={{fontSize:"12px",color:"var(--text-muted)"}}>Total outstanding: <strong style={{color:"var(--red)"}}>{fmt(outstanding)}</strong></span>
        </div>
        <div className="card-body">
          <div className="aging-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"12px"}}>
            {[
              {label:"Current",  items:aging.current, color:"var(--text-muted)", icon:"🟢"},
              {label:"1-30 Days",items:aging["1-30"], color:"var(--amber)",      icon:"🟡"},
              {label:"31-60 Days",items:aging["31-60"],color:"var(--red)",       icon:"🟠"},
              {label:"60+ Days", items:aging["60+"],  color:"var(--red)",        icon:"🔴"},
            ].map(b=>{
              const total = b.items.reduce((s,r)=>s+Number(r.outstanding),0);
              return (
                <div key={b.label} style={{
                  padding:"16px",borderRadius:"var(--radius-sm)",
                  border:`1px solid ${b.color}33`,
                  background:`${b.color}08`
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px"}}>
                    <span style={{fontSize:"16px"}}>{b.icon}</span>
                    <span style={{fontSize:"12px",fontWeight:700,color:"var(--text-secondary)"}}>{b.label}</span>
                  </div>
                  <p style={{fontSize:"22px",fontWeight:800,fontFamily:"Sora,sans-serif",color:b.color}}>{fmt(total)}</p>
                  <p style={{fontSize:"11px",color:"var(--text-muted)",marginTop:"4px"}}>{b.items.length} invoice{b.items.length!==1?"s":""}</p>
                  {b.items.slice(0,2).map(r=>(
                    <p key={r.id} style={{fontSize:"11px",color:"var(--text-muted)",marginTop:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      · {clientMap[r.clientId]??r.clientId.slice(0,12)}: {fmt(Number(r.outstanding))}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice Wizard + Expense Quick-Log */}
      <div className="finance-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>

        {/* Invoice Wizard */}
        <div className="card" style={{borderTop:"3px solid var(--vivit-blue)"}}>
          <div className="card-header">
            <p className="card-title">🧙 Generate Invoice</p>
          </div>
          <div className="card-body">
            <form action={createInvoice} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div className="invoice-field-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                <div>
                  <label className="form-label">Client *</label>
                  <select name="clientId" required className="form-select">
                    <option value="">Select client...</option>
                    {allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Month</label>
                  <select name="month" defaultValue={month} className="form-select">
                    {MONTHS.slice(1).map((m,i)=>(
                      <option key={i+1} value={i+1} selected={i+1===month}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Retainer ($) *</label>
                  <input name="retainer" type="number" required placeholder="5,000" className="form-input"/>
                </div>
                <div>
                  <label className="form-label">Ad Spend ($) <span style={{fontWeight:400,color:"var(--text-muted)"}}>+20% fee</span></label>
                  <input name="adSpend" type="number" placeholder="10,000" className="form-input"/>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full">Generate Invoice →</button>
            </form>
          </div>
        </div>

        {/* Expense Quick-Log */}
        <div className="card" style={{borderTop:"3px solid var(--amber)"}}>
          <div className="card-header">
            <p className="card-title">⚡ Expense Quick-Log</p>
          </div>
          <div className="card-body">
            <form action={logExpense} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <label className="form-label">Category</label>
                <select name="category" className="form-select">
                  {["Salaries","Freelancers","Tools","Office","Production","Advertising","Travel","Other"]
                    .map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Description *</label>
                <input name="description" required placeholder="e.g. Adobe CC subscription" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Amount ($) *</label>
                <input name="amount" type="number" step="0.01" required placeholder="249" className="form-input"/>
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{background:"linear-gradient(135deg,#D97706,#F59E0B)"}}>Log Expense</button>
            </form>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Invoices ({allRecords.length})</p>
          <div style={{display:"flex",gap:"6px"}}>
            <span className="badge badge-green">{allRecords.filter(r=>r.invoiceStatus==="PAID").length} Paid</span>
            <span className="badge badge-amber">{allRecords.filter(r=>r.invoiceStatus==="SENT").length} Pending</span>
          </div>
        </div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Client</th><th>Period</th>
              <th>Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {allRecords.map(r=>(
                <tr key={r.id}>
                  <td style={{fontSize:"12px",fontFamily:"monospace",color:"var(--vivit-blue)",fontWeight:600}}>
                    {r.invoiceNumber ?? `INV-${r.id.slice(0,8)}`}
                  </td>
                  <td style={{fontWeight:600}}>{clientMap[r.clientId]??r.clientId.slice(0,12)}</td>
                  <td style={{fontSize:"12.5px",color:"var(--text-muted)"}}>
                    {MONTHS[r.month as number]} {r.year}
                  </td>
                  <td style={{fontWeight:700}}>{fmt(Number(r.totalRevenue))}</td>
                  <td style={{color:"var(--green)",fontWeight:700}}>{fmt(Number(r.paid))}</td>
                  <td style={{color:Number(r.outstanding)>0?"var(--red)":"var(--green)",fontWeight:700}}>
                    {fmt(Number(r.outstanding))}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[r.invoiceStatus??'SENT']}`} style={{fontSize:"11px"}}>
                      {r.invoiceStatus}
                    </span>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:"4px"}}>
                      <Link href={`/api/pdf-report/${r.clientId}?month=${r.month}&year=${r.year}`}
                        target="_blank" className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"11px",padding:"4px 10px"}}>
                        📄 PDF
                      </Link>
                      {r.invoiceStatus!=="PAID"&&(
                        <form action={markPaid}>
                          <input type="hidden" name="id" value={r.id}/>
                          <button type="submit" className="btn btn-success btn-sm" style={{fontSize:"11px",padding:"4px 10px"}}>
                            ✓ Paid
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Recent Expenses</p>
          <span style={{fontSize:"12px",color:"var(--text-muted)"}}>YTD: <strong style={{color:"var(--red)"}}>{fmt(totalExp)}</strong></span>
        </div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              {recentExpenses.map(e=>(
                <tr key={e.id}>
                  <td style={{fontSize:"12px",color:"var(--text-muted)"}}>{new Date(e.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</td>
                  <td><span className="badge badge-gray" style={{fontSize:"11px"}}>{e.category}</span></td>
                  <td style={{fontSize:"13px"}}>{e.description}</td>
                  <td style={{fontWeight:700,color:"var(--text-primary)"}}>${Number(e.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
