// @ts-nocheck -- Drizzle's generated settings shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, workspaceRoles, userRoles, workspaceMembers } from "@/lib/db";
import { eq, desc, count, and } from "drizzle-orm";
import { Role } from "@/lib/types";
import { PERMISSION_GROUPS, ROLE_PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";

function safeStringArray(value:string|null|undefined):string[]{
  try{const parsed=JSON.parse(value||"[]");return Array.isArray(parsed)?parsed.filter(v=>typeof v==="string"):[];}
  catch{return [];}
}

// ── Server Actions ────────────────────────────────────────────
async function requireSuperAdmin(){"use server";const session=await auth();if(!session?.user||(session.user as any).role!==Role.SUPER_ADMIN)throw new Error("Unauthorized");return session;}

async function updateUserRole(fd: FormData) {
  "use server";
  await requireSuperAdmin();
  const { db, users } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const userId = fd.get("userId") as string;
  const role   = fd.get("role") as string;
  const allowed=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"];
  if (!userId || !allowed.includes(role)) throw new Error("Invalid role");
  const session=await auth();
  if(userId===(session!.user as any).id && role!=="SUPER_ADMIN")throw new Error("You cannot remove your own Super Admin access");
  await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, userId));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

async function toggleUserStatus(fd: FormData) {
  "use server";
  const session=await requireSuperAdmin();
  const { db, users } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const userId   = fd.get("userId") as string;
  if(userId===(session.user as any).id) throw new Error("You cannot suspend your own account");
  const isActive = fd.get("isActive") === "true";
  await db.update(users).set({ isActive: !isActive, updatedAt: new Date() }).where(eq(users.id, userId));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

async function createRole(fd: FormData) {
  "use server";
  await requireSuperAdmin();
  const { db, workspaceRoles } = await import("@/lib/db");
  const name        = fd.get("name") as string;
  const description = fd.get("description") as string;
  const color       = fd.get("color") as string;
  const perms       = fd.getAll("permission") as string[];
  if (!name) return;
  await db.insert(workspaceRoles).values({
    workspaceId:"default", name, description, color: color||"#C52A31",
    isSystem:false, permissions: JSON.stringify(perms),
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

async function deleteRole(fd: FormData) {
  "use server";
  await requireSuperAdmin();
  const { db, workspaceRoles } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const roleId = fd.get("roleId") as string;
  await db.delete(workspaceRoles)
    .where(and(eq(workspaceRoles.id, roleId), eq(workspaceRoles.isSystem, false)));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/settings");
}

// ── Page ──────────────────────────────────────────────────────
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (role !== Role.SUPER_ADMIN) return <div className="settings-personal">
    <div className="settings-hero"><span>⚙️</span><div><h1 className="page-title">Account Settings</h1><p className="page-subtitle">Your preferences and account access</p></div></div>
    <div className="settings-grid">
      <section className="card"><div className="card-body"><h2 className="card-title">Profile</h2><div className="settings-row"><span>Name</span><strong>{session.user.name||"—"}</strong></div><div className="settings-row"><span>Email</span><strong>{session.user.email||"—"}</strong></div><div className="settings-row"><span>Role</span><span className="badge badge-blue">{String(role).replace(/_/g," ")}</span></div></div></section>
      <section className="card"><div className="card-body"><h2 className="card-title">Preferences</h2><p className="page-subtitle">Use the عربي / English button in the top bar to change language. Your choice is saved on this device.</p><p className="page-subtitle" style={{marginTop:12}}>Theme and navigation controls are available at the bottom of the sidebar.</p></div></section>
      <section className="card"><div className="card-body"><h2 className="card-title">Permissions</h2><p className="page-subtitle">Your access is managed by the Super Admin. Contact them if your responsibilities change.</p></div></section>
    </div>
  </div>;

  const [allUsers, allRoles] = await Promise.all([
    db.select({
      id:users.id, name:users.name, email:users.email,
      role:users.role, isActive:users.isActive, lastLoginAt:users.lastLoginAt,
      createdAt:users.createdAt,
    }).from(users).orderBy(users.role, users.name),
    db.select().from(workspaceRoles)
      .where(eq(workspaceRoles.workspaceId,"default"))
      .orderBy(workspaceRoles.isSystem),
  ]);

  const ROLE_COLORS: Record<string,string> = {
    SUPER_ADMIN:"red", ACCOUNT_MANAGER:"blue", MEDIA_BUYER:"amber",
    CREATOR:"purple", ACCOUNTANT:"green", SALES:"red", CLIENT:"gray",
  };
  const ROLE_ICONS: Record<string,string> = {
    SUPER_ADMIN:"👑", ACCOUNT_MANAGER:"🤝", MEDIA_BUYER:"📣",
    CREATOR:"🎨", ACCOUNTANT:"💰", SALES:"🎯", CLIENT:"🏠",
  };

  const activeUsers    = allUsers.filter(u=>u.isActive);
  const suspendedUsers = allUsers.filter(u=>!u.isActive);
  const customRoles    = allRoles.filter(r=>!r.isSystem);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings & Permissions</h1>
          <p className="page-subtitle">Manage users, roles, and access control for your workspace</p>
        </div>
        <div style={{display:"flex",gap:"8px"}}><a href="/api/backup" className="btn btn-ghost" style={{textDecoration:"none"}}>⬇ Full Backup</a><a href="/dashboard/files" className="btn btn-primary" style={{textDecoration:"none"}}>📁 Files</a></div>
      </div>

      {/* Tabs nav */}
      <div style={{display:"flex",gap:"4px",padding:"4px",background:"var(--bg-tertiary)",borderRadius:"var(--radius-sm)",width:"fit-content"}}>
        {["Users","Roles & Permissions","Security"].map((tab,i)=>(
          <a key={tab} href={`#${tab.toLowerCase().replace(/ .*/,"")}`}
            style={{padding:"7px 18px",borderRadius:"6px",fontSize:"13px",fontWeight:600,textDecoration:"none",
              background:i===0?"var(--card-bg)":"transparent",
              color:i===0?"var(--vivit-blue)":"var(--text-muted)",
              boxShadow:i===0?"0 1px 3px rgba(0,0,0,0.08)":"none",
              transition:"var(--transition)"}}>
            {tab}
          </a>
        ))}
      </div>

      {/* ── SECTION: Users ─────────────────────────────────── */}
      <div id="users">

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
          {[
            {label:"Total Users",    value:allUsers.length,    icon:"👥", color:"blue"},
            {label:"Active",         value:activeUsers.length, icon:"✅", color:"green"},
            {label:"Suspended",      value:suspendedUsers.length,icon:"🚫",color:suspendedUsers.length>0?"red":"gray"},
            {label:"Approved Roles", value:7, icon:"🛡️", color:"purple"},
          ].map(k=>(
            <div key={k.label} className={`kpi-card ${k.color}`} style={{padding:"16px 20px"}}>
              <div className="kpi-icon" style={{fontSize:"20px"}}>{k.icon}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{fontSize:"1.6rem"}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Invite user form */}
        <div className="card" style={{marginBottom:"20px"}}>
          <div className="card-header">
            <p className="card-title">✉️ Invite New User</p>
          </div>
          <div className="card-body">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
              <div><p style={{fontWeight:700,color:"var(--text-primary)"}}>Secure self-service registration</p><p style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>Ask the user to verify their Gmail, request a role, then approve the request from HR & Team. No shared default passwords.</p></div>
              <Link href="/signup" className="btn btn-primary" style={{textDecoration:"none"}}>Open signup page →</Link>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">All Users ({allUsers.length})</p>
            <input type="search" placeholder="Filter users..." className="form-input"
              style={{maxWidth:"220px",fontSize:"13px",padding:"7px 12px"}}
              onInput={undefined}/>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr>
                <th>User</th><th>Role</th><th>Status</th><th>Last Active</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {allUsers.map(u=>(
                  <tr key={u.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <div className="avatar avatar-sm" style={{
                          background:u.isActive?"var(--vivit-gradient)":"var(--text-muted)",
                          opacity:u.isActive?1:0.5
                        }}>
                          {u.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <p style={{fontWeight:600,fontSize:"13.5px",color:u.isActive?"var(--text-primary)":"var(--text-muted)"}}>{u.name}</p>
                          <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <form action={updateUserRole} style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="hidden" name="userId" value={u.id}/>
                        <select name="role" defaultValue={u.role}
                          className={`badge badge-${ROLE_COLORS[u.role]??"gray"}`}
                          style={{border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:"11.5px",fontWeight:600,padding:"3px 8px",borderRadius:"20px"}}
                          >
                          {["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"].map(r=>(
                            <option key={r} value={r}>{ROLE_ICONS[r]} {r.replace(/_/g," ")}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                      </form>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive?"badge-green":"badge-red"}`} style={{fontSize:"11px"}}>
                        {u.isActive ? "✅ Active" : "🚫 Suspended"}
                      </span>
                    </td>
                    <td style={{fontSize:"12px",color:"var(--text-muted)"}}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "Never"}
                    </td>
                    <td>
                      <div style={{display:"flex",gap:"6px"}}>
                        {/* Suspend/Activate */}
                        <form action={toggleUserStatus}>
                          <input type="hidden" name="userId" value={u.id}/>
                          <input type="hidden" name="isActive" value={String(u.isActive)}/>
                          <button type="submit"
                            className={`btn btn-sm ${u.isActive?"btn-danger":"btn-success"}`}>
                            {u.isActive ? "Suspend" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECTION: Roles & Permissions ───────────────────── */}
      <div id="roles">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",flexWrap:"wrap",gap:"12px"}}>
          <div>
            <h2 style={{fontSize:"1.1rem",fontWeight:700,color:"var(--text-primary)",fontFamily:"Sora,sans-serif"}}>Roles & Permissions</h2>
            <p style={{fontSize:"12.5px",color:"var(--text-muted)"}}>Approved system roles. Public signup creates client requests only; the Super Admin assigns employee roles after verification.</p>
          </div>
        </div>

        {/* System Roles Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px",marginBottom:"24px"}}>
          {allRoles.filter(r=>r.isSystem).map(r=>{
            const perms = safeStringArray(r.permissions);
            return (
              <div key={r.id} className="card" style={{borderTop:`3px solid ${r.color}`}}>
                <div className="card-body" style={{padding:"16px"}}>
                  <div className="flex items-center justify-between mb-2">
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"20px"}}>{ROLE_ICONS[r.name.replace(/ /g,"_").toUpperCase()]??""}</span>
                      <div>
                        <p style={{fontWeight:700,fontSize:"14px",color:"var(--text-primary)"}}>{r.name}</p>
                        <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{perms.length} permissions</p>
                      </div>
                    </div>
                    <span className="badge badge-gray" style={{fontSize:"10px"}}>System</span>
                  </div>
                  <p style={{fontSize:"12px",color:"var(--text-secondary)",marginBottom:"10px"}}>{r.description}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                    {perms.slice(0,6).map(p=>(
                      <span key={p} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"12px",background:"var(--bg-tertiary)",color:"var(--text-muted)",fontWeight:500}}>
                        {p.replace(/_/g," ")}
                      </span>
                    ))}
                    {perms.length>6&&<span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"12px",background:"var(--bg-tertiary)",color:"var(--vivit-blue)",fontWeight:600}}>+{perms.length-6} more</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Custom Role */}
        <div className="card" style={{marginBottom:"20px",display:"none"}} aria-hidden="true">
          <div className="card-header">
            <p className="card-title">🎭 Create Custom Role</p>
          </div>
          <div className="card-body">
            <form action={createRole}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto",gap:"12px",alignItems:"end",marginBottom:"16px"}}>
                <div>
                  <label className="form-label">Role Name</label>
                  <input name="name" required placeholder="e.g. Senior Account Manager" className="form-input"/>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input name="description" placeholder="Brief description..." className="form-input"/>
                </div>
                <div>
                  <label className="form-label">Color</label>
                  <input name="color" type="color" defaultValue="#C52A31"
                    style={{width:"48px",height:"40px",padding:"2px",borderRadius:"8px",border:"1.5px solid var(--card-border)",cursor:"pointer",background:"var(--card-bg)"}}/>
                </div>
                <button type="submit" className="btn btn-primary">Create Role</button>
              </div>

              {/* Permission checkboxes */}
              <div style={{border:"1px solid var(--card-border)",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",background:"var(--bg-tertiary)",borderBottom:"1px solid var(--card-border)"}}>
                  <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>Select Permissions</p>
                  <p style={{fontSize:"12px",color:"var(--text-muted)"}}>Choose what this role can access</p>
                </div>
                <div style={{maxHeight:"420px",overflowY:"auto"}}>
                  {PERMISSION_GROUPS.map(group=>(
                    <div key={group.group} style={{borderBottom:"1px solid var(--card-border)"}}>
                      <div style={{padding:"10px 16px",background:"var(--bg-secondary)",display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontSize:"16px"}}>{group.icon}</span>
                        <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>{group.group}</p>
                        <span style={{fontSize:"11px",color:"var(--text-muted)",marginLeft:"auto"}}>{group.permissions.length} permissions</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"0",padding:"4px 0"}}>
                        {group.permissions.map((perm:any)=>(
                          <label key={perm.key}
                            style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"8px 16px",cursor:"pointer",transition:"background 0.1s"}}
                            onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-hover)")}
                            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                            <input type="checkbox" name="permission" value={perm.key}
                              style={{marginTop:"2px",accentColor:"var(--vivit-blue)",width:"14px",height:"14px",flexShrink:0}}/>
                            <div>
                              <p style={{fontSize:"13px",fontWeight:600,color:"var(--text-primary)"}}>{perm.label}</p>
                              <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{perm.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Custom roles list */}
        {customRoles.length > 0 && (
          <div className="card" style={{display:"none"}} aria-hidden="true">
            <div className="card-header">
              <p className="card-title">Custom Roles ({customRoles.length})</p>
            </div>
            <div className="card-body-flush">
              <table className="data-table">
                <thead><tr><th>Role</th><th>Permissions</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {customRoles.map(r=>{
                    const perms = safeStringArray(r.permissions);
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                            <div style={{width:"10px",height:"10px",borderRadius:"50%",background:r.color,flexShrink:0}}/>
                            <div>
                              <p style={{fontWeight:600,fontSize:"13.5px"}}>{r.name}</p>
                              <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{r.description}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>
                            {perms.slice(0,4).map(p=>(
                              <span key={p} style={{fontSize:"10px",padding:"2px 6px",borderRadius:"12px",background:"var(--bg-tertiary)",color:"var(--text-muted)"}}>
                                {p.replace(/_/g," ")}
                              </span>
                            ))}
                            {perms.length>4&&<span style={{fontSize:"10px",padding:"2px 6px",borderRadius:"12px",background:"var(--bg-tertiary)",color:"var(--vivit-blue)",fontWeight:600}}>+{perms.length-4}</span>}
                          </div>
                        </td>
                        <td style={{fontSize:"12px",color:"var(--text-muted)"}}>
                          {new Date(r.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                        </td>
                        <td>
                          <form action={deleteRole}>
                            <input type="hidden" name="roleId" value={r.id}/>
                            <button type="submit" className="btn btn-danger btn-sm">Delete</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION: Security ──────────────────────────────── */}
      <div id="security" className="card">
        <div className="card-header">
          <p className="card-title">🔐 Security Overview</p>
        </div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"12px"}}>
            {[
              {icon:"✅",label:"CSRF Protection",      status:"Active",   desc:"Origin validation on all mutations",           ok:true},
              {icon:"✅",label:"Brute Force Guard",    status:"Active",   desc:"5 failed logins → 15 min lockout",             ok:true},
              {icon:"✅",label:"JWT Sessions",         status:"Active",   desc:"Auth.js v5 — auto-rotation enabled",           ok:true},
              {icon:"✅",label:"bcrypt Passwords",     status:"10 rounds",desc:"Industry standard for serverless",             ok:true},
              {icon:"✅",label:"Rate Limiting",        status:"Active",   desc:"AI: 10/min · Email: 20/hr per user",           ok:true},
              {icon:"✅",label:"CSP Headers",          status:"Active",   desc:"Content-Security-Policy on all responses",     ok:true},
              {icon:"✅",label:"Audit Trail",          status:"Active",   desc:"All mutations logged with IP + old/new values",ok:true},
              {icon:"✅",label:"RBAC Enforcement",     status:"3 layers", desc:"Middleware + page + API triple enforcement",   ok:true},
              {icon:"⚠️",label:"2FA / TOTP",           status:"Optional", desc:"Enable in workspace settings",                 ok:false},
              {icon:"⚠️",label:"Row-Level Security",   status:"Optional", desc:"Enable in Supabase Dashboard → RLS",           ok:false},
              {icon:"✅",label:"API Key Auth",         status:"Active",   desc:"SHA-256 hashed — raw key shown once only",    ok:true},
              {icon:"✅",label:"CORS",                 status:"Active",   desc:"Configured for /api/v1 public endpoints",      ok:true},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",gap:"12px",padding:"12px",borderRadius:"var(--radius-sm)",background:s.ok?"var(--bg-tertiary)":"var(--amber-bg)",border:`1px solid ${s.ok?"var(--card-border)":"rgba(245,158,11,0.2)"}`}}>
                <span style={{fontSize:"20px",flexShrink:0}}>{s.icon}</span>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>{s.label}</p>
                    <span className={`badge ${s.ok?"badge-green":"badge-amber"}`} style={{fontSize:"10px"}}>{s.status}</span>
                  </div>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"2px"}}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
