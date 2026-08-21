// @ts-nocheck -- Drizzle's generated task shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, creativeTasks, clients, users } from "@/lib/db";
import { eq, and, notInArray, lt, desc, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

async function bulkAction(fd: FormData) {
  "use server";
  const { db, creativeTasks } = await import("@/lib/db");
  const { inArray } = await import("drizzle-orm");
  const action = fd.get("action") as string;
  const ids = fd.getAll("taskId") as string[];
  if (!ids.length) return;
  const statusMap: Record<string,string> = {
    approve:"APPROVED", complete:"COMPLETED", in_progress:"IN_PROGRESS", urgent_on:"PENDING",
  };
  if (statusMap[action]) {
    await db.update(creativeTasks).set({
      status: statusMap[action] as any,
      priority: action === "urgent_on" ? "URGENT" as any : undefined,
      updatedAt: new Date()
    }).where(inArray(creativeTasks.id, ids));
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/tasks-inbox");
}

export default async function TasksInboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");

  const now = new Date();
  const allTasks = await db.select({
    id:creativeTasks.id, title:creativeTasks.title, type:creativeTasks.type,
    status:creativeTasks.status, priority:creativeTasks.priority,
    deadline:creativeTasks.deadline, clientId:creativeTasks.clientId,
    assignedToId:creativeTasks.assignedToId, revisionCount:creativeTasks.revisionCount,
    fileUrl:creativeTasks.fileUrl, brief:creativeTasks.brief, createdAt:creativeTasks.createdAt,
  }).from(creativeTasks)
    .where(notInArray(creativeTasks.status,["COMPLETED","REJECTED"]))
    .orderBy(desc(creativeTasks.createdAt)).limit(100);

  const [allClients, allCreators] = await Promise.all([
    db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.isActive,true)),
    db.select({id:users.id,name:users.name}).from(users).where(eq(users.role,"CREATOR")),
  ]);

  const clientMap  = Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));
  const creatorMap = Object.fromEntries(allCreators.map(u=>[u.id,u.name]));

  const GROUPS = [
    { key:"review",      label:"Awaiting Review",   icon:"👀", filter:(t:any)=>t.status==="REVIEW",                              color:"var(--amber)" },
    { key:"overdue",     label:"Overdue",            icon:"🚨", filter:(t:any)=>new Date(t.deadline)<now&&t.status!=="REVIEW",   color:"var(--red)" },
    { key:"urgent",      label:"Urgent",             icon:"⚡", filter:(t:any)=>t.priority==="URGENT"&&t.status!=="REVIEW",      color:"var(--orange)" },
    { key:"in_progress", label:"In Progress",        icon:"⚙️", filter:(t:any)=>t.status==="IN_PROGRESS"&&t.priority!=="URGENT", color:"var(--vivit-blue)" },
    { key:"pending",     label:"Pending",            icon:"📋", filter:(t:any)=>t.status==="PENDING"&&t.priority!=="URGENT",    color:"var(--text-muted)" },
    { key:"revision",    label:"Needs Revision",     icon:"🔄", filter:(t:any)=>t.status==="REVISION",                          color:"var(--red)" },
  ];

  const TYPE_ICONS: Record<string,string> = {REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📱",STORY:"📸",UGC:"🎤",MOTION:"🎞️",COPY:"✍️",REPORT:"📊"};
  const PRIORITY_CLASS: Record<string,string> = {URGENT:"badge-red",HIGH:"badge-amber",MEDIUM:"badge-blue",LOW:"badge-gray"};
  const fmt = (d:Date) => { const days=Math.ceil((d.getTime()-now.getTime())/86400000); return days<0?`${Math.abs(days)}d late`:days===0?"Today":`${days}d left`; };
  const overdueCnt = allTasks.filter(t=>new Date(t.deadline)<now&&!["COMPLETED","APPROVED"].includes(t.status)).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Tasks Inbox</h1>
          <p className="page-subtitle">{allTasks.length} active tasks · {allTasks.filter(t=>t.status==="REVIEW").length} awaiting review · {overdueCnt} overdue</p>
        </div>
        <Link href="/dashboard/creative/new" className="btn btn-primary" style={{textDecoration:"none"}}>+ New Task</Link>
      </div>

      {/* Bulk actions */}
      <form action={bulkAction}>
        <div className="card">
          <div className="card-body" style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
            <p style={{fontSize:"12px",fontWeight:700,color:"var(--text-muted)",marginRight:"4px"}}>BULK ACTIONS:</p>
            {[
              {action:"approve",     label:"✅ Approve",     style:"btn-success btn-sm"},
              {action:"complete",    label:"📦 Complete",    style:"btn-primary btn-sm"},
              {action:"urgent_on",   label:"🚨 Set Urgent",  style:"btn-sm",customStyle:{background:"var(--orange-bg)",color:"var(--orange)",border:"1px solid rgba(234,88,12,0.2)"}},
              {action:"in_progress", label:"↩ In Progress", style:"btn-ghost btn-sm"},
            ].map(a=>(
              <button key={a.action} type="submit" name="action" value={a.action}
                className={`btn ${a.style}`} style={a.customStyle}>
                {a.label}
              </button>
            ))}
            <p style={{fontSize:"11.5px",color:"var(--text-muted)",marginLeft:"auto"}}>Check tasks below then click action</p>
          </div>
        </div>

        {/* Task Groups */}
        {GROUPS.map(group=>{
          const tasks = allTasks.filter(group.filter);
          if (!tasks.length) return null;
          return (
            <div key={group.key} className="card" style={{borderLeft:`3px solid ${group.color}`}}>
              <div className="card-header" style={{padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"16px"}}>{group.icon}</span>
                  <p className="card-title" style={{fontSize:"14px",color:group.color}}>{group.label}</p>
                  <span className="badge" style={{background:group.color+"20",color:group.color,fontSize:"11px"}}>{tasks.length}</span>
                </div>
              </div>
              <div className="card-body-flush">
                <table className="data-table">
                  <thead><tr>
                    <th style={{width:36}}><input type="checkbox" style={{accentColor:"var(--vivit-blue)"}}/></th>
                    <th>Task</th><th>Client</th><th>Creator</th><th>Priority</th><th>Deadline</th><th>Revisions</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {tasks.map(t=>{
                      const daysLeft = Math.ceil((new Date(t.deadline).getTime()-now.getTime())/86400000);
                      const overdue  = daysLeft<0;
                      return (
                        <tr key={t.id}>
                          <td><input type="checkbox" name="taskId" value={t.id} style={{accentColor:"var(--vivit-blue)"}}/></td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                              <span style={{fontSize:"15px"}}>{TYPE_ICONS[t.type]??""}</span>
                              <div>
                                <Link href={`/dashboard/creative/${t.id}`} style={{textDecoration:"none",fontWeight:600,fontSize:"13px",color:"var(--text-primary)"}}>
                                  {t.title}
                                </Link>
                                <p style={{fontSize:"11px",color:"var(--text-muted)"}}>{t.status.replace(/_/g," ")}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:"13px",color:"var(--text-secondary)"}}>{clientMap[t.clientId]??""}</td>
                          <td style={{fontSize:"12.5px",color:"var(--text-muted)"}}>{creatorMap[t.assignedToId??""]?.split(" ")[0]??"—"}</td>
                          <td><span className={`badge ${PRIORITY_CLASS[t.priority]}`} style={{fontSize:"10.5px"}}>{t.priority}</span></td>
                          <td style={{fontWeight:700,fontSize:"12.5px",color:overdue?"var(--red)":daysLeft<=2?"var(--amber)":"var(--text-muted)"}}>
                            {fmt(new Date(t.deadline))}
                          </td>
                          <td style={{textAlign:"center"}}>
                            {t.revisionCount>0 ? <span className="badge badge-red" style={{fontSize:"10.5px"}}>↩{t.revisionCount}</span> : <span style={{color:"var(--text-dim)"}}>—</span>}
                          </td>
                          <td>
                            <div style={{display:"flex",gap:"5px"}}>
                              {t.fileUrl&&<a href={t.fileUrl} target="_blank" className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"11px",padding:"3px 8px"}}>📎</a>}
                              <Link href={`/dashboard/creative/${t.id}`} className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"11px",padding:"3px 8px"}}>Open</Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </form>
    </div>
  );
}
