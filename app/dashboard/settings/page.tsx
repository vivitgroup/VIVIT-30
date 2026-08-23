// @ts-nocheck -- Drizzle's generated settings shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, workspaceRoles } from "@/lib/db";
import { and, count, eq } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

const SYSTEM_ROLES = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR", "ACCOUNTANT", "SALES", "CLIENT"] as const;

async function requireSuperAdmin() {
  "use server";
  const session = await auth();
  if (!session?.user || (session.user as any).role !== Role.SUPER_ADMIN) throw new Error("Unauthorized");
  return session;
}

async function updateUserRole(fd: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const userId = String(fd.get("userId") ?? "");
  const nextRole = String(fd.get("role") ?? "");
  if (!userId || !SYSTEM_ROLES.includes(nextRole as any)) throw new Error("Invalid role");
  if (userId === (session.user as any).id && nextRole !== "SUPER_ADMIN") throw new Error("You cannot remove your own Super Admin access");

  const [target] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users).where(and(eq(users.id, userId), eq(users.workspaceId, "default"))).limit(1);
  if (!target) throw new Error("User not found");
  if (target.role === "SUPER_ADMIN" && target.isActive && nextRole !== "SUPER_ADMIN") {
    const [admins] = await db.select({ total: count() }).from(users).where(and(eq(users.workspaceId, "default"), eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true)));
    if (Number(admins?.total ?? 0) <= 1) throw new Error("At least one active Super Admin is required");
  }

  await db.update(users).set({ role: nextRole as any, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.workspaceId, "default")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

async function toggleUserStatus(fd: FormData) {
  "use server";
  const session = await requireSuperAdmin();
  const userId = String(fd.get("userId") ?? "");
  if (!userId) throw new Error("User is required");
  if (userId === (session.user as any).id) throw new Error("You cannot suspend your own account");

  const [target] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users).where(and(eq(users.id, userId), eq(users.workspaceId, "default"))).limit(1);
  if (!target) throw new Error("User not found");
  if (target.role === "SUPER_ADMIN" && target.isActive) {
    const [admins] = await db.select({ total: count() }).from(users).where(and(eq(users.workspaceId, "default"), eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true)));
    if (Number(admins?.total ?? 0) <= 1) throw new Error("At least one active Super Admin is required");
  }

  await db.update(users).set({ isActive: !target.isActive, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.workspaceId, "default")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;

  if (role !== Role.SUPER_ADMIN) {
    return <div className="settings-personal">
      <div className="settings-hero"><span>⚙️</span><div><h1 className="page-title">Account Settings</h1><p className="page-subtitle">Your preferences and account access</p></div></div>
      <div className="settings-grid">
        <section className="card"><div className="card-body"><h2 className="card-title">Profile</h2><div className="settings-row"><span>Name</span><strong>{session.user.name || "—"}</strong></div><div className="settings-row"><span>Email</span><strong className="break-all">{session.user.email || "—"}</strong></div><div className="settings-row"><span>Role</span><span className="badge badge-blue">{String(role).replace(/_/g, " ")}</span></div></div></section>
        <section className="card"><div className="card-body"><h2 className="card-title">Preferences</h2><p className="page-subtitle">Use the عربي / English control in the top bar to change language. Your choice is saved on this device.</p><p className="page-subtitle" style={{ marginTop: 12 }}>Theme and navigation controls are available in the app shell.</p></div></section>
        <section className="card"><div className="card-body"><h2 className="card-title">Permissions</h2><p className="page-subtitle">Your access is managed by the Super Admin. Contact them if your responsibilities change.</p></div></section>
      </div>
    </div>;
  }

  const [allUsers, systemRoles] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt })
      .from(users).where(eq(users.workspaceId, "default")).orderBy(users.role, users.name),
    db.select().from(workspaceRoles).where(and(eq(workspaceRoles.workspaceId, "default"), eq(workspaceRoles.isSystem, true))).orderBy(workspaceRoles.name),
  ]);
  const activeUsers = allUsers.filter((user) => user.isActive);
  const suspendedUsers = allUsers.filter((user) => !user.isActive);
  const ROLE_COLORS: Record<string, string> = { SUPER_ADMIN: "red", ACCOUNT_MANAGER: "blue", MEDIA_BUYER: "amber", CREATOR: "purple", ACCOUNTANT: "green", SALES: "red", CLIENT: "gray" };
  const ROLE_ICONS: Record<string, string> = { SUPER_ADMIN: "👑", ACCOUNT_MANAGER: "🤝", MEDIA_BUYER: "📣", CREATOR: "🎨", ACCOUNTANT: "💰", SALES: "🎯", CLIENT: "🏠" };

  const security = [
    { icon: "✅", label: "CSRF protection", status: "Active", desc: "Cross-origin mutations are rejected by the application proxy.", ok: true },
    { icon: "✅", label: "Secure sessions", status: "Active", desc: "Auth.js sessions and protected dashboard/API routes.", ok: true },
    { icon: "✅", label: "Password hashing", status: "Active", desc: "New and reset passwords use bcrypt hashing.", ok: true },
    { icon: "✅", label: "Content Security Policy", status: "Active", desc: "CSP, HSTS and clickjacking protections are set on application responses.", ok: true },
    { icon: "✅", label: "Role-based access", status: "Active", desc: "Page and API access is restricted by user role and client assignment.", ok: true },
    { icon: "✅", label: "Supabase RLS", status: "Enabled", desc: "RLS is enabled on the application tables; application access remains server-side scoped.", ok: true },
    { icon: process.env.RESEND_API_KEY ? "✅" : "⚠️", label: "Email verification & recovery", status: process.env.RESEND_API_KEY ? "Configured" : "Not configured", desc: process.env.RESEND_API_KEY ? "OTP verification and password-reset email delivery are available." : "Configure Resend before relying on email OTP or password recovery.", ok: Boolean(process.env.RESEND_API_KEY) },
    { icon: "⚠️", label: "Login throttling", status: "Not configured", desc: "Do not claim brute-force or login rate limiting until a durable limiter is implemented.", ok: false },
  ];

  return <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div><h1 className="page-title">Settings & Permissions</h1><p className="page-subtitle">Manage users, roles and verified security controls for VIVIT GROUP</p></div>
      <div className="flex flex-wrap gap-2"><a href="/api/backup" className="btn btn-ghost" style={{ textDecoration: "none" }}>⬇ Full Backup</a><Link href="/dashboard/files" className="btn btn-primary" style={{ textDecoration: "none" }}>📁 Files</Link></div>
    </div>

    <nav className="flex gap-1 p-1 overflow-x-auto" style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", width: "fit-content", maxWidth: "100%" }} aria-label="Settings sections">
      <a href="#users" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>Users</a>
      <a href="#roles" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>Roles & Permissions</a>
      <a href="#security" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>Security</a>
    </nav>

    <section id="users" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: allUsers.length, icon: "👥", color: "blue" },
          { label: "Active", value: activeUsers.length, icon: "✅", color: "green" },
          { label: "Suspended", value: suspendedUsers.length, icon: "🚫", color: suspendedUsers.length ? "red" : "gray" },
          { label: "System Roles", value: SYSTEM_ROLES.length, icon: "🛡️", color: "purple" },
        ].map((item) => <div key={item.label} className={`kpi-card ${item.color}`} style={{ padding: "16px 20px" }}><div className="kpi-icon" style={{ fontSize: "20px" }}>{item.icon}</div><div className="kpi-label">{item.label}</div><div className="kpi-value" style={{ fontSize: "1.5rem" }}>{item.value}</div></div>)}
      </div>

      <div className="card"><div className="card-header"><p className="card-title">✉️ Add account access</p></div><div className="card-body flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p style={{ fontWeight: 700, color: "var(--text-primary)" }}>Secure self-service registration</p><p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Ask a client user to verify their email and request access. Employee roles are assigned by the Super Admin after verification.</p></div><Link href="/signup" className="btn btn-primary" style={{ textDecoration: "none" }}>Open signup page →</Link></div></div>

      <div className="card min-w-0"><div className="card-header"><p className="card-title">All Users ({allUsers.length})</p></div><div className="card-body-flush overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Active</th><th>Actions</th></tr></thead><tbody>{allUsers.map((user) => <tr key={user.id}>
        <td><div className="flex items-center gap-2"><div className="avatar avatar-sm" style={{ background: user.isActive ? "var(--vivit-gradient)" : "var(--text-muted)", opacity: user.isActive ? 1 : .5 }}>{user.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2)}</div><div><p style={{ fontWeight: 600, fontSize: "13.5px", color: user.isActive ? "var(--text-primary)" : "var(--text-muted)" }}>{user.name}</p><p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{user.email}</p></div></div></td>
        <td><form action={updateUserRole} className="flex gap-1 items-center"><input type="hidden" name="userId" value={user.id} /><select name="role" defaultValue={user.role} className={`badge badge-${ROLE_COLORS[user.role] ?? "gray"}`} style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600, padding: "4px 8px", borderRadius: "20px" }}>{SYSTEM_ROLES.map((item) => <option key={item} value={item}>{ROLE_ICONS[item]} {item.replace(/_/g, " ")}</option>)}</select><button type="submit" className="btn btn-ghost btn-sm">Save</button></form></td>
        <td><span className={`badge ${user.isActive ? "badge-green" : "badge-red"}`} style={{ fontSize: "11px" }}>{user.isActive ? "✅ Active" : "🚫 Suspended"}</span></td>
        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
        <td><form action={toggleUserStatus}><input type="hidden" name="userId" value={user.id} /><button type="submit" className={`btn btn-sm ${user.isActive ? "btn-danger" : "btn-success"}`}>{user.isActive ? "Suspend" : "Activate"}</button></form></td>
      </tr>)}</tbody></table></div></div>
    </section>

    <section id="roles" className="space-y-3"><div><h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "Sora,sans-serif" }}>Roles & Permissions</h2><p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Only the supported system roles are available in this release. Hidden custom-role controls have been removed.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{systemRoles.map((systemRole) => <div key={systemRole.id} className="card" style={{ borderTop: `3px solid ${systemRole.color}` }}><div className="card-body" style={{ padding: "16px" }}><div className="flex items-center gap-2"><span style={{ fontSize: "20px" }}>{ROLE_ICONS[systemRole.name.replace(/ /g, "_").toUpperCase()] ?? "🛡️"}</span><div><p style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{systemRole.name}</p><p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{systemRole.description}</p></div></div></div></div>)}</div></section>

    <section id="security" className="card"><div className="card-header"><p className="card-title">🔐 Security Overview</p></div><div className="card-body"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{security.map((item) => <div key={item.label} style={{ display: "flex", gap: "12px", padding: "12px", borderRadius: "var(--radius-sm)", background: item.ok ? "var(--bg-tertiary)" : "var(--amber-bg)", border: `1px solid ${item.ok ? "var(--card-border)" : "rgba(245,158,11,0.2)"}` }}><span style={{ fontSize: "20px", flexShrink: 0 }}>{item.icon}</span><div><div className="flex items-center gap-2 flex-wrap"><p style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{item.label}</p><span className={`badge ${item.ok ? "badge-green" : "badge-amber"}`} style={{ fontSize: "10px" }}>{item.status}</span></div><p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>{item.desc}</p></div></div>)}</div></div></section>
  </div>;
}
