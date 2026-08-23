// @ts-nocheck -- Drizzle's generated team shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, payroll, leaveRequests, creatorPoints } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { Role } from "@/lib/types";

const APPROVABLE_ROLES = ["ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR", "ACCOUNTANT", "SALES", "CLIENT"] as const;

async function approveLeave(fd: FormData) {
  "use server";
  const session = await auth();
  if ((session?.user as any)?.role !== Role.SUPER_ADMIN) throw new Error("Unauthorized");
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!id || !["APPROVED", "REJECTED"].includes(status)) throw new Error("Invalid leave decision");
  const { db, leaveRequests } = await import("@/lib/db");
  const { and, eq } = await import("drizzle-orm");
  const [pending] = await db.select({ id: leaveRequests.id }).from(leaveRequests).where(and(eq(leaveRequests.id, id), eq(leaveRequests.status, "PENDING"))).limit(1);
  if (!pending) throw new Error("Leave request is no longer pending");
  await db.update(leaveRequests).set({ status: status as any, updatedAt: new Date() }).where(and(eq(leaveRequests.id, id), eq(leaveRequests.status, "PENDING")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/team");
}

async function reviewAccount(fd: FormData) {
  "use server";
  const session = await auth();
  if ((session?.user as any)?.role !== Role.SUPER_ADMIN) throw new Error("Unauthorized");
  const id = String(fd.get("id") ?? "");
  const decision = String(fd.get("decision") ?? "");
  const selectedRole = String(fd.get("selectedRole") ?? "");
  const reviewNote = String(fd.get("reviewNote") ?? "").trim().slice(0, 500);
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid account decision");

  const [record] = await db.select({ requestedRole: users.requestedRole, email: users.email, name: users.name, approvalStatus: users.approvalStatus })
    .from(users).where(and(eq(users.id, id), eq(users.workspaceId, "default"))).limit(1);
  if (!record || record.approvalStatus !== "PENDING") throw new Error("Account request is no longer pending");

  if (decision === "APPROVED") {
    const finalRole = selectedRole || String(record.requestedRole ?? "");
    if (!APPROVABLE_ROLES.includes(finalRole as any)) throw new Error("Invalid requested role");
    await db.update(users).set({
      role: finalRole as any,
      isActive: true,
      approvalStatus: "APPROVED",
      approvalNote: reviewNote || undefined,
      approvedBy: (session!.user as any).id,
      approvedAt: new Date(),
      rejectedAt: null,
      updatedAt: new Date(),
    }).where(and(eq(users.id, id), eq(users.workspaceId, "default"), eq(users.approvalStatus, "PENDING")));
  } else {
    await db.update(users).set({
      isActive: false,
      approvalStatus: "REJECTED",
      approvalNote: reviewNote || "Request rejected by Super Admin",
      rejectedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(users.id, id), eq(users.workspaceId, "default"), eq(users.approvalStatus, "PENDING")));
  }

  const { notifications, auditLogs } = await import("@/lib/db");
  await db.insert(notifications).values({
    userId: id,
    type: "ACCOUNT_REVIEW",
    title: `Account ${decision.toLowerCase()}`,
    message: decision === "APPROVED" ? "Your VIVIT ERP account is ready. You can sign in now." : reviewNote || "Your access request was not approved.",
    priority: decision === "APPROVED" ? "normal" : "high",
    link: "/login",
  });
  await db.insert(auditLogs).values({
    userId: (session!.user as any).id,
    action: `account_${decision.toLowerCase()}`,
    entity: "users",
    entityId: id,
    newValues: JSON.stringify({ selectedRole: decision === "APPROVED" ? selectedRole : null, reviewNote }),
  });

  if (process.env.RESEND_API_KEY) {
    const base = process.env.NEXTAUTH_URL || "";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "VIVIT ERP <access@vivitgroup.com>",
        to: [record.email],
        subject: `Your VIVIT ERP account was ${decision.toLowerCase()}`,
        html: decision === "APPROVED"
          ? `<p>Hello ${record.name}, your account is approved.</p><p><a href="${base}/login">Sign in</a></p>`
          : `<p>Hello ${record.name}, your request was not approved.</p><p>${reviewNote || "Contact your Super Admin for details."}</p>`,
      }),
    }).catch(() => null);
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/team");
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const now = new Date();
  const [allStaff, pendingAccounts, pendingLeaves, recentPayroll, topPoints] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
      .from(users).where(and(eq(users.workspaceId, "default"), eq(users.isActive, true))).orderBy(users.role, users.name),
    db.select({ id: users.id, name: users.name, email: users.email, requestedRole: users.requestedRole, approvalNote: users.approvalNote, createdAt: users.createdAt })
      .from(users).where(and(eq(users.workspaceId, "default"), eq(users.approvalStatus, "PENDING"))).orderBy(desc(users.createdAt)),
    db.select({ id: leaveRequests.id, userId: leaveRequests.userId, type: leaveRequests.type, fromDate: leaveRequests.fromDate, toDate: leaveRequests.toDate, days: leaveRequests.days, status: leaveRequests.status, notes: leaveRequests.reason })
      .from(leaveRequests).where(eq(leaveRequests.status, "PENDING")).orderBy(desc(leaveRequests.createdAt)),
    db.select({ userId: payroll.userId, netPay: payroll.netPay, status: payroll.status, month: payroll.month, year: payroll.year })
      .from(payroll).where(and(eq(payroll.month, now.getMonth() + 1), eq(payroll.year, now.getFullYear()))),
    db.select({ userId: creatorPoints.userId, points: creatorPoints.points, badges: creatorPoints.badges })
      .from(creatorPoints).orderBy(desc(creatorPoints.points)).limit(5),
  ]);

  const userMap = Object.fromEntries(allStaff.map((user) => [user.id, user.name]));
  const payMap = Object.fromEntries(recentPayroll.map((payment) => [payment.userId, payment]));
  const ROLE_COLORS: Record<string, string> = { SUPER_ADMIN: "red", ACCOUNT_MANAGER: "blue", MEDIA_BUYER: "amber", CREATOR: "purple", ACCOUNTANT: "green", SALES: "red", CLIENT: "gray" };
  const ROLE_ICONS: Record<string, string> = { SUPER_ADMIN: "👑", ACCOUNT_MANAGER: "🤝", MEDIA_BUYER: "📣", CREATOR: "🎨", ACCOUNTANT: "💰", SALES: "🎯", CLIENT: "🏠" };
  const totalPayroll = recentPayroll.reduce((sumValue, payment) => sumValue + Number(payment.netPay ?? 0), 0);
  const fmt = (value: number) => `${Math.round(Number(value) || 0).toLocaleString("en-EG")} EGP`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 className="page-title">HR & Team</h1>
        <p className="page-subtitle">{allStaff.length} active staff · {pendingAccounts.length} pending account requests · {pendingLeaves.length} pending leave requests</p>
      </div>

      <div className="card" style={{ border: pendingAccounts.length ? "1px solid #EFB324" : "1px solid var(--card-border)" }}>
        <div className="card-header"><p className="card-title">🔐 Account Approval Requests</p>{pendingAccounts.length > 0 && <span className="badge badge-amber">{pendingAccounts.length} waiting</span>}</div>
        <div className="card-body" style={{ display: "grid", gap: "10px" }}>
          {pendingAccounts.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>✅ No pending account requests</p> : pendingAccounts.map((user) => (
            <div key={user.id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center" style={{ padding: "14px", borderRadius: "10px", background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
              <div className="min-w-0"><p style={{ fontWeight: 800, color: "var(--text-primary)" }}>{user.name}</p><p className="break-all" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>{user.email} · Requested: <strong>{user.requestedRole?.replace(/_/g, " ")}</strong></p>{user.approvalNote && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "7px" }}>“{user.approvalNote}”</p>}</div>
              <div className="grid gap-2 w-full lg:w-auto">
                <form action={reviewAccount} className="flex flex-col sm:flex-row gap-2"><input type="hidden" name="id" value={user.id} /><input type="hidden" name="decision" value="APPROVED" /><select name="selectedRole" defaultValue={user.requestedRole ?? "CLIENT"} className="form-select" style={{ fontSize: "11px", padding: "7px" }}>{APPROVABLE_ROLES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select><button className="btn btn-success btn-sm" type="submit">Approve ✓</button></form>
                <form action={reviewAccount} className="flex flex-col sm:flex-row gap-2"><input type="hidden" name="id" value={user.id} /><input type="hidden" name="decision" value="REJECTED" /><input name="reviewNote" maxLength={500} className="form-input" placeholder="Reason (optional)" style={{ fontSize: "11px", padding: "7px" }} /><button className="btn btn-danger btn-sm" type="submit">Reject</button></form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Team Size", value: String(allStaff.length), icon: "👥", color: "blue" },
          { label: "Monthly Payroll", value: fmt(totalPayroll), icon: "💰", color: "green" },
          { label: "Pending Leaves", value: String(pendingLeaves.length), icon: "📋", color: pendingLeaves.length > 0 ? "amber" : "green" },
          { label: "Creators", value: String(allStaff.filter((user) => user.role === "CREATOR").length), icon: "🎨", color: "purple" },
        ].map((item) => <div key={item.label} className={`kpi-card ${item.color}`}><div className="kpi-icon">{item.icon}</div><div className="kpi-label">{item.label}</div><div className="kpi-value" style={{ fontSize: "1.35rem" }}>{item.value}</div></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-4">
        <div className="card min-w-0">
          <div className="card-header"><p className="card-title">Staff Directory</p></div>
          <div className="card-body-flush overflow-x-auto">
            <table className="data-table min-w-[680px]">
              <thead><tr><th>Name</th><th>Role</th><th>This Month</th><th>Last Login</th></tr></thead>
              <tbody>{allStaff.map((user) => {
                const payment = payMap[user.id];
                const initials = user.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2);
                return <tr key={user.id}><td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="avatar avatar-sm" style={{ background: "var(--vivit-gradient)", fontSize: "11px" }}>{initials}</div><div><p style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)" }}>{user.name}</p><p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</p></div></div></td><td><span className={`badge badge-${ROLE_COLORS[user.role] ?? "gray"}`} style={{ fontSize: "11px" }}>{ROLE_ICONS[user.role] ?? ""} {user.role.replace(/_/g, " ")}</span></td><td style={{ fontWeight: 700, color: "var(--green)", fontSize: "13px" }}>{payment ? fmt(Number(payment.netPay)) : "—"}</td><td style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Never"}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <div className="card-header"><p className="card-title">Leave Requests</p>{pendingLeaves.length > 0 && <span className="badge badge-amber">{pendingLeaves.length} pending</span>}</div>
            <div className="card-body" style={{ padding: "8px" }}>
              {pendingLeaves.length === 0 ? <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>✅ No pending requests</p> : pendingLeaves.map((leave) => (
                <div key={leave.id} style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--bg-tertiary)", marginBottom: "6px", border: "1px solid var(--card-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}><p style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{userMap[leave.userId] ?? leave.userId}</p><span className="badge badge-amber" style={{ fontSize: "10px" }}>{leave.type}</span></div>
                  <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "8px" }}>{new Date(leave.fromDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} → {new Date(leave.toDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {leave.days} day{Number(leave.days) !== 1 ? "s" : ""}</p>
                  <div style={{ display: "flex", gap: "6px" }}><form action={approveLeave} style={{ flex: 1 }}><input type="hidden" name="id" value={leave.id} /><input type="hidden" name="status" value="APPROVED" /><button type="submit" className="btn btn-success btn-sm" style={{ width: "100%", justifyContent: "center" }}>Approve ✓</button></form><form action={approveLeave} style={{ flex: 1 }}><input type="hidden" name="id" value={leave.id} /><input type="hidden" name="status" value="REJECTED" /><button type="submit" className="btn btn-danger btn-sm" style={{ width: "100%", justifyContent: "center" }}>Reject ✗</button></form></div>
                </div>
              ))}
            </div>
          </div>

          {topPoints.length > 0 && <div className="card"><div className="card-header"><p className="card-title">🏆 Creator Leaderboard</p></div><div className="card-body" style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>{topPoints.map((entry, index) => { const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]; return <div key={entry.userId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px", background: "var(--bg-tertiary)" }}><span style={{ fontSize: "18px", width: "24px" }}>{medals[index]}</span><div className="avatar avatar-sm">{userMap[entry.userId]?.split(" ").map((part: string) => part[0]).join("").slice(0, 2) ?? ""}</div><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{userMap[entry.userId]?.split(" ")[0] ?? entry.userId.slice(0, 8)}</p><p className="truncate" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{entry.badges}</p></div><span style={{ fontWeight: 800, fontSize: "16px", color: "var(--amber)", fontFamily: "Sora,sans-serif" }}>{entry.points}</span></div>; })}</div></div>}
        </div>
      </div>
    </div>
  );
}
