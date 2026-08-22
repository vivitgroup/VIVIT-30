// @ts-nocheck -- Drizzle's generated portal shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, mediaMetrics, financeRecords, creativeTasks, clientFeedback, calendarEvents, mediaPlans, notifications, auditLogs, adCampaigns, fileDocuments } from "@/lib/db";
import { eq, and, gte, desc, sum } from "drizzle-orm";
import Link from "next/link";

function safeObject(value:string|null|undefined):Record<string,any>{
  try{const parsed=JSON.parse(value||"{}");return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};}
  catch{return {};}
}

async function reviewMediaPlan(fd:FormData){"use server";const session=await auth();if(!session?.user)throw new Error("Unauthorized");const userId=(session.user as any).id;const [client]=await db.select({id:clients.id}).from(clients).where(eq(clients.userId,userId)).limit(1);if(!client)throw new Error("Forbidden");const planId=String(fd.get("planId")),decision=String(fd.get("decision")),note=String(fd.get("note")||"").slice(0,500);const [plan]=await db.select().from(mediaPlans).where(and(eq(mediaPlans.id,planId),eq(mediaPlans.clientId,client.id))).limit(1);if(!plan||!["APPROVED","REJECTED"].includes(decision))throw new Error("Invalid request");await db.update(mediaPlans).set({status:decision,clientNote:note||null,approvedBy:userId,approvedAt:decision==="APPROVED"?new Date():null,updatedAt:new Date()}).where(eq(mediaPlans.id,planId));await db.insert(notifications).values({userId:plan.submittedBy,type:"MEDIA_PLAN_REVIEW",title:`Media plan ${decision.toLowerCase()}`,message:`The client ${decision.toLowerCase()} ${plan.name}.${note?` Note: ${note}`:""}`,link:"/dashboard/media/control-center",priority:decision==="APPROVED"?"normal":"high"});await db.insert(auditLogs).values({userId,action:`media_plan_${decision.toLowerCase()}`,entity:"media_plans",entityId:planId,newValues:JSON.stringify({note})});const {revalidatePath}=await import("next/cache");revalidatePath("/dashboard/portal");}

