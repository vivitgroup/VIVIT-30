export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, creatorProfiles, creativeTasks, clients } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";

async function saveProfile(fd: FormData) {
  "use server";
  const { auth: getAuth } = await import("@/lib/auth");
  const { db, creatorProfiles, users, auditLogs } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const session = await getAuth();
  if (!session?.user || session.user.role !== Role.CREATOR) throw new Error("Unauthorized");
  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");
  if(!workspaceId||!userId)throw new Error("Workspace unavailable");
  const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,userId),eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
  if(!creator)throw new Error("Creator account is not active in this workspace");
  const existing = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId,userId));
  const data = {
    userId, bio: String(fd.get("bio")||"").trim().slice(0,1000),
    portfolioUrl: String(fd.get("portfolio")||"").trim().slice(0,1000) || null,
    ratePerTask: Math.max(0, Number.parseFloat(String(fd.get("rate")||"0")) || 0),
    specialties: String(fd.get("specialties")||"").trim().slice(0,500),
    isAvailable: fd.get("available") === "true",
    updatedAt: new Date(),
  };
  await db.transaction(async tx=>{
    if (existing.length > 0) await tx.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId,userId));
    else await tx.insert(creatorProfiles).values(data);
    await tx.insert(auditLogs).values({workspaceId,userId,action:"creator_profile_saved",entity:"creator_profiles",entityId:existing[0]?.id||userId,newValues:JSON.stringify({isAvailable:data.isAvailable,ratePerTask:data.ratePerTask,hasPortfolio:Boolean(data.portfolioUrl)})});
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/marketplace");
}

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER, Role.CREATOR].includes(role)) redirect("/dashboard");
  const workspaceId = session.user.workspaceId!;
  const activeClients=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true)));
  const clientIds=activeClients.map(c=>c.id);
  const creators=await db.select({id:users.id,name:users.name,email:users.email,avatar:users.avatar}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED")));
  const creatorIds=creators.map(c=>c.id);
  const profiles=creatorIds.length?await db.select().from(creatorProfiles).where(inArray(creatorProfiles.userId,creatorIds)):[];
  const tasks=clientIds.length?await db.select({assignedToId:creativeTasks.assignedToId,status:creativeTasks.status}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),inArray(creativeTasks.clientId,clientIds))):[];
  const profileMap=new Map(profiles.map(p=>[p.userId,p]));
  const taskStats=new Map<string,{total:number;completed:number}>();
  for(const t of tasks){if(!t.assignedToId)continue;const cur=taskStats.get(t.assignedToId)||{total:0,completed:0};cur.total++;if(t.status==="COMPLETED")cur.completed++;taskStats.set(t.assignedToId,cur)}
  const mine=role===Role.CREATOR?profileMap.get(String(session.user.id))||null:null;
  return <div className="page-shell"><div className="page-header"><div><p className="page-eyebrow">Creator Marketplace</p><h1>Creative talent</h1><p>Approved creators in this workspace, their availability, profile and delivery record.</p></div></div>{role===Role.CREATOR&&<form action={saveProfile} className="card" style={{marginBottom:20,display:"grid",gap:12}}><h2 style={{margin:0}}>Your creator profile</h2><textarea className="form-textarea" name="bio" defaultValue={mine?.bio||""} placeholder="Bio" rows={3}/><input className="form-input" name="portfolio" defaultValue={mine?.portfolioUrl||""} placeholder="Portfolio URL"/><input className="form-input" name="rate" type="number" min="0" step="0.01" defaultValue={mine?.ratePerTask||0} placeholder="Rate per task"/><input className="form-input" name="specialties" defaultValue={mine?.specialties||""} placeholder="Specialties"/><label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" name="available" value="true" defaultChecked={mine?.isAvailable??true}/> Available for work</label><button className="btn btn-primary" type="submit">Save profile</button></form>}<div className="grid-3">{creators.map(c=>{const p=profileMap.get(c.id),s=taskStats.get(c.id)||{total:0,completed:0};return <article className="card" key={c.id}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><h3 style={{margin:"0 0 4px"}}>{c.name}</h3><p className="muted" style={{margin:0}}>{c.email}</p></div><span className={`badge ${p?.isAvailable===false?"badge-muted":"badge-success"}`}>{p?.isAvailable===false?"Unavailable":"Available"}</span></div>{p?.bio&&<p>{p.bio}</p>}<div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:14}}><span>{s.completed}/{s.total} completed</span>{p?.ratePerTask!=null&&<span>Rate {p.ratePerTask}</span>}</div>{p?.specialties&&<p className="muted">{p.specialties}</p>}{p?.portfolioUrl&&<a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer">Open portfolio →</a>}</article>})}</div>{creators.length===0&&<div className="empty-state"><h3>No approved creators yet</h3><p>Creator profiles will appear here after account approval.</p></div>}</div>;
}
