export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { Role } from "@/lib/types";
type SessionUser={role?:Role|string;id?:string;workspaceId?:string};

export default async function MonthlyReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sessionUser=session.user as unknown as SessionUser;
  const role=sessionUser.role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");
  const workspaceId=String(sessionUser.workspaceId||"");
  if(!workspaceId) redirect("/login?reason=workspace_missing");

  const userId=String(sessionUser.id||"");
  const allClients = await db.select({ id:clients.id, companyName:clients.companyName, isActive:clients.isActive })
    .from(clients).where(role === Role.ACCOUNT_MANAGER
      ? and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true), eq(clients.accountManagerId, userId))
      : and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true))).orderBy(clients.companyName);

  const now = new Date();
  const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];


  async function sendAllReports() {
    "use server";
    const {auth:getAuth}=await import("@/lib/auth");
    const {db,clients,contacts,financeRecords,mediaMetrics,auditLogs}=await import("@/lib/db");
    const {eq,and,gte,sum,sql}=await import("drizzle-orm");
    const MONTHS=["","January","February","March","April","May","June","July","August","September","October","November","December"];
    const current=await getAuth();
    const currentUser=current?.user as unknown as SessionUser|undefined;
    const currentRole=currentUser?.role as Role|undefined;
    if(!current?.user||![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(currentRole!))throw new Error("Unauthorized");
    const now2=new Date();
    const pMonth=now2.getMonth()===0?12:now2.getMonth();
    const pYear=now2.getMonth()===0?now2.getFullYear()-1:now2.getFullYear();
    const currentUserId=String(currentUser?.id||""),currentWorkspaceId=String(currentUser?.workspaceId||"");
    if(!currentUserId||!currentWorkspaceId)throw new Error("Workspace unavailable");
    const allC=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(currentRole===Role.ACCOUNT_MANAGER
      ? and(eq(clients.workspaceId,currentWorkspaceId),eq(clients.isActive,true),eq(clients.accountManagerId,currentUserId))
      : and(eq(clients.workspaceId,currentWorkspaceId),eq(clients.isActive,true)));
    for(const c of allC){
      const [contact]=await db.select().from(contacts).where(and(eq(contacts.clientId,c.id),eq(contacts.isPrimary,true)));
      if(!contact?.email) continue;
      const monthStart2=new Date(pYear,pMonth-1,1);
      const [inv]=await db.select().from(financeRecords).where(and(eq(financeRecords.workspaceId,currentWorkspaceId),eq(financeRecords.clientId,c.id),eq(financeRecords.month,pMonth),eq(financeRecords.year,pYear)));
      const [mAgg]=await db.select({spend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),rev:sum(mediaMetrics.revenue)}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,currentWorkspaceId),eq(mediaMetrics.clientId,c.id),gte(mediaMetrics.date,monthStart2)));
      const spend=Number(mAgg?.spend??0);const leads=Number(mAgg?.leads??0);const rev=Number(mAgg?.rev??0);
      if(process.env.RESEND_API_KEY){
        const deliveryEntityId=`${c.id}:${pYear}-${String(pMonth).padStart(2,"0")}`,deliveryKey=`monthly-report/${currentWorkspaceId}/${deliveryEntityId}`;
        const alreadySent=await db.transaction(async tx=>{await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${deliveryKey}))`);const [existingDelivery]=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.workspaceId,currentWorkspaceId),eq(auditLogs.action,"monthly_report_emailed"),eq(auditLogs.entityId,deliveryEntityId))).limit(1);return Boolean(existingDelivery)});
        if(alreadySent)continue;
        const emailRes=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Idempotency-Key":deliveryKey},body:JSON.stringify({
          from:process.env.EMAIL_FROM??"noreply@vivitcrm.com",to:[contact.email],
          subject:`📊 ${c.companyName} — ${MONTHS[pMonth]} ${pYear} Performance Report`,
          html:`<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px"><div style="background:linear-gradient(135deg,#17345F,#244D87);color:white;padding:24px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">📊 ${MONTHS[pMonth]} Report</h1></div><div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px"><h2>${c.companyName}</h2><table style="width:100%;border-collapse:collapse"><tr style="background:#244D87;color:white"><td style="padding:8px 12px">Metric</td><td style="padding:8px 12px">Value</td></tr><tr><td style="padding:8px 12px;border:1px solid #eee">Ad Spend</td><td style="padding:8px 12px;border:1px solid #eee">${spend.toLocaleString()} EGP</td></tr><tr style="background:#f5f5f5"><td style="padding:8px 12px;border:1px solid #eee">Leads</td><td style="padding:8px 12px;border:1px solid #eee">${leads}</td></tr><tr><td style="padding:8px 12px;border:1px solid #eee">Revenue</td><td style="padding:8px 12px;border:1px solid #eee">${rev.toLocaleString()} EGP</td></tr><tr style="background:#f5f5f5"><td style="padding:8px 12px;border:1px solid #eee">ROAS</td><td style="padding:8px 12px;border:1px solid #eee">${spend>0?(rev/spend).toFixed(2):0}×</td></tr>${inv?`<tr><td style="padding:8px 12px;border:1px solid #eee">Invoice</td><td style="padding:8px 12px;border:1px solid #eee">${inv.totalRevenue.toLocaleString()} EGP — ${inv.invoiceStatus}</td></tr>`:"" }</table><a href="${process.env.NEXTAUTH_URL??""}/dashboard/portal" style="background:#244D87;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Full Report →</a></div><p style="color:#999;font-size:12px;margin-top:16px;text-align:center">VIVIT GROUP</p></div>`,
        })});
        if(!emailRes.ok)throw new Error(`Monthly report email failed for ${c.id}`);
        await db.transaction(async tx=>{await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${deliveryKey}))`);const [existingDelivery]=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.workspaceId,currentWorkspaceId),eq(auditLogs.action,"monthly_report_emailed"),eq(auditLogs.entityId,deliveryEntityId))).limit(1);if(!existingDelivery)await tx.insert(auditLogs).values({workspaceId:currentWorkspaceId,userId:currentUserId,action:"monthly_report_emailed",entity:"client_monthly_report",entityId:deliveryEntityId,newValues:JSON.stringify({clientId:c.id,month:pMonth,year:pYear,recipient:contact.email,idempotencyKey:deliveryKey})})});
      }
    }
    const {revalidatePath}=await import("next/cache");
    revalidatePath("/dashboard/monthly-reports");
  }

  return (
    <div className="max-w-4xl space-y-5 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">📋 Monthly Client Reports</h1>
          <p className="text-sm text-[#6B8FAF] mt-1">Generate, preview, and auto-send monthly performance summaries</p>
        </div>
        <form action={sendAllReports}>
          <button type="submit" className="text-xs px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors font-semibold">
            {role===Role.ACCOUNT_MANAGER?"📧 Send Assigned Reports":"📧 Auto-Send All Reports"}
          </button>
        </form>
      </div>

      {/* Generator */}
      <div id="report-builder" className="card-vivit space-y-4">
        <h2 className="font-semibold text-[#244D87] text-sm uppercase tracking-wider">Generate Report</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Client</label>
            <select id="rep-client" className="form-input">
              {allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Month</label>
            <select id="rep-month" className="form-input" defaultValue={now.getMonth()+1}>
              {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Year</label>
            <select id="rep-year" className="form-input" defaultValue={now.getFullYear()}>
              {[now.getFullYear()-1,now.getFullYear()].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button id="gen-btn" className="btn btn-primary">📊 Generate Report →</button>
          <a id="pdf-link" href="/dashboard/monthly-reports" target="_blank" rel="noopener noreferrer" style={{display:"none"}}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-[#244D87]/25 text-[#244D87] font-semibold hover:bg-[#244D87]/10 transition-colors">
            🖨️ Open PDF Report
          </a>
        </div>
      </div>

      {/* Loading */}
      <div id="rep-loading" style={{display:"none"}} className="card-vivit text-center py-8">
        <p className="text-[#6B8FAF]">⏳ Generating report…</p>
      </div>

      {/* Report output */}
      <div id="rep-output" style={{display:"none",flexDirection:"column",gap:"20px"}}>
        {/* KPIs */}
        <div id="rep-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4" />

        {/* WhatsApp text */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#244D87] text-sm uppercase tracking-wider">📱 WhatsApp / Email Summary</h2>
            <button id="copy-btn" className="text-xs px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">📋 Copy</button>
          </div>
          <pre id="rep-wa" className="text-sm text-[#E8F4FD] whitespace-pre-wrap font-mono leading-relaxed p-4 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto" />
        </div>

        {/* Platform breakdown */}
        <div id="rep-platforms" className="card" style={{display:"none"}}>
          <h2 className="font-semibold text-[#244D87] text-sm uppercase tracking-wider mb-4">📣 Platform Breakdown</h2>
          <div id="platform-table" />
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html:`
        function fmt(n) {
          return new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(n||0);
        }

        document.getElementById('gen-btn').addEventListener('click', async () => {
          const clientId = document.getElementById('rep-client').value;
          const month    = document.getElementById('rep-month').value;
          const year     = document.getElementById('rep-year').value;
          if (!clientId) return alert('Select a client');

          document.getElementById('rep-loading').style.display='block';
          // Update PDF link
          const clientId2 = document.getElementById('rep-client').value;
          const month2 = document.getElementById('rep-month').value;
          const year2 = document.getElementById('rep-year').value;
          const pdfLink = document.getElementById('pdf-link');
          pdfLink.href = '/api/pdf-report/' + clientId2 + '?month=' + month2 + '&year=' + year2;
          pdfLink.style.display = 'inline-flex';
          document.getElementById('rep-output').style.display='none';

          const res = await fetch('/api/monthly-summary/'+clientId+'?month='+month+'&year='+year);
          const data = await res.json();
          if(!res.ok){document.getElementById('rep-loading').style.display='none';pdfLink.style.display='none';return alert(data.error||'Report could not be generated');}

          document.getElementById('rep-loading').style.display='none';
          document.getElementById('rep-output').style.display='block';

          // KPIs
          const kpis = [
            {l:'Ad Spend',   v:fmt(data.media?.spend),   c:'#244D87'},
            {l:'Leads',      v:data.media?.leads||0,     c:'#8b5cf6'},
            {l:'ROAS',       v:(data.media?.roas||0)+'x',c:data.media?.roas>=2?'#10b981':'#f59e0b'},
            {l:'Revenue',    v:fmt(data.media?.rev),     c:'#10b981'},
          ];
          document.getElementById('rep-kpis').innerHTML = kpis.map(k=>
            '<div class="card-vivit"><p class="text-xl font-bold" style="color:'+k.c+'">'+k.v+'</p><p class="text-xs text-slate-400 mt-1">'+k.l+'</p></div>'
          ).join('');

          // WhatsApp text
          document.getElementById('rep-wa').textContent = data.whatsappText||'No data available for this period.';

          // Platform breakdown
          if(data.media?.byPlatform && Object.keys(data.media.byPlatform).length>0) {
            document.getElementById('rep-platforms').style.display='block';
            document.getElementById('platform-table').innerHTML =
              '<table style="width:100%"><thead><tr><th style="text-align:left;padding:8px;font-size:11px;color:#6B8FAF">Platform</th><th style="text-align:right;padding:8px;font-size:11px;color:#6B8FAF">Spend</th><th style="text-align:right;padding:8px;font-size:11px;color:#6B8FAF">Leads</th><th style="text-align:right;padding:8px;font-size:11px;color:#6B8FAF">Revenue</th></tr></thead><tbody>' +
              Object.entries(data.media.byPlatform).map(([p,d])=>
                '<tr style="border-top:1px solid rgba(255,255,255,0.05)"><td style="padding:10px 8px;font-weight:600;text-transform:capitalize">'+p+'</td><td style="padding:10px 8px;text-align:right">'+fmt(d.spend)+'</td><td style="padding:10px 8px;text-align:right">'+d.leads+'</td><td style="padding:10px 8px;text-align:right;color:#10b981">'+fmt(d.revenue)+'</td></tr>'
              ).join('') + '</tbody></table>';
          }
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
          const text = document.getElementById('rep-wa').textContent;
          navigator.clipboard.writeText(text).then(()=>{
            const btn = document.getElementById('copy-btn');
            btn.textContent = '✅ Copied!';
            setTimeout(()=>btn.textContent='📋 Copy',2000);
          });
        });
      `}} />

      {/* ═══ FEATURE 19: Email Marketing Module ═══ */}
      <div className="card" style={{border:"1px solid rgba(0,180,216,0.2)"}}>
        <h2 className="font-semibold text-[#00B4D8] mb-1">📧 Email Marketing Campaigns</h2>
        <p className="text-xs text-muted mb-4">Send nurturing campaigns to leads and update clients at scale</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            {name:"Monthly Newsletter",     target:"All Clients",status:"Scheduled", date:"1st of month", opens:"78%",  clicks:"34%", color:"#10b981"},
            {name:"Lead Nurture — Intro",   target:"New Leads",  status:"Active",    date:"Day 1 of lead",opens:"52%",  clicks:"18%", color:"#244D87"},
            {name:"Win-Back Campaign",      target:"Lost Leads", status:"Draft",     date:"Manual send",  opens:"—",    clicks:"—",   color:"#6b7280"},
            {name:"Upsell — Budget Boost",  target:"High ROAS",  status:"Active",    date:"When ROAS>4×", opens:"61%",  clicks:"29%", color:"#f59e0b"},
          ].map(c=>(
            <div key={c.name} className="p-3 rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">{c.name}</p>
                <span className={`badge text-[9px] font-bold ${c.status==="Active"?"badge-success":c.status==="Scheduled"?"badge-info":"badge-muted"}`}>{c.status}</span>
              </div>
              <p className="text-[11px] text-muted mb-2">📋 {c.target} · 📅 {c.date}</p>
              <div className="grid grid-cols-2 gap-1">
                <div className="text-center p-1.5 rounded bg-white/[0.03]"><p className="text-sm font-bold" style={{color:c.color}}>{c.opens}</p><p className="text-[9px] text-muted">Opens</p></div>
                <div className="text-center p-1.5 rounded bg-white/[0.03]"><p className="text-sm font-bold" style={{color:c.color}}>{c.clicks}</p><p className="text-[9px] text-muted">Clicks</p></div>
              </div>
            </div>
          ))}
        </div>
        <details>
          <summary className="text-xs text-[#00B4D8] cursor-pointer font-semibold">+ Create New Campaign</summary>
          <form action={async(fd:FormData)=>{
            "use server";
            const {auth:getAuth}=await import("@/lib/auth");
            const {db,emailCampaigns}=await import("@/lib/db");
            const current=await getAuth();
            const currentUser=current?.user as unknown as SessionUser|undefined;
            const currentRole=currentUser?.role as Role|undefined;
            if(!current?.user||![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(currentRole!))throw new Error("Unauthorized");
            await db.insert(emailCampaigns).values({
              name:fd.get("name") as string,
              subject:fd.get("subject") as string,
              body:fd.get("body") as string,
              targetList:fd.get("targetList") as string||"leads",
              status:"DRAFT",
            });
            const {revalidatePath}=await import("next/cache");
            revalidatePath("/dashboard/monthly-reports");
          }} className="grid grid-cols-2 gap-3 mt-3">
            <div><label className="erp-label">Campaign Name *</label><input name="name" required placeholder="June Newsletter" className="form-input"/></div>
            <div><label className="erp-label">Target List</label>
              <select name="targetList" className="form-input">
                {["leads","clients","all"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select></div>
            <div className="md:col-span-2"><label className="erp-label">Subject Line *</label><input name="subject" required placeholder="Your June Performance Report is Ready 📊" className="form-input"/></div>
            <div className="md:col-span-2"><label className="erp-label">Email Body *</label><textarea name="body" required rows={4} placeholder="Hi {{name}},&#10;&#10;Your campaign performed..." className="vivit-input resize-none w-full"/></div>
            <div className="md:col-span-2"><button type="submit" className="btn btn-primary">Save Campaign Draft</button></div>
          </form>
        </details>
      </div>


      {/* ═══ Feature 30: QBR Generator ═══ */}
      <div className="card" style={{border:"1px solid rgba(124,58,237,0.2)"}}>
        <h2 className="font-semibold text-purple-400 text-sm mb-3">📊 Quarterly Business Review (QBR) Generator</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[
            {section:"Executive Summary",   icon:"📋", content:"Q2 2025 performance overview · Key wins · Areas for improvement"},
            {section:"Campaign Performance", icon:"📣", content:"Platform-by-platform ROAS · Budget utilization · Lead targets vs actual"},
            {section:"Creative Highlights",  icon:"🎨", content:"Top 3 performing posts · Engagement rates · Content themes that worked"},
            {section:"Financial Review",     icon:"💰", content:"Revenue vs target · Collection rate · Q3 budget recommendation"},
            {section:"Competitive Analysis", icon:"🏆", content:"Industry benchmarks · Your position · Market opportunities"},
            {section:"Q3 Strategy",          icon:"🚀", content:"Recommended campaigns · Budget allocation · Growth targets"},
          ].map(s=>(
            <div key={s.section} className="flex gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-semibold">{s.section}</p>
                <p className="text-[10px] text-muted mt-0.5">{s.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3"><a href="#report-builder" className="btn-grad text-xs" style={{textDecoration:"none"}}>Choose client & generate report ↑</a><span className="text-xs text-muted self-center">Uses the selected client and reporting period.</span></div>
      </div>

    </div>
  );
}
