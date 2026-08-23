// @ts-nocheck -- Drizzle's generated finance shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, financeRecords, companyExpenses, clients } from "@/lib/db";
import { eq, desc, sum, gte, and } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

async function createInvoice(fd: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || ![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, financeRecords, clients } = await import("@/lib/db");
  const { and, eq } = await import("drizzle-orm");
  const clientId = String(fd.get("clientId") ?? "");
  const month = Number.parseInt(String(fd.get("month") ?? ""), 10);
  const year = Number.parseInt(String(fd.get("year") ?? ""), 10) || new Date().getFullYear();
  const retainer = Number.parseFloat(String(fd.get("retainer") ?? "0"));
  const adSpend = Number.parseFloat(String(fd.get("adSpend") ?? "0"));
  if (!clientId || !Number.isInteger(month) || month < 1 || month > 12 || year < 2020 || year > 2100) throw new Error("Invalid invoice period");
  if (!Number.isFinite(retainer) || !Number.isFinite(adSpend) || retainer < 0 || adSpend < 0) throw new Error("Amounts must be zero or greater");
  const [client] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.workspaceId, "default"), eq(clients.isActive, true))).limit(1);
  if (!client) throw new Error("Invalid active client");
  const agencyFee = adSpend * 0.2;
  const total = retainer + agencyFee;
  const dueDate = new Date(year, month - 1, 5);
  await db.insert(financeRecords).values({
    workspaceId: "default",
    clientId,
    month,
    year,
    retainer,
    mediaBuyingFee: agencyFee,
    totalRevenue: total,
    paid: 0,
    outstanding: total,
    invoiceStatus: "SENT",
    dueDate,
    invoiceNumber: `INV-${year}-${String(month).padStart(2, "0")}-${clientId.slice(0, 4).toUpperCase()}`,
    commissionRate: 10,
  }).onConflictDoNothing();
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