async function portalAction(fd:FormData){"use server";const session=await auth();if(!session?.user)throw new Error("Unauthorized");const userId=(session.user as any).id;const [client]=await db.select().from(clients).where(eq(clients.userId,userId)).limit(1);if(!client)throw new Error("Forbidden");const action=String(fd.get("action")||"");const now=new Date();if(action==="nps"){const score=Number(fd.get("score")),comment=String(fd.get("comment")||"").trim().slice(0,500);if(!Number.isInteger(score)||score<0||score>10)throw new Error("Choose a score from 0 to 10");await db.insert(clientFeedback).values({clientId:client.id,score,comment:comment||null,month:now.getMonth()+1,year:now.getFullYear()});await db.insert(auditLogs).values({userId,action:"client_nps_submitted",entity:"clients",entityId:client.id,newValues:JSON.stringify({score,comment})});}else if(action==="message"){const message=String(fd.get("message")||"").trim().slice(0,1000);if(!message)throw new Error("Message is required");const recipient=client.accountManagerId;if(!recipient)throw new Error("No account manager is assigned yet");await db.insert(notifications).values({userId:recipient,type:"CLIENT_MESSAGE",title:`Message from ${client.companyName}`,message,link:"/dashboard/clients",priority:"high"});await db.insert(auditLogs).values({userId,action:"client_message_sent",entity:"clients",entityId:client.id,newValues:JSON.stringify({message})});}else if(action==="task_review"){const taskId=String(fd.get("taskId")||""),decision=String(fd.get("decision")||"");if(!["APPROVED","REVISION"].includes(decision))throw new Error("Invalid decision");const [task]=await db.select().from(creativeTasks).where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.clientId,client.id))).limit(1);if(!task)throw new Error("Task not found");await db.update(creativeTasks).set({status:decision,updatedAt:now,revisionCount:decision==="REVISION"?(task.revisionCount||0)+1:task.revisionCount}).where(eq(creativeTasks.id,taskId));if(task.assignedToId)await db.insert(notifications).values({userId:task.assignedToId,type:"CLIENT_REVIEW",title:`Client ${decision.toLowerCase()}: ${task.title}`,message:decision==="APPROVED"?"The client approved this creative.":"The client requested a revision.",link:`/dashboard/creative/${task.id}`,priority:decision==="REVISION"?"high":"normal"});await db.insert(auditLogs).values({userId,action:`creative_${decision.toLowerCase()}`,entity:"creative_tasks",entityId:task.id});}else throw new Error("Invalid action");const {revalidatePath}=await import("next/cache");revalidatePath("/dashboard/portal");}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "CLIENT") redirect("/dashboard");
  const userId = (session.user as any).id as string;

  const [clientRow] = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  if (!clientRow) {
    return (
      <div style={{textAlign:"center",padding:"80px 24px"}}>
        <p style={{fontSize:"48px",marginBottom:"16px"}}>🏠</p>
        <h2 style={{fontFamily:"Sora,sans-serif",fontSize:"1.5rem",fontWeight:800,color:"var(--text-primary)",marginBottom:"8px"}}>Welcome to Your Portal</h2>
        <p style={{color:"var(--text-muted)"}}>Your account manager is setting up your portal. Please check back shortly.</p>
      </div>
    );
  }

  const now     = new Date();
  const mo      = now.getMonth()+1;
  const yr      = now.getFullYear();
  const moStart = new Date(yr, now.getMonth(), 1);

  const [metrics, finance, pendingTasks, upcoming, recentNPS, pendingPlans, latestInvoices, campaigns, assets] = await Promise.all([
    db.select({ spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads),
      revenue:sum(mediaMetrics.revenue) }).from(mediaMetrics)
      .where(and(eq(mediaMetrics.clientId,clientRow.id), gte(mediaMetrics.date,moStart))),
    db.select({ total:sum(financeRecords.totalRevenue), paid:sum(financeRecords.paid),
      outstanding:sum(financeRecords.outstanding) }).from(financeRecords)
      .where(and(eq(financeRecords.clientId,clientRow.id), eq(financeRecords.month,mo), eq(financeRecords.year,yr))),
    db.select({ id:creativeTasks.id,title:creativeTasks.title,type:creativeTasks.type,fileUrl:creativeTasks.fileUrl,assignedToId:creativeTasks.assignedToId,revisionCount:creativeTasks.revisionCount })
      .from(creativeTasks).where(and(eq(creativeTasks.clientId,clientRow.id),eq(creativeTasks.status,"REVIEW"))).limit(5),
    db.select({ id:calendarEvents.id,title:calendarEvents.title,date:calendarEvents.date,platform:calendarEvents.platform })
      .from(calendarEvents).where(and(eq(calendarEvents.clientId,clientRow.id),gte(calendarEvents.date,now)))
      .orderBy(calendarEvents.date).limit(5),
    db.select({ score:clientFeedback.score,comment:clientFeedback.comment })
      .from(clientFeedback).where(eq(clientFeedback.clientId,clientRow.id))
      .orderBy(desc(clientFeedback.createdAt)).limit(1),
    db.select().from(mediaPlans).where(and(eq(mediaPlans.clientId,clientRow.id),eq(mediaPlans.status,"PENDING_APPROVAL"))).orderBy(desc(mediaPlans.createdAt)),
    db.select({id:financeRecords.id,invoiceNumber:financeRecords.invoiceNumber,total:financeRecords.totalRevenue,paid:financeRecords.paid,outstanding:financeRecords.outstanding,status:financeRecords.invoiceStatus,dueDate:financeRecords.dueDate}).from(financeRecords).where(eq(financeRecords.clientId,clientRow.id)).orderBy(desc(financeRecords.year),desc(financeRecords.month)).limit(1),
    db.select({id:adCampaigns.id,name:adCampaigns.name,platform:adCampaigns.platform,status:adCampaigns.status,dailyBudget:adCampaigns.dailyBudget,lastSyncAt:adCampaigns.lastSyncAt}).from(adCampaigns).where(eq(adCampaigns.clientId,clientRow.id)).orderBy(desc(adCampaigns.updatedAt)).limit(6),
    db.select({id:fileDocuments.id,name:fileDocuments.name,category:fileDocuments.category,createdAt:fileDocuments.createdAt}).from(fileDocuments).where(eq(fileDocuments.clientId,clientRow.id)).orderBy(desc(fileDocuments.createdAt)).limit(6),
  ]);

  const spend    = Number(metrics[0]?.spend??0);
  const leads    = Number(metrics[0]?.leads??0);
  const revenue  = Number(metrics[0]?.revenue??0);
  const roas     = spend>0?(revenue/spend).toFixed(1):"—";
  const cpl      = leads>0?(spend/leads).toFixed(0):"—";
  const outstanding = Number(finance[0]?.outstanding??0);
  const fmt = (n:number) => n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  const TYPE_ICONS: Record<string,string> = {REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📱",STORY:"📸",UGC:"🎤"};
  const PLATFORM_ICONS: Record<string,string> = {instagram:"📸",facebook:"👥",tiktok:"🎵",snapchat:"👻",google:"🔍"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"900px",margin:"0 auto"}}>

      {/* Welcome Banner */}
      <div style={{
        background:"var(--vivit-gradient)",borderRadius:"var(--radius-lg)",
        padding:"24px 28px",color:"#fff",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"
      }}>
        <div>
          <p style={{fontSize:"13px",opacity:0.8,fontWeight:600,marginBottom:"4px"}}>Welcome back 👋</p>
          <h1 style={{fontFamily:"Sora,sans-serif",fontSize:"1.8rem",fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>{clientRow.companyName}</h1>
          <p style={{opacity:0.8,fontSize:"13px",marginTop:"4px"}}>{clientRow.industry} · Client Portal</p>
        </div>
        <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
          <div style={{textAlign:"center",background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"12px 20px"}}>
            <p style={{fontSize:"22px",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>{pendingTasks.length+pendingPlans.length}</p>
            <p style={{fontSize:"11px",opacity:0.75}}>Pending approvals</p>
          </div>
          <div style={{textAlign:"center",background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"12px 20px"}}>
            <p style={{fontSize:"22px",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>{roas}×</p>
            <p style={{fontSize:"11px",opacity:0.75}}>ROAS</p>
          </div>
        </div>
      </div>

      {latestInvoices[0]&&<div className="card" style={{borderTop:"3px solid var(--green)"}}><div className="card-body" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}><div><p style={{fontSize:11,fontWeight:800,color:"var(--text-muted)",textTransform:"uppercase"}}>Latest invoice</p><p style={{fontWeight:800,color:"var(--text-primary)",marginTop:4}}>{latestInvoices[0].invoiceNumber||"Current invoice"} · {fmt(Number(latestInvoices[0].total||0))}</p><p style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>{latestInvoices[0].status} · Outstanding {fmt(Number(latestInvoices[0].outstanding||0))}{latestInvoices[0].dueDate?` · Due ${new Date(latestInvoices[0].dueDate).toLocaleDateString()}`:""}</p></div><a href={`/api/invoice/${latestInvoices[0].id}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{textDecoration:"none"}}>View / print invoice ↗</a></div></div>}

      <div className="card" style={{borderTop:"3px solid var(--vivit-blue)"}}>
        <div className="card-header"><div><p className="card-title">🔗 Your Connected Workspace</p><p style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>Campaigns, calendar posts, creatives and files linked to {clientRow.companyName}</p></div></div>
        <div className="card-body" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10}}>
          {[{label:"Campaigns",value:campaigns.length,icon:"📣"},{label:"Upcoming posts",value:upcoming.length,icon:"📅"},{label:"Creative approvals",value:pendingTasks.length,icon:"🎨"},{label:"Recent files",value:assets.length,icon:"📁"}].map(item=><div key={item.label} style={{padding:14,border:"1px solid var(--card-border)",borderRadius:10,background:"var(--bg-tertiary)"}}><div style={{fontSize:20}}>{item.icon}</div><strong style={{fontSize:22,color:"var(--text-primary)"}}>{item.value}</strong><p style={{fontSize:11,color:"var(--text-muted)"}}>{item.label}</p></div>)}
        </div>
        {(campaigns.length>0||assets.length>0)&&<div className="card-body" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingTop:0}}>
          <div><p style={{fontSize:12,fontWeight:800,marginBottom:8}}>Campaigns</p>{campaigns.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--card-border)",fontSize:12}}><span>{c.platform} · {c.name}</span><span className="badge badge-blue">{c.status}</span></div>)}</div>
          <div><p style={{fontSize:12,fontWeight:800,marginBottom:8}}>Files & designs</p>{assets.map(f=><div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--card-border)",fontSize:12}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📎 {f.name}</span><span style={{color:"var(--text-muted)"}}>{f.category}</span></div>)}</div>
        </div>}
      </div>

      {pendingPlans.length>0&&<div className="card" style={{borderTop:"3px solid #244D87"}}><div className="card-header"><p className="card-title">📣 Media Plans Awaiting Approval</p><span className="badge badge-blue">{pendingPlans.length}</span></div><div className="card-body" style={{display:"grid",gap:"10px"}}>{pendingPlans.map(p=>{const forecast=safeObject(p.forecast);return <div key={p.id} style={{padding:14,border:"1px solid var(--card-border)",borderRadius:10}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><strong>{p.name}</strong><p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()} · Budget {fmt(p.totalBudget)} · Expected leads {forecast.expectedLeads||0}</p></div><span className="badge badge-amber">Review</span></div><div style={{display:"flex",gap:6,marginTop:10}}><form action={reviewMediaPlan}><input type="hidden" name="planId" value={p.id}/><input type="hidden" name="decision" value="APPROVED"/><button className="btn btn-success btn-sm">Approve ✓</button></form><form action={reviewMediaPlan} style={{display:"flex",gap:6,flex:1}}><input type="hidden" name="planId" value={p.id}/><input type="hidden" name="decision" value="REJECTED"/><input name="note" className="form-input" placeholder="Revision note"/><button className="btn btn-danger btn-sm">Request changes</button></form></div></div>})}</div></div>}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Ad Spend MTD",  value:fmt(spend),  icon:"💸",color:"blue"},
          {label:"Leads MTD",     value:String(leads),icon:"👥",color:"purple"},
          {label:"Revenue MTD",   value:fmt(revenue), icon:"💰",color:"green"},
          {label:"Outstanding",   value:fmt(outstanding),icon:"⏳",color:outstanding>0?"red":"green"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.4rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>

        {/* Pending Approvals */}
        <div className="card" style={{borderTop:"3px solid var(--amber)"}}>
          <div className="card-header">
            <p className="card-title">⏳ Awaiting Your Approval</p>
            {pendingTasks.length>0&&<span className="badge badge-amber">{pendingTasks.length}</span>}
          </div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {pendingTasks.length===0 ? (
              <div style={{textAlign:"center",padding:"24px",color:"var(--text-muted)"}}>
                <p style={{fontSize:"28px",marginBottom:"8px"}}>✅</p>
                <p style={{fontSize:"13px"}}>No pending approvals</p>
              </div>
            ) : pendingTasks.map(t=>(
              <div key={t.id} style={{
                padding:"12px 14px",borderRadius:"10px",
                border:"1px solid rgba(245,158,11,0.2)",
                background:"rgba(245,158,11,0.04)"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                  <span style={{fontSize:"18px"}}>{TYPE_ICONS[t.type]??""}</span>
                  <p style={{fontWeight:700,fontSize:"13px",color:"var(--text-primary)",flex:1}}>{t.title}</p>
                </div>
                {t.fileUrl&&(
                  <div style={{marginBottom:"10px"}}>
                    <img src={t.fileUrl} alt={t.title} style={{width:"100%",maxHeight:"260px",objectFit:"cover",borderRadius:"10px",border:"1px solid var(--border)"}}/>
                    <a href={t.fileUrl} target="_blank" rel="noopener"
                      className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"12px",marginTop:"8px",display:"inline-flex"}}>
                      📎 View original
                    </a>
                  </div>
                )}
                <div style={{display:"flex",gap:"6px"}}>
                  <form action={portalAction} style={{flex:1}}><input type="hidden" name="action" value="task_review"/><input type="hidden" name="taskId" value={t.id}/><input type="hidden" name="decision" value="APPROVED"/><button style={{
                    flex:1,padding:"8px",borderRadius:"7px",
                    background:"var(--green)",color:"#fff",border:"none",
                    fontSize:"12px",fontWeight:700,cursor:"pointer",
                    textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",
                    width:"100%"
                  }}>✓ Approve</button></form>
                  <form action={portalAction} style={{flex:1}}><input type="hidden" name="action" value="task_review"/><input type="hidden" name="taskId" value={t.id}/><input type="hidden" name="decision" value="REVISION"/><button style={{
                    flex:1,padding:"8px",borderRadius:"7px",
                    background:"var(--red-bg)",color:"var(--red)",border:"1px solid rgba(239,68,68,0.2)",
                    fontSize:"12px",fontWeight:700,cursor:"pointer",
                    textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px",
                    width:"100%"
                  }}>↩ Revise</button></form>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="card" style={{borderTop:"3px solid var(--vivit-blue)"}}>
          <div className="card-header">
            <p className="card-title">📅 Upcoming Posts</p>
          </div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {upcoming.length===0 ? (
              <div style={{textAlign:"center",padding:"24px",color:"var(--text-muted)"}}>
                <p style={{fontSize:"28px",marginBottom:"8px"}}>📭</p>
                <p style={{fontSize:"13px"}}>No upcoming posts scheduled</p>
              </div>
            ) : upcoming.map(ev=>(
              <div key={ev.id} style={{
                display:"flex",alignItems:"center",gap:"10px",
                padding:"10px 12px",borderRadius:"8px",
                background:"var(--bg-tertiary)",border:"1px solid var(--card-border)"
              }}>
                <div style={{
                  width:"40px",height:"40px",borderRadius:"8px",
                  background:"var(--vivit-gradient)",color:"#fff",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  flexShrink:0
                }}>
                  <span style={{fontSize:"11px",fontWeight:800}}>{new Date(ev.date).getDate()}</span>
                  <span style={{fontSize:"9px",opacity:0.8}}>{new Date(ev.date).toLocaleDateString("en",{month:"short"})}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,fontSize:"13px",color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</p>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>
                    {PLATFORM_ICONS[ev.platform??""]??""} {ev.platform?.charAt(0).toUpperCase()+(ev.platform?.slice(1)??"")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NPS + Message AM */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
        <div className="card">
          <div className="card-header"><p className="card-title">⭐ Rate Your Experience</p></div>
          <div className="card-body">
            <p style={{fontSize:"13px",color:"var(--text-secondary)",marginBottom:"16px"}}>How likely are you to recommend us? (0=Not at all, 10=Definitely)</p>
            <form action={portalAction}><input type="hidden" name="action" value="nps"/><div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
              {Array.from({length:11},(_,i)=>(
                <button key={i} type="submit" name="score" value={i} aria-label={`Rate ${i} out of 10`} style={{
                  width:"36px",height:"36px",borderRadius:"8px",
                  border:"1.5px solid var(--card-border)",background:"var(--bg-tertiary)",
                  fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  color:i>=9?"var(--green)":i>=7?"var(--amber)":"var(--red)",
                  transition:"all 0.15s"
                }}>{i}</button>
              ))}
            </div><input name="comment" className="form-input" placeholder="Optional comment" maxLength={500}/></form>
            {recentNPS[0]&&<p style={{fontSize:"12px",color:"var(--text-muted)"}}>Last rating: {recentNPS[0].score}/10 — {recentNPS[0].comment}</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><p className="card-title">💬 Message Your AM</p></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <form action={portalAction} style={{display:"grid",gap:12}}><input type="hidden" name="action" value="message"/><textarea name="message" required rows={3} placeholder="Hi! I wanted to ask about..." className="form-input" style={{resize:"none",fontFamily:"inherit"}}/><button className="btn btn-primary w-full">Send Message →</button></form>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              <p style={{fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Quick WhatsApp Templates</p>
              {["📊 Request monthly report","✅ Approve all pending","💰 Invoice inquiry","🎯 Campaign update"].map(t=>(
                <form action={portalAction} key={t}><input type="hidden" name="action" value="message"/><input type="hidden" name="message" value={t}/><button style={{
                  padding:"8px 12px",borderRadius:"7px",
                  border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",
                  fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",
                  cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s",
                  width:"100%"
                }}>{t}</button></form>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
