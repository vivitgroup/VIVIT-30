export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, users, creatorProfiles, creativeTasks } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";

async function saveProfile(fd: FormData) {
  "use server";
  const { auth: getAuth } = await import("@/lib/auth");
  const { db, creatorProfiles } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const session = await getAuth();
  if (!session?.user || (session.user as any).role !== Role.CREATOR) throw new Error("Unauthorized");
  const existing = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, session.user.id!));
  const data = {
    userId: session.user.id!, bio: fd.get("bio") as string,
    portfolioUrl: fd.get("portfolio") as string || null,
    ratePerTask: parseFloat(fd.get("rate") as string) || 0,
    specialties: fd.get("specialties") as string,
    isAvailable: fd.get("available") === "true",
    updatedAt: new Date(),
  };
  if (existing.length > 0) await db.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId, session.user.id!));
  else await db.insert(creatorProfiles).values(data);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/marketplace");
}

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER, Role.CREATOR].includes(role)) redirect("/dashboard");

  const profiles = await db.select().from(creatorProfiles).where(eq(creatorProfiles.isAvailable, true));
  const userIds  = profiles.map(p => p.userId);
  const creatorUsers = userIds.length > 0 ? await db.select({ id:users.id, name:users.name, email:users.email }).from(users).where(inArray(users.id, userIds)) : [];
  const userMap = Object.fromEntries(creatorUsers.map(u => [u.id, u]));

  const openTasks = role !== Role.CREATOR ? await db.select().from(creativeTasks).where(eq(creativeTasks.status, "PENDING")).limit(10) : [];
  const myProfile = role === Role.CREATOR ? await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, session.user.id!)).then(r=>r[0]) : null;

  const TYPE_ICON: Record<string,string> = {REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📊",MOTION_GRAPHIC:"✨",VIDEO_EDIT:"🎥",PHOTO_SESSION:"📸",STORY:"📱",UGC:"👤"};

  return (
    <div className="max-w-5xl space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">🛒 Creator Marketplace</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">
          {role===Role.CREATOR?"Manage your profile and bid on tasks":"Find creators and assign open tasks"}
        </p>
      </div>

      {/* Creator Profile Setup */}
      {role === Role.CREATOR && (
        <div className="card">
          <h2 className="font-semibold text-[#244D87] text-sm uppercase tracking-wider mb-4">
            {myProfile ? "✏️ Update Your Profile" : "🆕 Create Your Profile"}
          </h2>
          <form action={saveProfile} className="space-y-3">
            <div><label className="block text-xs text-[#6B8FAF] mb-1.5 font-semibold uppercase tracking-wider">Bio</label>
              <textarea name="bio" rows={2} defaultValue={myProfile?.bio??""} placeholder="Tell agencies about your skills and style…" className="vivit-input resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-[#6B8FAF] mb-1.5 font-semibold uppercase tracking-wider">Portfolio URL</label>
                <input name="portfolio" defaultValue={myProfile?.portfolioUrl??""} placeholder="https://behance.net/..." className="form-input" /></div>
              <div><label className="block text-xs text-[#6B8FAF] mb-1.5 font-semibold uppercase tracking-wider">Rate per Task ($)</label>
                <input name="rate" type="number" defaultValue={myProfile?.ratePerTask??0} className="form-input" /></div>
            </div>
            <div><label className="block text-xs text-[#6B8FAF] mb-1.5 font-semibold uppercase tracking-wider">Specialties</label>
              <input name="specialties" defaultValue={myProfile?.specialties??"REEL,GRAPHIC,UGC"} placeholder="REEL,GRAPHIC,UGC,CAROUSEL" className="form-input" /></div>
            <div><label className="block text-xs text-[#6B8FAF] mb-1.5 font-semibold uppercase tracking-wider">Available for work</label>
              <select name="available" className="form-input">
                <option value="true" selected={myProfile?.isAvailable!==false}>✅ Available</option>
                <option value="false" selected={myProfile?.isAvailable===false}>❌ Not Available</option>
              </select></div>
            <button type="submit" className="btn btn-primary">Save Profile</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Available Creators */}
        <div className="space-y-3">
          <h2 className="font-semibold">👥 Available Creators ({profiles.length})</h2>
          {profiles.length === 0 && <p className="text-sm text-[#3D5577] card-vivit py-8 text-center">No creator profiles yet.</p>}
          {profiles.map(p => {
            const u = userMap[p.userId];
            const specialties = (p.specialties??"").split(",").filter(Boolean);
            return (
              <div key={p.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
                    {(u?.name??"?").split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{u?.name}</p>
                      {p.ratePerTask > 0 && <span className="text-xs text-[#244D87] font-semibold">${p.ratePerTask}/task</span>}
                      <span className="ml-auto badge bg-green-500/10 text-green-400 text-[10px]">● Available</span>
                    </div>
                    {p.bio && <p className="text-xs text-[#6B8FAF] mt-0.5">{p.bio}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {specialties.map(s => <span key={s} className="badge bg-blue-500/10 text-blue-400 text-[10px]">{TYPE_ICON[s]??""} {s}</span>)}
                    </div>
                    {p.portfolioUrl && (
                      <a href={p.portfolioUrl} target="_blank" className="text-xs text-[#244D87] hover:text-[#00B4D8] mt-1 inline-block">🔗 Portfolio →</a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Open Tasks */}
        {role !== Role.CREATOR && (
          <div className="space-y-3">
            <h2 className="font-semibold">📋 Open Tasks ({openTasks.length})</h2>
            {openTasks.length === 0 && <p className="text-sm text-[#3D5577] card-vivit py-8 text-center">No unassigned tasks.</p>}
            {openTasks.map(t => (
              <div key={t.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TYPE_ICON[t.type]??""}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{t.title}</p>
                    <p className="text-xs text-[#6B8FAF] mt-0.5">{t.type.replace(/_/g," ")} · Due {new Date(t.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</p>
                    <span className="badge bg-yellow-500/10 text-yellow-400 text-[10px] mt-1">Unassigned</span>
                  </div>
                  <a href={`/dashboard/creative/${t.id}`} className="text-xs px-3 py-1.5 rounded-xl bg-[#244D87]/10 border border-[#244D87]/20 text-[#00B4D8] hover:bg-[#244D87]/20 transition-colors flex-shrink-0" style={{textDecoration:"none"}}>Assign →</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
