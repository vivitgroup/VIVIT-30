export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, creativeTasks, clients, users } from "@/lib/db";
import { eq, and, notInArray, desc, count } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

async function updateStatus(fd: FormData) {
  "use server";
  const { db, creativeTasks } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const id = fd.get("id") as string;
  const status = fd.get("status") as string;
  const priority = fd.get("priority") as string | null;
  const updateData: Record<string,any> = { status: status as any, updatedAt: new Date() };
  if (priority) updateData.priority = priority as any;
  if (status === "COMPLETED") updateData.completedAt = new Date();
  await db.update(creativeTasks).set(updateData).where(eq(creativeTasks.id, id));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/creative");
}

export default async function CreativePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role   = (session.user as any).role as Role;
  const userId = (session.user as any).id as string;
  if (![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.CREATOR].includes(role)) redirect("/dashboard");

  const isCreator = role === Role.CREATOR;

  const [allTasks, allClients, allCreators] = await Promise.all([
    db.select({
      id:creativeTasks.id, title:creativeTasks.title, type:creativeTasks.type,
      status:creativeTasks.status, priority:creativeTasks.priority,
      deadline:creativeTasks.deadline, clientId:creativeTasks.clientId,
      assignedToId:creativeTasks.assignedToId, revisionCount:creativeTasks.revisionCount,
      fileUrl:creativeTasks.fileUrl, brief:creativeTasks.brief, isPosted:creativeTasks.isPosted,
      createdAt:creativeTasks.createdAt,
    }).from(creativeTasks)
      .where(isCreator
        ? and(eq(creativeTasks.assignedToId,userId), notInArray(creativeTasks.status,["COMPLETED","REJECTED"]))
        : notInArray(creativeTasks.status,["COMPLETED","REJECTED"]))
      .orderBy(desc(creativeTasks.createdAt)).limit(100),
    db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.isActive,true)),
    db.select({id:users.id,name:users.name}).from(users).where(eq(users.role,"CREATOR")),
  ]);

  const clientMap  = Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));
  const creatorMap = Object.fromEntries(allCreators.map(u=>[u.id,u.name]));
  const now = new Date();

  const STAGES = [
    { key:"PENDING",     label:"Pending",     icon:"📋", color:"#64748B" },
    { key:"IN_PROGRESS", label:"In Progress", icon:"⚡", color:"#3B82F6" },
    { key:"REVIEW",      label:"Review",      icon:"👀", color:"#F59E0B" },
    { key:"APPROVED",    label:"Approved",    icon:"✅", color:"#10B981" },
    { key:"REVISION",    label:"Revision",    icon:"🔄", color:"#EF4444" },
  ];

  const PRIORITY_BADGE: Record<string,string> = {
    URGENT:"badge-red", HIGH:"badge-amber", MEDIUM:"badge-blue", LOW:"badge-gray"
  };

  const TYPE_ICONS: Record<string,string> = {
    REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📱",STORY:"📸",
    UGC:"🎤",MOTION:"🎞️",COPY:"✍️",REPORT:"📊",
  };

  // Workload per creator
  const workload = Object.fromEntries(
    allCreators.map(u=>[u.id, allTasks.filter(t=>t.assignedToId===u.id).length])
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Creative Tasks</h1>
          <p className="page-subtitle">
            {allTasks.length} active · {allTasks.filter(t=>t.status==="REVIEW").length} in review · {allTasks.filter(t=>new Date(t.deadline)<now).length} overdue
          </p>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <Link href="/dashboard/tasks-inbox" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Tasks Inbox</Link>
          {!isCreator&&<Link href="/dashboard/creative/new" className="btn btn-primary" style={{textDecoration:"none"}}>+ New Task</Link>}
        </div>
      </div>

      {/* Creator Workload Strip */}
      {!isCreator && allCreators.length>0 && (
        <div className="card">
          <div className="card-body" style={{padding:"12px 16px"}}>
            <p style={{fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px"}}>Creator Workload</p>
            <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
              {allCreators.map(u=>{
                const load = workload[u.id]??0;
                const color = load<=2?"var(--green)":load<=4?"var(--amber)":load<=5?"#F97316":"var(--red)";
                const status = load<=2?"Available":load<=4?"Moderate":load<=5?"Heavy":"Overloaded";
                return (
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:"var(--bg-tertiary)",borderRadius:"8px",border:"1px solid var(--card-border)"}}>
                    <div className="avatar avatar-sm" style={{background:color}}>
                      {u.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <p style={{fontSize:"12px",fontWeight:700,color:"var(--text-primary)"}}>{u.name.split(" ")[0]}</p>
                      <p style={{fontSize:"10.5px",color}}>{load} tasks · {status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{overflowX:"auto",paddingBottom:"8px"}}>
        <div style={{display:"flex",gap:"12px",minWidth:"900px"}}>
          {STAGES.map(stage=>{
            const tasks = allTasks.filter(t=>t.status===stage.key);
            return (
              <div key={stage.key} style={{flex:1,minWidth:"200px",background:"var(--bg-tertiary)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>

                {/* Column header */}
                <div style={{padding:"12px 14px",borderBottom:`3px solid ${stage.color}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                    <span style={{fontSize:"15px"}}>{stage.icon}</span>
                    <span style={{fontSize:"12.5px",fontWeight:700,color:"var(--text-primary)"}}>{stage.label}</span>
                  </div>
                  <span style={{fontSize:"12px",fontWeight:800,padding:"2px 9px",borderRadius:"12px",background:stage.color+"20",color:stage.color}}>
                    {tasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div style={{padding:"8px",display:"flex",flexDirection:"column",gap:"6px",maxHeight:"500px",overflowY:"auto"}}>
                  {tasks.map(task=>{
                    const daysLeft = Math.ceil((new Date(task.deadline).getTime()-now.getTime())/86400000);
                    const overdue  = daysLeft<0;
                    const urgentDeadline = daysLeft>=0&&daysLeft<=2;
                    return (
                      <div key={task.id} style={{
                        background:"var(--card-bg)",
                        border:`1px solid ${overdue?"rgba(239,68,68,0.3)":urgentDeadline?"rgba(245,158,11,0.3)":"var(--card-border)"}`,
                        borderRadius:"10px",
                        padding:"10px 12px",
                        transition:"all 0.15s ease",
                        cursor:"pointer",
                      }}>
                        {/* Type icon + Title */}
                        <div style={{display:"flex",alignItems:"flex-start",gap:"6px",marginBottom:"6px"}}>
                          <span style={{fontSize:"14px",flexShrink:0,marginTop:"1px"}}>{TYPE_ICONS[task.type]??""}</span>
                          <Link href={`/dashboard/creative/${task.id}`} style={{textDecoration:"none"}}>
                            <p style={{fontSize:"12.5px",fontWeight:700,color:"var(--text-primary)",lineHeight:1.35}}>{task.title}</p>
                          </Link>
                        </div>

                        {/* Client */}
                        <p style={{fontSize:"11px",color:"var(--text-muted)",marginBottom:"6px"}}>{clientMap[task.clientId]??""}</p>

                        {/* Meta row */}
                        <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap",marginBottom:"8px"}}>
                          <span className={`badge ${PRIORITY_BADGE[task.priority]}`} style={{fontSize:"10px",padding:"1px 6px"}}>{task.priority}</span>
                          {task.revisionCount>0&&<span className="badge badge-red" style={{fontSize:"10px",padding:"1px 6px"}}>↩{task.revisionCount}</span>}
                          {task.fileUrl&&<span className="badge badge-blue" style={{fontSize:"10px",padding:"1px 6px"}}>📎 File</span>}
                        </div>

                        {/* Deadline + Creator */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:"10.5px",fontWeight:700,color:overdue?"var(--red)":urgentDeadline?"var(--amber)":"var(--text-muted)"}}>
                            {overdue?`${Math.abs(daysLeft)}d late`:daysLeft===0?"Due today":`${daysLeft}d left`}
                          </span>
                          {task.assignedToId&&(
                            <div className="avatar avatar-sm" style={{width:"22px",height:"22px",fontSize:"9px",background:"var(--vivit-gradient)"}}>
                              {creatorMap[task.assignedToId]?.split(" ").map((n:string)=>n[0]).join("").slice(0,2)??""}</div>
                          )}
                        </div>

                        {/* Quick actions */}
                        {!isCreator&&(
                          <div style={{display:"flex",gap:"4px",marginTop:"8px",paddingTop:"8px",borderTop:"1px solid var(--card-border)"}}>
                            {stage.key==="REVIEW"&&(
                              <form action={updateStatus} style={{flex:1}}>
                                <input type="hidden" name="id" value={task.id}/>
                                <input type="hidden" name="status" value="APPROVED"/>
                                <button type="submit" style={{width:"100%",padding:"4px",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--green)",background:"var(--green-bg)",color:"var(--green)",cursor:"pointer",fontFamily:"inherit"}}>
                                  Approve ✓
                                </button>
                              </form>
                            )}
                            {stage.key==="REVIEW"&&(
                              <form action={updateStatus}>
                                <input type="hidden" name="id" value={task.id}/>
                                <input type="hidden" name="status" value="REVISION"/>
                                <button type="submit" style={{padding:"4px 8px",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--red)",background:"var(--red-bg)",color:"var(--red)",cursor:"pointer",fontFamily:"inherit"}}>
                                  ↩
                                </button>
                              </form>
                            )}
                            {stage.key==="PENDING"&&(
                              <form action={updateStatus} style={{flex:1}}>
                                <input type="hidden" name="id" value={task.id}/>
                                <input type="hidden" name="status" value="IN_PROGRESS"/>
                                <button type="submit" style={{width:"100%",padding:"4px",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--vivit-blue)",background:"rgba(33,150,243,0.08)",color:"var(--vivit-blue)",cursor:"pointer",fontFamily:"inherit"}}>
                                  Start →
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                        {isCreator&&stage.key==="IN_PROGRESS"&&(
                          <div style={{marginTop:"8px",paddingTop:"8px",borderTop:"1px solid var(--card-border)"}}>
                            <Link href={`/dashboard/creative/${task.id}`} className="btn btn-primary btn-sm" style={{textDecoration:"none",width:"100%",justifyContent:"center",fontSize:"11px"}}>
                              Submit for Review →
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {tasks.length===0&&(
                    <div style={{textAlign:"center",padding:"24px",color:"var(--text-dim)",fontSize:"12px"}}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
