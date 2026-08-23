export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, payroll, users } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

export default async function ConfidentialPayrollPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes(role)) redirect("/dashboard");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const rows = await db.select({
    userId: payroll.userId,
    name: users.name,
    role: users.role,
    baseSalary: payroll.baseSalary,
    bonus: payroll.bonus,
    deductions: payroll.deductions,
    netPay: payroll.netPay,
    status: payroll.status,
  }).from(payroll).innerJoin(users, eq(users.id, payroll.userId))
    .where(and(eq(payroll.workspaceId, "default"), eq(payroll.month, month), eq(payroll.year, year)))
    .orderBy(users.name);

  const total = rows.reduce((sum, r) => sum + Number(r.netPay || 0), 0);
  const fmt = (n:number) => `EGP ${n.toLocaleString("en-US")}`;

  return <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
      <div><h1 className="page-title">Confidential Payroll</h1><p className="page-subtitle">Visible only to Accountant and Super Admin · {month}/{year}</p></div>
      <Link href="/dashboard/finance" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>← Finance</Link>
    </div>
    <div className="kpi-card green"><div className="kpi-label">Monthly Payroll</div><div className="kpi-value">{fmt(total)}</div></div>
    <div className="card"><div className="card-header"><p className="card-title">Employee Salaries</p><span className="badge badge-red">Confidential</span></div><div className="card-body-flush"><table className="data-table"><thead><tr><th>Employee</th><th>Role</th><th>Base</th><th>Bonus</th><th>Deductions</th><th>Net</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.userId}><td style={{fontWeight:700}}>{r.name}</td><td>{String(r.role).replace(/_/g," ")}</td><td>{fmt(Number(r.baseSalary||0))}</td><td>{fmt(Number(r.bonus||0))}</td><td>{fmt(Number(r.deductions||0))}</td><td style={{fontWeight:800}}>{fmt(Number(r.netPay||0))}</td><td><span className="badge badge-green">{r.status}</span></td></tr>)}</tbody></table></div></div>
  </div>;
}
