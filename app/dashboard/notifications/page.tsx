// @ts-nocheck -- Drizzle's generated notification shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, notifications } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { Role } from "@/lib/types";

async function markAllRead(fd: FormData) {
  "use server";
  const { auth } = await import("@/lib/auth");
  const { db, notifications } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const session = await auth();
  if (!session?.user) return;
  const userId = (session.user as any).id;
  await db.update(notifications).set({ isRead:true }).where(eq(notifications.userId, userId));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/notifications");
}

async function markOneRead(fd: FormData) {
  "use server";
  const { db, notifications } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const id = fd.get("id") as string;
  await db.update(notifications).set({ isRead:true }).where(eq(notifications.id, id));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/notifications");
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const allNotifs = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unread = allNotifs.filter(n=>!n.isRead);
  const read   = allNotifs.filter(n=>n.isRead);

  const PRIORITY: Record<string,{icon:string;color:string;bg:string;label:string}> = {
    urgent: { icon:"🚨", color:"var(--red)",         bg:"var(--red-bg)",    label:"Urgent" },
    high:   { icon:"⚠️", color:"var(--amber)",        bg:"var(--amber-bg)",  label:"High" },
    normal: { icon:"🔔", color:"var(--vivit-blue)",   bg:"rgba(33,150,243,0.08)", label:"Normal" },
    low:    { icon:"💬", color:"var(--text-muted)",   bg:"var(--bg-tertiary)", label:"Low" },
  };

  const NotifRow = ({ n }: { n: typeof allNotifs[0] }) => {
    const cfg = PRIORITY[n.priority ?? "normal"] ?? PRIORITY.normal;
    const time = new Date(n.createdAt);
    const mins = Math.floor((Date.now()-time.getTime())/60000);
    const timeStr = mins<60 ? `${mins}m ago` : mins<1440 ? `${Math.floor(mins/60)}h ago` : time.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});

    return (
      <div style={{
        display:"flex",alignItems:"flex-start",gap:"14px",
        padding:"14px 20px",
        background:n.isRead?"transparent":"rgba(33,150,243,0.03)",
        borderBottom:"1px solid var(--card-border)",
        transition:"background 0.15s",
        borderLeft:`3px solid ${n.isRead?"transparent":cfg.color}`,
      }}>
        {/* Icon */}
        <div style={{
          width:"38px",height:"38px",borderRadius:"50%",
          background:cfg.bg,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:"16px",flexShrink:0,marginTop:"2px"
        }}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"4px"}}>
            <p style={{
              fontSize:"13.5px",fontWeight:n.isRead?500:700,
              color:n.isRead?"var(--text-secondary)":"var(--text-primary)",
              lineHeight:1.4
            }}>{n.title}</p>
            <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
              <span style={{fontSize:"11px",color:"var(--text-muted)",whiteSpace:"nowrap"}}>{timeStr}</span>
              <span className={`badge badge-${n.priority==="urgent"?"red":n.priority==="high"?"amber":n.priority==="normal"?"blue":"gray"}`}
                style={{fontSize:"10px"}}>{cfg.label}</span>
            </div>
          </div>
          <p style={{fontSize:"12.5px",color:"var(--text-muted)",lineHeight:1.6}}>{n.message}</p>
          <div style={{display:"flex",gap:"8px",marginTop:"8px",alignItems:"center"}}>
            {n.link&&(
              <a href={n.link} className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"12px",padding:"4px 12px"}}>
                View →
              </a>
            )}
            {!n.isRead&&(
              <form action={markOneRead} style={{display:"inline"}}>
                <input type="hidden" name="id" value={n.id}/>
                <button type="submit" style={{background:"none",border:"none",fontSize:"12px",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",padding:"4px 8px",borderRadius:"6px"}}>
                  Mark read
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"800px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread.length} unread · {allNotifs.length} total</p>
        </div>
        {unread.length>0&&(
          <form action={markAllRead}>
            <button type="submit" className="btn btn-ghost btn-sm">
              ✓ Mark all as read
            </button>
          </form>
        )}
      </div>

      {/* Summary pills */}
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {Object.entries(PRIORITY).map(([key,cfg])=>{
          const count = allNotifs.filter(n=>n.priority===key).length;
          if (!count) return null;
          return (
            <span key={key} className="badge" style={{background:cfg.bg,color:cfg.color,fontSize:"12px",padding:"4px 12px"}}>
              {cfg.icon} {cfg.label} · {count}
            </span>
          );
        })}
      </div>

      {/* Unread */}
      {unread.length>0&&(
        <div className="card">
          <div className="card-header" style={{borderLeft:"3px solid var(--vivit-blue)"}}>
            <p className="card-title">Unread ({unread.length})</p>
          </div>
          <div className="card-body-flush">
            {unread.map(n=><NotifRow key={n.id} n={n}/>)}
          </div>
        </div>
      )}

      {/* Read */}
      {read.length>0&&(
        <div className="card" style={{opacity:0.8}}>
          <div className="card-header">
            <p className="card-title" style={{color:"var(--text-muted)"}}>Earlier ({read.length})</p>
          </div>
          <div className="card-body-flush">
            {read.slice(0,30).map(n=><NotifRow key={n.id} n={n}/>)}
          </div>
        </div>
      )}

      {allNotifs.length===0&&(
        <div className="card">
          <div className="card-body" style={{textAlign:"center",padding:"60px 24px"}}>
            <p style={{fontSize:"48px",marginBottom:"12px"}}>🎉</p>
            <p style={{fontWeight:700,fontSize:"16px",color:"var(--text-primary)",marginBottom:"4px"}}>All caught up!</p>
            <p style={{color:"var(--text-muted)"}}>No notifications yet. They'll appear here when there's activity.</p>
          </div>
        </div>
      )}

    </div>
  );
}
