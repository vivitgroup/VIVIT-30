// @ts-nocheck -- Drizzle's generated sales shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, salesLeads, users, proposals } from "@/lib/db";
import { eq, desc, notInArray, count, sum } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

// ── Server Actions ────────────────────────────────────────────
async function moveLead(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.SALES,Role.ACCOUNT_MANAGER].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, salesLeads } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const id    = fd.get("id") as string;
  const stage = fd.get("stage") as string;
  const now   = new Date();
  await db.update(salesLeads).set({
    stage: stage as any,
    updatedAt: now,
    wonAt:  stage === "WON"  ? now : null,
    lostReason: stage === "LOST" ? "Deal not closed" : null,
  }).where(eq(salesLeads.id, id));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/sales");
}

async function createLead(fd: FormData) {
  "use server";
  const { db, salesLeads } = await import("@/lib/db");
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user || ![Role.SUPER_ADMIN,Role.SALES,Role.ACCOUNT_MANAGER].includes((session.user as any).role)) throw new Error("Unauthorized");
  await db.insert(salesLeads).values({
    companyName:    fd.get("companyName") as string,
    contactPerson:  fd.get("contactPerson") as string,
    phone:          fd.get("phone") as string || null,
    source:         (fd.get("source") as any) || "WEBSITE",
    estimatedValue: parseFloat(fd.get("estimatedValue") as string) || 0,
    stage:          "NEW_LEAD",
    probability:    5,
    industry:       fd.get("industry") as string || null,
    notes:          fd.get("notes") as string || null,
    salesRepId:     (session.user as any).id,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/sales");
}

// ── Page ─────────────────────────────────────────────────────
export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.SALES, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");

  const [allLeads, allReps] = await Promise.all([
    db.select().from(salesLeads).orderBy(desc(salesLeads.updatedAt)),
    db.select({ id:users.id, name:users.name }).from(users)
      .where(eq(users.role, "SALES")),
  ]);

  // Pipeline config
  const STAGES = [
    { key:"NEW_LEAD",      label:"New Lead",      icon:"🌱", color:"#64748B", prob:5  },
    { key:"CONTACTED",     label:"Contacted",     icon:"📞", color:"#3B82F6", prob:15 },
    { key:"QUALIFIED",     label:"Qualified",     icon:"✅", color:"#8B5CF6", prob:30 },
    { key:"PROPOSAL_SENT", label:"Proposal",      icon:"📋", color:"#F59E0B", prob:50 },
    { key:"NEGOTIATION",   label:"Negotiation",   icon:"🤝", color:"#EF4444", prob:75 },
    { key:"WON",           label:"Won",           icon:"🏆", color:"#10B981", prob:100},
    { key:"LOST",          label:"Lost",          icon:"❌", color:"#94A3B8", prob:0  },
  ];

  const SOURCE_COLORS: Record<string,string> = {
    REFERRAL:"#10B981", INSTAGRAM:"#E1306C", FACEBOOK:"#1877F2",
    WEBSITE:"#3B82F6", COLD_CALL:"#F59E0B", OTHER:"#94A3B8",
  };

  const SCORE_CONFIG = (lead: typeof allLeads[0]) => {
    let score = 0;
    score += lead.estimatedValue >= 50000 ? 30 : lead.estimatedValue >= 20000 ? 20 : lead.estimatedValue >= 5000 ? 10 : 0;
    score += lead.source === "REFERRAL" ? 25 : lead.source === "INSTAGRAM" ? 15 : 10;
    const daysSince = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
    score += daysSince === 0 ? 25 : daysSince <= 2 ? 18 : daysSince <= 5 ? 10 : 2;
    score += lead.stage === "NEGOTIATION" ? 20 : lead.stage === "PROPOSAL_SENT" ? 15 : lead.stage === "QUALIFIED" ? 10 : 5;
    return score >= 70 ? { label:"HOT", color:"#EF4444", bg:"#FEF2F2" } :
           score >= 40 ? { label:"WARM", color:"#F59E0B", bg:"#FFFBEB" } :
                        { label:"COLD", color:"#64748B", bg:"#F8FAFC" };
  };

  // KPIs
  const activeLeads  = allLeads.filter(l=>!["WON","LOST"].includes(l.stage));
  const wonLeads     = allLeads.filter(l=>l.stage==="WON");
  const pipeline     = activeLeads.reduce((s,l)=>s+Number(l.estimatedValue)*l.probability/100, 0);
  const totalWon     = wonLeads.reduce((s,l)=>s+Number(l.estimatedValue), 0);
  const winRate      = allLeads.filter(l=>["WON","LOST"].includes(l.stage)).length > 0
    ? Math.round(wonLeads.length / allLeads.filter(l=>["WON","LOST"].includes(l.stage)).length * 100) : 0;
  const avgDeal      = wonLeads.length > 0 ? Math.round(totalWon / wonLeads.length) : 0;
  const fmt          = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  const [showAdd, setShowAdd] = ["", ""];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Sales CRM</h1>
          <p className="page-subtitle">{activeLeads.length} active leads · {fmt(pipeline)} weighted pipeline</p>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <Link href="/dashboard/sales#add" className="btn btn-primary" style={{textDecoration:"none"}}>+ New Lead</Link>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
        {[
          { label:"Active Leads",   value:String(activeLeads.length), icon:"🎯", color:"blue"   },
          { label:"Pipeline Value", value:fmt(pipeline),               icon:"💰", color:"amber"  },
          { label:"Total Won",      value:fmt(totalWon),               icon:"🏆", color:"green"  },
          { label:"Win Rate",       value:`${winRate}%`,               icon:"📈", color:winRate>=40?"green":"red" },
          { label:"Avg Deal",       value:fmt(avgDeal),                icon:"💎", color:"purple" },
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.5rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Kanban */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Pipeline Board</p>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{fontSize:"12px",color:"var(--text-muted)"}}>
              {STAGES.filter(s=>!["WON","LOST"].includes(s.key)).map(s=>{
                const cnt = allLeads.filter(l=>l.stage===s.key).length;
                return cnt>0 ? `${s.icon} ${cnt}` : null;
              }).filter(Boolean).join("  ·  ")}
            </span>
          </div>
        </div>
        <div className="card-body" style={{overflowX:"auto",padding:"16px"}}>
          <div style={{display:"flex",gap:"12px",minWidth:"900px"}}>
            {STAGES.filter(s=>s.key!=="LOST").map(stage=>{
              const leads = allLeads.filter(l=>l.stage===stage.key);
              const stageVal = leads.reduce((s,l)=>s+Number(l.estimatedValue),0);
              return (
                <div key={stage.key} style={{flex:1,minWidth:"160px",background:"var(--bg-tertiary)",borderRadius:"12px",overflow:"hidden"}}>
                  {/* Column header */}
                  <div style={{
                    padding:"10px 12px",
                    borderBottom:"3px solid " + stage.color,
                    display:"flex",alignItems:"center",justifyContent:"space-between"
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"14px"}}>{stage.icon}</span>
                      <span style={{fontSize:"12px",fontWeight:700,color:"var(--text-primary)"}}>{stage.label}</span>
                    </div>
                    <span style={{
                      fontSize:"11px",fontWeight:800,
                      background:stage.color+"20",color:stage.color,
                      padding:"2px 8px",borderRadius:"12px"
                    }}>{leads.length}</span>
                  </div>
                  {/* Value */}
                  {leads.length>0&&(
                    <div style={{padding:"6px 12px",borderBottom:"1px solid var(--card-border)",fontSize:"11px",color:"var(--text-muted)",background:"var(--card-bg)"}}>
                      {fmt(stageVal)} total
                    </div>
                  )}
                  {/* Cards */}
                  <div style={{padding:"8px",display:"flex",flexDirection:"column",gap:"6px",maxHeight:"400px",overflowY:"auto"}}>
                    {leads.map(lead=>{
                      const score = SCORE_CONFIG(lead);
                      return (
                        <div key={lead.id} className="kanban-card" style={{padding:"10px 12px"}}>
                          {/* Score + company */}
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"6px"}}>
                            <p style={{fontSize:"12.5px",fontWeight:700,color:"var(--text-primary)",lineHeight:1.3,flex:1,marginRight:"6px"}}>{lead.companyName}</p>
                            <span style={{fontSize:"9.5px",fontWeight:800,padding:"2px 7px",borderRadius:"12px",background:score.bg,color:score.color,flexShrink:0}}>{score.label}</span>
                          </div>
                          {/* Contact */}
                          <p style={{fontSize:"11px",color:"var(--text-muted)",marginBottom:"6px"}}>{lead.contactPerson}</p>
                          {/* Value + Source */}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                            <span style={{fontSize:"12px",fontWeight:700,color:"var(--vivit-blue)"}}>{fmt(Number(lead.estimatedValue))}</span>
                            <span style={{fontSize:"10px",fontWeight:600,padding:"1px 6px",borderRadius:"10px",background:SOURCE_COLORS[lead.source]+"15",color:SOURCE_COLORS[lead.source]}}>
                              {lead.source?.replace(/_/g," ")}
                            </span>
                          </div>
                          {/* Move actions */}
                          {stage.key!=="WON"&&(
                            <div style={{display:"flex",gap:"4px"}}>
                              {stage.key!=="NEGOTIATION"&&(
                                <form action={moveLead} style={{flex:1}}>
                                  <input type="hidden" name="id" value={lead.id}/>
                                  <input type="hidden" name="stage" value={STAGES[STAGES.findIndex(s=>s.key===stage.key)+1]?.key||"WON"}/>
                                  <button type="submit" style={{width:"100%",padding:"4px 0",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--vivit-blue)",background:"rgba(33,150,243,0.08)",color:"var(--vivit-blue)",cursor:"pointer",fontFamily:"inherit"}}>
                                    Advance →
                                  </button>
                                </form>
                              )}
                              {stage.key==="NEGOTIATION"&&(
                                <>
                                  <form action={moveLead} style={{flex:1}}>
                                    <input type="hidden" name="id" value={lead.id}/>
                                    <input type="hidden" name="stage" value="WON"/>
                                    <button type="submit" style={{width:"100%",padding:"4px 0",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--green)",background:"var(--green-bg)",color:"var(--green)",cursor:"pointer",fontFamily:"inherit"}}>
                                      Won ✓
                                    </button>
                                  </form>
                                  <form action={moveLead}>
                                    <input type="hidden" name="id" value={lead.id}/>
                                    <input type="hidden" name="stage" value="LOST"/>
                                    <button type="submit" style={{padding:"4px 8px",fontSize:"10.5px",fontWeight:700,borderRadius:"6px",border:"1px solid var(--red)",background:"var(--red-bg)",color:"var(--red)",cursor:"pointer",fontFamily:"inherit"}}>
                                      ✗
                                    </button>
                                  </form>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {leads.length===0&&(
                      <div style={{textAlign:"center",padding:"20px 10px",color:"var(--text-dim)",fontSize:"12px"}}>
                        No leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Lead Form */}
      <div className="card" id="add">
        <div className="card-header">
          <p className="card-title">+ Add New Lead</p>
        </div>
        <div className="card-body">
          <form action={createLead}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"12px"}}>
              <div>
                <label className="form-label">Company Name *</label>
                <input name="companyName" required placeholder="Acme Corp" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Contact Person *</label>
                <input name="contactPerson" required placeholder="Ahmed Mohamed" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input name="phone" placeholder="+201001234567" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Estimated Value ($) *</label>
                <input name="estimatedValue" type="number" required placeholder="15000" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Lead Source</label>
                <select name="source" className="form-select">
                  {["REFERRAL","INSTAGRAM","FACEBOOK","WEBSITE","COLD_CALL","OTHER"].map(s=>(
                    <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Industry</label>
                <input name="industry" placeholder="F&B, Real Estate..." className="form-input"/>
              </div>
            </div>
            <div style={{marginBottom:"12px"}}>
              <label className="form-label">Notes</label>
              <textarea name="notes" rows={2} placeholder="Additional context about this lead..." className="form-input" style={{resize:"vertical",fontFamily:"inherit"}}/>
            </div>
            <button type="submit" className="btn btn-primary">Add to Pipeline →</button>
          </form>
        </div>
      </div>

      {/* All Leads Table */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">All Leads ({allLeads.length})</p>
          <div style={{display:"flex",gap:"8px"}}>
            <span className="badge badge-green">{wonLeads.length} Won</span>
            <span className="badge badge-amber">{activeLeads.length} Active</span>
          </div>
        </div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr>
              <th>Company</th><th>Contact</th><th>Value</th><th>Stage</th>
              <th>Score</th><th>Source</th><th>Last Update</th>
            </tr></thead>
            <tbody>
              {allLeads.slice(0,20).map(lead=>{
                const score = SCORE_CONFIG(lead);
                const stage = STAGES.find(s=>s.key===lead.stage);
                const days  = Math.floor((Date.now()-new Date(lead.updatedAt).getTime())/86400000);
                return (
                  <tr key={lead.id}>
                    <td>
                      <p style={{fontWeight:700,fontSize:"13.5px"}}>{lead.companyName}</p>
                      <p style={{fontSize:"11px",color:"var(--text-muted)"}}>{lead.industry}</p>
                    </td>
                    <td style={{fontSize:"13px",color:"var(--text-secondary)"}}>{lead.contactPerson}</td>
                    <td style={{fontWeight:700,color:"var(--vivit-blue)"}}>{fmt(Number(lead.estimatedValue))}</td>
                    <td>
                      <span style={{
                        display:"inline-flex",alignItems:"center",gap:"4px",
                        fontSize:"11.5px",fontWeight:600,padding:"3px 10px",borderRadius:"20px",
                        background:stage?.color+"15",color:stage?.color
                      }}>
                        {stage?.icon} {stage?.label}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{background:score.bg,color:score.color}}>{score.label}</span>
                    </td>
                    <td>
                      <span style={{fontSize:"11px",fontWeight:600,padding:"2px 8px",borderRadius:"12px",background:SOURCE_COLORS[lead.source]+"15",color:SOURCE_COLORS[lead.source]}}>
                        {lead.source?.replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{fontSize:"12px",color:days>5?"var(--red)":days>2?"var(--amber)":"var(--text-muted)"}}>
                      {days===0?"Today":days===1?"Yesterday":`${days}d ago`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