async function logExpense(fd: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || ![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, companyExpenses } = await import("@/lib/db");
  const category = String(fd.get("category") ?? "Other").trim().slice(0, 80);
  const description = String(fd.get("description") ?? "").trim().slice(0, 500);
  const amount = Number.parseFloat(String(fd.get("amount") ?? "0"));
  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Expense amount must be greater than zero");
  await db.insert(companyExpenses).values({
    category,
    description,
    amount,
    date: new Date(),
    approvedBy: (session.user as any).id,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

async function markPaid(fd: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || ![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, financeRecords } = await import("@/lib/db");
  const { and, eq } = await import("drizzle-orm");
  const id = String(fd.get("id") ?? "");
  const [record] = await db.select().from(financeRecords).where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, "default"))).limit(1);
  if (!record) return;
  await db.update(financeRecords).set({
    paid: record.totalRevenue,
    outstanding: 0,
    invoiceStatus: "PAID",
    updatedAt: new Date(),
  }).where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, "default")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/finance");
}

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes(role)) redirect("/dashboard");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const yrStart = new Date(year, 0, 1);

  const [recentRecords, agingRows, allClients, expensesYTD, recentExpenses, ytdFinance] = await Promise.all([
    db.select({
      id: financeRecords.id, clientId: financeRecords.clientId,
      month: financeRecords.month, year: financeRecords.year,
      retainer: financeRecords.retainer, totalRevenue: financeRecords.totalRevenue,
      paid: financeRecords.paid, outstanding: financeRecords.outstanding,
      invoiceStatus: financeRecords.invoiceStatus, dueDate: financeRecords.dueDate,
      invoiceNumber: financeRecords.invoiceNumber, createdAt: financeRecords.createdAt,
    }).from(financeRecords).where(eq(financeRecords.workspaceId, "default")).orderBy(desc(financeRecords.createdAt)).limit(50),
    db.select({
      id: financeRecords.id, clientId: financeRecords.clientId,
      outstanding: financeRecords.outstanding, dueDate: financeRecords.dueDate,
    }).from(financeRecords).where(eq(financeRecords.workspaceId, "default")),
    db.select({ id: clients.id, companyName: clients.companyName, monthlyRetainer: clients.monthlyRetainer })
      .from(clients).where(and(eq(clients.workspaceId, "default"), eq(clients.isActive, true))),
    db.select({ total: sum(companyExpenses.amount), category: companyExpenses.category })
      .from(companyExpenses).where(gte(companyExpenses.date, yrStart)).groupBy(companyExpenses.category),
    db.select().from(companyExpenses).orderBy(desc(companyExpenses.date)).limit(10),
    db.select({ revenue: sum(financeRecords.totalRevenue), paid: sum(financeRecords.paid) })
      .from(financeRecords).where(and(eq(financeRecords.workspaceId, "default"), eq(financeRecords.year, year))),
  ]);

  const clientMap = Object.fromEntries(allClients.map((client) => [client.id, client.companyName]));
  const fmt = (value: number) => `${Math.round(Number(value) || 0).toLocaleString("en-EG")} EGP`;
  const ytdRev = Number(ytdFinance[0]?.revenue ?? 0);
  const ytdPaid = Number(ytdFinance[0]?.paid ?? 0);
  const outstanding = agingRows.reduce((sumValue, record) => sumValue + Math.max(0, Number(record.outstanding ?? 0)), 0);
  const totalExp = expensesYTD.reduce((sumValue, expense) => sumValue + Number(expense.total ?? 0), 0);
  const collRate = ytdRev > 0 ? Math.round((ytdPaid / ytdRev) * 100) : 0;

  const bucket = (record: typeof agingRows[0]) => {
    if (!record.dueDate || Number(record.outstanding) <= 0) return "paid";
    const days = Math.floor((now.getTime() - new Date(record.dueDate).getTime()) / 86400000);
    if (days <= 0) return "current";
    if (days <= 30) return "1-30";
    if (days <= 60) return "31-60";
    return "60+";
  };
  const aging = {
    current: agingRows.filter((record) => bucket(record) === "current"),
    "1-30": agingRows.filter((record) => bucket(record) === "1-30"),
    "31-60": agingRows.filter((record) => bucket(record) === "31-60"),
    "60+": agingRows.filter((record) => bucket(record) === "60+"),
  };

  const STATUS_COLORS: Record<string, string> = {
    PAID: "badge-green", SENT: "badge-amber", OVERDUE: "badge-red", DRAFT: "badge-gray",
  };
  const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-subtitle">Invoicing · AR Aging · Expenses · Cash Flow</p>
        </div>
        <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Export</Link>
      </div>

      <div className="finance-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "12px" }}>
        {[
          { label: "YTD Revenue", value: fmt(ytdRev), icon: "💰", color: "blue" },
          { label: "Collected", value: fmt(ytdPaid), icon: "✅", color: "green" },
          { label: "Outstanding", value: fmt(outstanding), icon: "⏳", color: outstanding > 10000 ? "red" : "amber" },
          { label: "YTD Expenses", value: fmt(totalExp), icon: "📊", color: "purple" },
          { label: "Collection Rate", value: `${collRate}%`, icon: "📈", color: collRate >= 90 ? "green" : collRate >= 75 ? "amber" : "red" },
        ].map((item) => (
          <div key={item.label} className={`kpi-card ${item.color}`}>
            <div className="kpi-icon">{item.icon}</div>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value" style={{ fontSize: "1.4rem" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <p className="card-title">AR Aging Report</p>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total outstanding: <strong style={{ color: "var(--red)" }}>{fmt(outstanding)}</strong></span>
        </div>
        <div className="card-body">
          <div className="aging-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px" }}>
            {[
              { label: "Current", items: aging.current, color: "var(--text-muted)", icon: "🟢" },
              { label: "1-30 Days", items: aging["1-30"], color: "var(--amber)", icon: "🟡" },
              { label: "31-60 Days", items: aging["31-60"], color: "var(--red)", icon: "🟠" },
              { label: "60+ Days", items: aging["60+"], color: "var(--red)", icon: "🔴" },
            ].map((group) => {
              const total = group.items.reduce((sumValue, record) => sumValue + Number(record.outstanding ?? 0), 0);
              return (
                <div key={group.label} style={{ padding: "16px", borderRadius: "var(--radius-sm)", border: `1px solid ${group.color}33`, background: `${group.color}08` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>{group.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>{group.label}</span>
                  </div>
                  <p style={{ fontSize: "22px", fontWeight: 800, fontFamily: "Sora,sans-serif", color: group.color }}>{fmt(total)}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{group.items.length} invoice{group.items.length !== 1 ? "s" : ""}</p>
                  {group.items.slice(0, 2).map((record) => (
                    <p key={record.id} style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      · {clientMap[record.clientId] ?? record.clientId.slice(0, 12)}: {fmt(Number(record.outstanding))}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="finance-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="card" style={{ borderTop: "3px solid var(--vivit-blue)" }}>
          <div className="card-header"><p className="card-title">🧙 Generate Invoice</p></div>
          <div className="card-body">
            <form action={createInvoice} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="invoice-field-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Client *</label>
                  <select name="clientId" required className="form-select"><option value="">Select client...</option>{allClients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}</select>
                </div>
                <div>
                  <label className="form-label">Month</label>
                  <select name="month" defaultValue={month} className="form-select">{MONTHS.slice(1).map((label, index) => <option key={index + 1} value={index + 1}>{label}</option>)}</select>
                </div>
                <div>
                  <label className="form-label">Retainer (EGP) *</label>
                  <input name="retainer" type="number" min="0" step="0.01" required placeholder="5,000" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Ad Spend (EGP) <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>+20% fee</span></label>
                  <input name="adSpend" type="number" min="0" step="0.01" placeholder="10,000" className="form-input" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full">Generate Invoice →</button>
            </form>
          </div>
        </div>

        <div className="card" style={{ borderTop: "3px solid var(--amber)" }}>
          <div className="card-header"><p className="card-title">⚡ Expense Quick-Log</p></div>
          <div className="card-body">
            <form action={logExpense} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label className="form-label">Category</label><select name="category" className="form-select">{["Salaries", "Freelancers", "Tools", "Office", "Production", "Advertising", "Travel", "Other"].map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
              <div><label className="form-label">Description *</label><input name="description" required maxLength={500} placeholder="e.g. Adobe CC subscription" className="form-input" /></div>
              <div><label className="form-label">Amount (EGP) *</label><input name="amount" type="number" min="0.01" step="0.01" required placeholder="249" className="form-input" /></div>
              <button type="submit" className="btn btn-primary w-full" style={{ background: "linear-gradient(135deg,#D97706,#F59E0B)" }}>Log Expense</button>
            </form>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <p className="card-title">Invoices ({recentRecords.length} recent)</p>
          <div style={{ display: "flex", gap: "6px" }}><span className="badge badge-green">{recentRecords.filter((record) => record.invoiceStatus === "PAID").length} Paid</span><span className="badge badge-amber">{recentRecords.filter((record) => record.invoiceStatus === "SENT").length} Pending</span></div>
        </div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Period</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {recentRecords.map((record) => (
                <tr key={record.id}>
                  <td style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--vivit-blue)", fontWeight: 600 }}>{record.invoiceNumber ?? `INV-${record.id.slice(0, 8)}`}</td>
                  <td style={{ fontWeight: 600 }}>{clientMap[record.clientId] ?? record.clientId.slice(0, 12)}</td>
                  <td style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{MONTHS[record.month as number]} {record.year}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(Number(record.totalRevenue))}</td>
                  <td style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(Number(record.paid))}</td>
                  <td style={{ color: Number(record.outstanding) > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{fmt(Number(record.outstanding))}</td>
                  <td><span className={`badge ${STATUS_COLORS[record.invoiceStatus ?? "SENT"]}`} style={{ fontSize: "11px" }}>{record.invoiceStatus}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Link href={`/api/pdf-report/${record.clientId}?month=${record.month}&year=${record.year}`} target="_blank" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", fontSize: "11px", padding: "4px 10px" }}>📄 PDF</Link>
                      {record.invoiceStatus !== "PAID" && <form action={markPaid}><input type="hidden" name="id" value={record.id} /><button type="submit" className="btn btn-success btn-sm" style={{ fontSize: "11px", padding: "4px 10px" }}>✓ Paid</button></form>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><p className="card-title">Recent Expenses</p><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>YTD: <strong style={{ color: "var(--red)" }}>{fmt(totalExp)}</strong></span></div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>{recentExpenses.map((expense) => <tr key={expense.id}><td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{new Date(expense.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td><td><span className="badge badge-gray" style={{ fontSize: "11px" }}>{expense.category}</span></td><td style={{ fontSize: "13px" }}>{expense.description}</td><td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmt(Number(expense.amount))}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
