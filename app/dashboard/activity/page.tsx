export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, auditLogs, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Role } from "@/lib/types";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const logs = await db.select({
    id:auditLogs.id, action:auditLogs.action, entity:auditLogs.entity,
    entityId:auditLogs.entityId, userId:auditLogs.userId,
    ipAddress:auditLogs.ipAddress, createdAt:auditLogs.createdAt,
    newValues:auditLogs.newValues,
  }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);

  const allUsers = await db.select({id:users.id,name:users.name}).from(users);
  const userMap = Object.fromEntries(allUsers.map(u=>[u.id,u.name]));

  const ACTION_CONFIG: Record<string,{icon:string;color:string}> = {
    client_created:   {icon:"🏢",color:"var(--green)"},
    task_approved:    {icon:"✅",color:"var(--green)"},
    task_created:     {icon:"🎨",color:"var(--vivit-blue)"},
    invoice_paid:     {icon:"💰",color:"var(--green)"},
    lead_won:         {icon:"🏆",color:"var(--amber)"},
    user_login:       {icon:"👤",color:"var(--text-muted)"},
    user_created:     {icon:"👥",color:"var(--purple)"},
    task_revised:     {icon:"🔄",color:"var(--red)"},
    invoice_created:  {icon:"📄",color:"var(--vivit-blue)"},
    lead_created:     {icon:"🎯",color:"var(--cyan-c)"},
  };

  const now = new Date();

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"900px"}}>
      <div>
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">{logs.length} events · Full audit trail with IP tracking</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Total Events", value:String(logs.length),                             icon:"📝",color:"blue"},
          {label:"Today",        value:String(logs.filter(l=>new Date(l.createdAt).toDateString()===now.toDateString()).length),icon:"📅",color:"green"},
          {label:"This Week",    value:String(logs.filter(l=>now.getTime()-new Date(l.createdAt).getTime()<7*86400000).length),icon:"📊",color:"purple"},
          {label:"Unique Users", value:String(new Set(logs.map(l=>l.userId)).size),     icon:"👥",color:"amber"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.6rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Log Timeline */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Event Timeline</p>
        </div>
        <div style={{maxHeight:"600px",overflowY:"auto"}}>
          {logs.map((log,i)=>{
            const cfg = ACTION_CONFIG[log.action] ?? {icon:"⚡",color:"var(--text-muted)"};
            const mins = Math.floor((now.getTime()-new Date(log.createdAt).getTime())/60000);
            const timeStr = mins<60?`${mins}m ago`:mins<1440?`${Math.floor(mins/60)}h ago`:new Date(log.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
            const showDate = i===0 || new Date(log.createdAt).toDateString()!==new Date(logs[i-1].createdAt).toDateString();
            return (
              <div key={log.id}>
                {showDate&&(
                  <div style={{padding:"8px 20px",background:"var(--bg-tertiary)",borderBottom:"1px solid var(--card-border)",display:"sticky",top:0}}>
                    <p style={{fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.07em"}}>
                      {new Date(log.createdAt).toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long"})}
                    </p>
                  </div>
                )}
                <div style={{display:"flex",gap:"14px",padding:"12px 20px",borderBottom:"1px solid var(--card-border)",alignItems:"flex-start",transition:"background 0.1s"}}
                  onMouseEnter={undefined}>
                  <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`${cfg.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>
                    {cfg.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)"}}>{userMap[log.userId??'']??log.userId?.slice(0,8)??"System"}</span>
                        <span style={{fontSize:"13px",color:"var(--text-secondary)"}}> · {log.action.replace(/_/g," ")}</span>
                        <span style={{fontSize:"12px",color:"var(--text-muted)"}}> on {log.entity}</span>
                      </div>
                      <span style={{fontSize:"11px",color:"var(--text-muted)",flexShrink:0,fontFamily:"JetBrains Mono,monospace"}}>{timeStr}</span>
                    </div>
                    {log.ipAddress&&<p style={{fontSize:"11px",color:"var(--text-dim)",marginTop:"2px",fontFamily:"JetBrains Mono,monospace"}}>IP: {log.ipAddress}</p>}
                    {log.newValues&&log.newValues!=="{}"&&(
                      <p style={{fontSize:"11px",color:"var(--text-muted)",marginTop:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {JSON.parse(log.newValues??'{}').note??log.newValues.slice(0,80)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {logs.length===0&&(
            <div className="empty-state">
              <p className="empty-state-icon">📝</p>
              <p className="empty-state-title">No activity yet</p>
              <p className="empty-state-desc">Mutations will appear here as audit trail events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
