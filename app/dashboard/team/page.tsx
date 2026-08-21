export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, payroll, leaveRequests, creatorProfiles, creatorPoints } from "@/lib/db";
import { eq, desc, sum, count, and, gte } from "drizzle-orm";
import { Role } from "@/lib/types";

async function approveLeave(fd: FormData) {
  "use server";
  const session=await auth();
  if ((session?.user as any)?.role !== Role.SUPER_ADMIN) throw new Error("Unauthorized");
  const { db, leaveRequests } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const id     = fd.get("id") as string;
  const status = fd.get("status") as string;
  await db.update(leaveRequests).set({ status:status as any, updatedAt:new Date() }).where(eq(leaveRequests.id,id));
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
  const reviewNote = String(fd.get("reviewNote") ?? "").slice(0,500);
  if (!id || !["APPROVED","REJECTED"].includes(decision)) return;
  if (decision === "APPROVED") {
    const record = await db.select({ requestedRole:users.requestedRole,email:users.email,name:users.name }).from(users).where(eq(users.id,id)).limit(1);
    const finalRole = selectedRole || record[0]?.requestedRole;
    if (!finalRole || finalRole === "SUPER_ADMIN") throw new Error("Invalid requested role");
    await db.update(users).set({ role:finalRole as any, isActive:true, approvalStatus:"APPROVED", approvalNote:reviewNote||undefined, approvedBy:(session!.user as any).id, approvedAt:new Date(), rejectedAt:null, updatedAt:new Date() }).where(eq(users.id,id));
  } else {
    await db.update(users).set({ isActive:false, approvalStatus:"REJECTED", approvalNote:reviewNote||"Request rejected by Super Admin", rejectedAt:new Date(), updatedAt:new Date() }).where(eq(users.id,id));
  }
  const { notifications, auditLogs } = await import("@/lib/db");
  await db.insert(notifications).values({userId:id,type:"ACCOUNT_REVIEW",title:`Account ${decision.toLowerCase()}`,message:decision==="APPROVED"?"Your VIVIT ERP account is ready. You can sign in now.":reviewNote||"Your access request was not approved.",priority:decision==="APPROVED"?"normal":"high",link:"/login"});
  await db.insert(auditLogs).values({userId:(session!.user as any).id,action:`account_${decision.toLowerCase()}`,entity:"users",entityId:id,newValues:JSON.stringify({selectedRole,reviewNote})});
  const [reviewedUser]=await db.select({email:users.email,name:users.name}).from(users).where(eq(users.id,id)).limit(1);
  if(reviewedUser&&process.env.RESEND_API_KEY){const base=process.env.NEXTAUTH_URL||"";await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM||"VIVIT ERP <onboarding@resend.dev>",to:[reviewedUser.email],subject:`Your VIVIT ERP account was ${decision.toLowerCase()}`,html:decision==="APPROVED"?`<p>Hello ${reviewedUser.name}, your account is approved.</p><p><a href="${base}/login">Sign in</a></p>`:`<p>Hello ${reviewedUser.name}, your request was not approved.</p><p>${reviewNote||"Contact your Super Admin for details."}</p>`})}).catch(()=>null);}
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/team");
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const now = new Date();
  const yrStart = new Date(now.getFullYear(),0,1);

  const [allStaff, pendingAccounts, pendingLeaves, recentPayroll, allProfiles, topPoints] = await Promise.all([
    db.select({ id:users.id,name:users.name,email:users.email,role:users.role,
      isActive:users.isActive,lastLoginAt:users.lastLoginAt,createdAt:users.createdAt })
      .from(users).where(eq(users.isActive,true)).orderBy(users.role,users.name),
    db.select({id:users.id,name:users.name,email:users.email,requestedRole:users.requestedRole,approvalNote:users.approvalNote,createdAt:users.createdAt})
      .from(users).where(eq(users.approvalStatus,"PENDING")).orderBy(desc(users.createdAt)),
    db.select({ id:leaveRequests.id,userId:leaveRequests.userId,type:leaveRequests.type,
      fromDate:leaveRequests.fromDate,toDate:leaveRequests.toDate,
      days:leaveRequests.days,status:leaveRequests.status,notes:leaveRequests.notes })
      .from(leaveRequests).where(eq(leaveRequests.status,"PENDING")).orderBy(desc(leaveRequests.createdAt)),
    db.select({ userId:payroll.userId,baseSalary:payroll.baseSalary,bonus:payroll.bonus,
      deductions:payroll.deductions,netPay:payroll.netPay,status:payroll.status,month:payroll.month,year:payroll.year })
      .from(payroll).where(and(eq(payroll.month,now.getMonth()+1),eq(payroll.year,now.getFullYear()))),
    db.select().from(creatorProfiles),
    db.select({ userId:creatorPoints.userId,points:creatorPoints.points,badges:creatorPoints.badges })
      .from(creatorPoints).orderBy(desc(creatorPoints.points)).limit(5),
  ]);

  const userMap = Object.fromEntries(allStaff.map(u=>[u.id,u.name]));
  const profileMap = Object.fromEntries(allProfiles.map(p=>[p.userId,p]));
  const payMap = Object.fromEntries(recentPayroll.map(p=>[p.userId,p]));

  const ROLE_COLORS: Record<string,string> = {
    SUPER_ADMIN:"red",ACCOUNT_MANAGER:"blue",MEDIA_BUYER:"amber",
    CREATOR:"purple",ACCOUNTANT:"green",SALES:"red",CLIENT:"gray",
  };
  const ROLE_ICONS: Record<string,string> = {
    SUPER_ADMIN:"👑",ACCOUNT_MANAGER:"🤝",MEDIA_BUYER:"📣",
    CREATOR:"🎨",ACCOUNTANT:"💰",SALES:"🎯",CLIENT:"🏠",
  };

  const totalPayroll = recentPayroll.reduce((s,p)=>s+Number(p.netPay??0),0);
  const fmt = (n:number) => n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div>
        <h1 className="page-title">HR & Team</h1>
        <p className="page-subtitle">{allStaff.length} active staff · {pendingAccounts.length} pending account requests · {pendingLeaves.length} pending leave requests</p>
      </div>

      <div className="card" style={{border:pendingAccounts.length?"1px solid #EFB324":"1px solid var(--card-border)"}}>
        <div className="card-header"><p className="card-title">🔐 Account Approval Requests</p>{pendingAccounts.length>0&&<span className="badge badge-amber">{pendingAccounts.length} waiting</span>}</div>
        <div className="card-body" style={{display:"grid",gap:"10px"}}>
          {pendingAccounts.length===0?<p style={{color:"var(--text-muted)",fontSize:"13px"}}>✅ No pending account requests</p>:pendingAccounts.map(u=><div key={u.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"16px",alignItems:"center",padding:"14px",borderRadius:"10px",background:"var(--bg-tertiary)",border:"1px solid var(--card-border)"}}>
            <div><p style={{fontWeight:800,color:"var(--text-primary)"}}>{u.name}</p><p style={{fontSize:"12px",color:"var(--text-muted)",marginTop:"3px"}}>{u.email} · Requested: <strong>{u.requestedRole?.replace(/_/g," ")}</strong></p>{u.approvalNote&&<p style={{fontSize:"12px",color:"var(--text-secondary)",marginTop:"7px"}}>“{u.approvalNote}”</p>}</div>
            <div style={{display:"grid",gap:"6px",minWidth:"260px"}}><form action={reviewAccount} style={{display:"flex",gap:"6px"}}><input type="hidden" name="id" value={u.id}/><input type="hidden" name="decision" value="APPROVED"/><select name="selectedRole" defaultValue={u.requestedRole??"CLIENT"} className="form-select" style={{fontSize:"11px",padding:"5px"}}>{["ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"].map(r=><option key={r}>{r}</option>)}</select><button className="btn btn-success btn-sm" type="submit">Approve ✓</button></form><form action={reviewAccount} style={{display:"flex",gap:"6px"}}><input type="hidden" name="id" value={u.id}/><input type="hidden" name="decision" value="REJECTED"/><input name="reviewNote" className="form-input" placeholder="Reason (optional)" style={{fontSize:"11px",padding:"5px"}}/><button className="btn btn-danger btn-sm" type="submit">Reject</button></form></div>
          </div>)}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Team Size",         value:String(allStaff.length),            icon:"👥",color:"blue"},
          {label:"Monthly Payroll",   value:fmt(totalPayroll),                   icon:"💰",color:"green"},
          {label:"Pending Leaves",    value:String(pendingLeaves.length),        icon:"📋",color:pendingLeaves.length>0?"amber":"green"},
          {label:"Creators",          value:String(allStaff.filter(u=>u.role==="CREATOR").length), icon:"🎨",color:"purple"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.5rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>

        {/* Staff Directory */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Staff Directory</p>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>This Month</th><th>Last Login</th></tr></thead>
              <tbody>
                {allStaff.map(u=>{
                  const pay = payMap[u.id];
                  const profile = profileMap[u.id];
                  const initials = u.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                          <div className="avatar avatar-sm" style={{background:`var(--vivit-gradient)`,fontSize:"11px"}}>
                            {initials}
                          </div>
                          <div>
                            <p style={{fontWeight:700,fontSize:"13.5px",color:"var(--text-primary)"}}>{u.name}</p>
                            <p style={{fontSize:"11px",color:"var(--text-muted)"}}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${ROLE_COLORS[u.role]??"gray"}`} style={{fontSize:"11px"}}>
                          {ROLE_ICONS[u.role]??""} {u.role.replace(/_/g," ")}
                        </span>
                      </td>
                      <td style={{fontWeight:700,color:"var(--green)",fontSize:"13px"}}>
                        {pay ? fmt(Number(pay.netPay)) : "—"}
                      </td>
                      <td style={{fontSize:"11.5px",color:"var(--text-muted)"}}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

          {/* Leave Requests */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Leave Requests</p>
              {pendingLeaves.length>0&&<span className="badge badge-amber">{pendingLeaves.length} pending</span>}
            </div>
            <div className="card-body" style={{padding:"8px"}}>
              {pendingLeaves.length===0 ? (
                <p style={{textAlign:"center",padding:"20px",color:"var(--text-muted)",fontSize:"13px"}}>✅ No pending requests</p>
              ) : pendingLeaves.map(l=>(
                <div key={l.id} style={{padding:"10px 12px",borderRadius:"8px",background:"var(--bg-tertiary)",marginBottom:"6px",border:"1px solid var(--card-border)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                    <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>{userMap[l.userId]??l.userId}</p>
                    <span className="badge badge-amber" style={{fontSize:"10px"}}>{l.type}</span>
                  </div>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)",marginBottom:"8px"}}>
                    {new Date(l.fromDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} → {new Date(l.toDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} · {l.days} day{Number(l.days)!==1?"s":""}
                  </p>
                  <div style={{display:"flex",gap:"6px"}}>
                    <form action={approveLeave} style={{flex:1}}>
                      <input type="hidden" name="id" value={l.id}/>
                      <input type="hidden" name="status" value="APPROVED"/>
                      <button type="submit" className="btn btn-success btn-sm" style={{width:"100%",justifyContent:"center"}}>Approve ✓</button>
                    </form>
                    <form action={approveLeave} style={{flex:1}}>
                      <input type="hidden" name="id" value={l.id}/>
                      <input type="hidden" name="status" value="REJECTED"/>
                      <button type="submit" className="btn btn-danger btn-sm" style={{width:"100%",justifyContent:"center"}}>Reject ✗</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Creators Leaderboard */}
          {topPoints.length>0&&(
            <div className="card">
              <div className="card-header">
                <p className="card-title">🏆 Creator Leaderboard</p>
              </div>
              <div className="card-body" style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:"8px"}}>
                {topPoints.map((p,i)=>{
                  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
                  return (
                    <div key={p.userId} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px",borderRadius:"8px",background:"var(--bg-tertiary)"}}>
                      <span style={{fontSize:"18px",width:"24px"}}>{medals[i]}</span>
                      <div className="avatar avatar-sm">{userMap[p.userId]?.split(" ").map((n:string)=>n[0]).join("").slice(0,2)??""}</div>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>{userMap[p.userId]?.split(" ")[0]??p.userId.slice(0,8)}</p>
                        <p style={{fontSize:"11px",color:"var(--text-muted)"}}>{p.badges}</p>
                      </div>
                      <span style={{fontWeight:800,fontSize:"16px",color:"var(--amber)",fontFamily:"Sora,sans-serif"}}>{p.points}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
