export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, users } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  const userId = (session.user as any).id as string;
  if (![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER,Role.ACCOUNTANT].includes(role)) redirect("/dashboard");
  const canAddClient=[Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.ACCOUNTANT].includes(role);

  const allClients = await db.select({
    id:clients.id, companyName:clients.companyName, industry:clients.industry,
    healthScore:clients.healthScore, churnRisk:clients.churnRisk,
    monthlyRetainer:clients.monthlyRetainer, lifetimeValue:clients.lifetimeValue,
    isActive:clients.isActive, accountManagerId:clients.accountManagerId,
    contractEnd:clients.contractEnd, mediaBudget:clients.mediaBudget,
    createdAt:clients.createdAt,
  }).from(clients).where(and(eq(clients.isActive,true),role===Role.ACCOUNT_MANAGER?eq(clients.accountManagerId,userId):role===Role.MEDIA_BUYER?eq(clients.mediaBuyerId,userId):eq(clients.workspaceId,"default"))).orderBy(clients.healthScore);

  const allAMs = await db.select({id:users.id,name:users.name}).from(users).where(eq(users.role,"ACCOUNT_MANAGER"));
  const amMap  = Object.fromEntries(allAMs.map(u=>[u.id,u.name]));

  const totalARR  = allClients.reduce((s,c)=>s+c.monthlyRetainer*12,0);
  const atRisk    = allClients.filter(c=>c.churnRisk==="HIGH").length;
  const avgHealth = allClients.length>0 ? Math.round(allClients.reduce((s,c)=>s+c.healthScore,0)/allClients.length) : 0;

  const RISK_BADGE: Record<string,string> = { HIGH:"badge-red", MEDIUM:"badge-amber", LOW:"badge-green" };

  const fmt = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{allClients.length} active clients · Sorted by health score</p>
        </div>
        {canAddClient&&<Link href="/dashboard/clients/new" className="btn btn-primary" style={{textDecoration:"none"}}>
          + Add Client
        </Link>}
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Total Clients", value:String(allClients.length), icon:"🏢", color:"blue"},
          {label:"Annual Revenue",value:fmt(totalARR),             icon:"💰", color:"green"},
          {label:"Avg Health",    value:`${avgHealth}%`,           icon:"❤️", color:avgHealth>=80?"green":avgHealth>=60?"amber":"red"},
          {label:"At Risk",       value:String(atRisk),            icon:"⚠️", color:atRisk>0?"red":"green"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.5rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Client filter */}
      <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
        <input type="search" id="client-filter" placeholder="🔍 Filter by name, industry, AM..."
          className="form-input" style={{maxWidth:"320px"}}
          onInput={undefined}/>
        <script dangerouslySetInnerHTML={{__html:`
          document.getElementById('client-filter')?.addEventListener('input',function(){
            var q=this.value.toLowerCase();
            document.querySelectorAll('tbody tr').forEach(function(r){
              r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';
            });
          });
        `}}/>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr>
              <th>Client</th><th>Industry</th><th>Account Manager</th>
              <th>Health</th><th>Risk</th><th>Monthly</th><th>LTV</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {allClients.map(c=>{
                const h=Math.round(c.healthScore);
                const barColor=h>=80?"var(--green)":h>=60?"var(--amber)":"var(--red)";
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <div className="avatar avatar-sm" style={{background:barColor,fontSize:"11px"}}>
                          {c.companyName.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p style={{fontWeight:700,color:"var(--text-primary)",fontSize:"13.5px"}}>{c.companyName}</p>
                          {c.contractEnd&&<p style={{fontSize:"11px",color:"var(--text-muted)"}}>Contract ends {new Date(c.contractEnd).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{fontSize:"12.5px",color:"var(--text-secondary)"}}>{c.industry??"—"}</span></td>
                    <td><span style={{fontSize:"12.5px",color:"var(--text-secondary)"}}>{amMap[c.accountManagerId??""]?.split(" ")[0]??"—"}</span></td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:"80px"}}>
                        <div className="progress-bar" style={{flex:1}}>
                          <div className="progress-fill" style={{width:`${h}%`,background:barColor}}/>
                        </div>
                        <span style={{fontSize:"12px",fontWeight:700,color:barColor,flexShrink:0}}>{h}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${RISK_BADGE[c.churnRisk]}`}>{c.churnRisk}</span></td>
                    <td style={{fontWeight:700,color:"var(--text-primary)"}}>{fmt(c.monthlyRetainer)}</td>
                    <td style={{fontWeight:600,color:"var(--vivit-blue)"}}>{fmt(c.lifetimeValue??0)}</td>
                    <td>
                      <Link href={`/dashboard/clients/${c.id}`} className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Open →</Link>
                    </td>
                  </tr>
                );
              })}
              {allClients.length===0&&(
                <tr><td colSpan={8}>
                  <div style={{textAlign:"center",padding:"48px",color:"var(--text-muted)"}}>
                    <p style={{fontSize:"32px",marginBottom:"8px"}}>🏢</p>
                    <p style={{fontWeight:600,marginBottom:"4px"}}>No clients yet</p>
                    {canAddClient&&<Link href="/dashboard/clients/new" className="btn btn-primary btn-sm" style={{textDecoration:"none",marginTop:"12px",display:"inline-flex"}}>Add First Client</Link>}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
