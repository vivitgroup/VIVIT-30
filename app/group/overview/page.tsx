import Link from "next/link";
import {db,sql} from "@/lib/db";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

type ScalarRow={value:number|string};
const value=(rows:ScalarRow[])=>Number(rows[0]?.value||0);

export default async function GroupOverview(){
  await requireGroupSuperAdmin();
  const vsql=getVGroupSql();
  const [
    marketingClients,marketingTasks,marketingCampaigns,marketingLeads,
    hospitalityProperties,hospitalityChannels,hospitalityCalendar,hospitalityOwners,
    techProjects,techClients,techTickets,techOpportunities,
    groupApprovals,groupExceptions,groupDecisions,groupActions
  ]=await Promise.all([
    db.execute<ScalarRow>(sql`select count(*)::int as value from clients where is_active=true`),
    db.execute<ScalarRow>(sql`select count(*)::int as value from creative_tasks where archived_at is null and deleted_at is null`),
    db.execute<ScalarRow>(sql`select count(*)::int as value from ad_campaigns where archived_at is null`),
    db.execute<ScalarRow>(sql`select count(*)::int as value from sales_leads where archived_at is null`),
    vsql<ScalarRow[]>`select count(*)::int as value from hospitality.properties`,
    vsql<ScalarRow[]>`select count(*)::int as value from hospitality.channel_connections where lower(coalesce(status,''))='connected'`,
    vsql<ScalarRow[]>`select count(*)::int as value from hospitality.calendar_blocks`,
    vsql<ScalarRow[]>`select count(*)::int as value from hospitality.owners`,
    vsql<ScalarRow[]>`select count(*)::int as value from tech.projects`,
    vsql<ScalarRow[]>`select count(*)::int as value from tech.clients`,
    vsql<ScalarRow[]>`select count(*)::int as value from tech.support_tickets`,
    vsql<ScalarRow[]>`select count(*)::int as value from tech.sales_opportunities`,
    vsql<ScalarRow[]>`select count(*)::int as value from vgroup.approval_requests where lower(status)='pending'`,
    vsql<ScalarRow[]>`select count(*)::int as value from vgroup.operational_exceptions where lower(status)<>'resolved'`,
    vsql<ScalarRow[]>`select count(*)::int as value from vgroup.board_decisions`,
    vsql<ScalarRow[]>`select count(*)::int as value from vgroup.board_action_items where status not in ('DONE','CANCELLED')`
  ]);

  const marketing={clients:value(Array.from(marketingClients)),tasks:value(Array.from(marketingTasks)),campaigns:value(Array.from(marketingCampaigns)),leads:value(Array.from(marketingLeads))};
  const hospitality={properties:value(hospitalityProperties),channels:value(hospitalityChannels),calendar:value(hospitalityCalendar),owners:value(hospitalityOwners)};
  const tech={projects:value(techProjects),clients:value(techClients),tickets:value(techTickets),opportunities:value(techOpportunities)};
  const group={approvals:value(groupApprovals),exceptions:value(groupExceptions),decisions:value(groupDecisions),actions:value(groupActions)};

  const card={padding:22,borderRadius:24,border:"1px solid #252d39",background:"linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))"};
  const metric=(label:string,v:number)=><div style={{padding:"14px 0",borderBottom:"1px solid #202733"}}><span style={{color:"#8f9bad",fontSize:12}}>{label}</span><strong style={{display:"block",fontSize:30,marginTop:3}}>{v.toLocaleString("en-EG")}</strong></div>;

  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 8% 0%,rgba(77,189,255,.12),transparent 27%),radial-gradient(circle at 92% 4%,rgba(201,154,67,.10),transparent 25%),#07090d",color:"#f7f9fc",padding:"30px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1380,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:18,flexWrap:"wrap"}}><div><Link href="/group" style={{color:"#9cc9ff",textDecoration:"none",fontWeight:850}}>← Group selector</Link><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#9cc9ff",marginTop:28}}>VIVIT GROUP · LIVE OPERATING OVERVIEW</div><h1 style={{fontSize:"clamp(38px,5vw,66px)",letterSpacing:"-.055em",margin:"8px 0"}}>Real data. One group view.</h1><p style={{maxWidth:850,color:"#a6b0bf",lineHeight:1.7}}>This page reads each operating system directly. Marketing metrics come from the live Marketing ERP database; Hospitality and Technology come from the Group database. Zero means no records exist in that operating unit, not a missing integration.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href="/group/command-center" style={{padding:"11px 15px",borderRadius:999,border:"1px solid #2d3748",color:"#dbeafe",textDecoration:"none",fontWeight:800}}>Board control</Link><Link href="/group/finance" style={{padding:"11px 15px",borderRadius:999,border:"1px solid #2d3748",color:"#dbeafe",textDecoration:"none",fontWeight:800}}>Group finance</Link></div></div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:15,marginTop:30}}>
      <article style={{...card,borderColor:"#ef444455"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><small style={{letterSpacing:".14em",color:"#ef7a7a",fontWeight:900}}>MARKETING · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Marketing</h2></div><Link href="/login?workspace=marketing" style={{color:"#ef7a7a",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Active clients",marketing.clients)}{metric("Creative tasks",marketing.tasks)}{metric("Campaigns",marketing.campaigns)}{metric("Sales leads",marketing.leads)}</article>
      <article style={{...card,borderColor:"#d6a84b55"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><small style={{letterSpacing:".14em",color:"#d6a84b",fontWeight:900}}>HOSPITALITY · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Hospitality</h2></div><Link href="/group/hospitality" style={{color:"#d6a84b",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Properties",hospitality.properties)}{metric("Connected Airbnb feeds",hospitality.channels)}{metric("Calendar blocks",hospitality.calendar)}{metric("Owners",hospitality.owners)}</article>
      <article style={{...card,borderColor:"#38bdf855"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><small style={{letterSpacing:".14em",color:"#38bdf8",fontWeight:900}}>TECHNOLOGY · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Technology</h2></div><Link href="/group/tech" style={{color:"#38bdf8",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Projects",tech.projects)}{metric("Clients",tech.clients)}{metric("Support tickets",tech.tickets)}{metric("Sales opportunities",tech.opportunities)}</article>
      <article style={{...card,borderColor:"#a78bfa55"}}><div><small style={{letterSpacing:".14em",color:"#c4b5fd",fontWeight:900}}>GROUP GOVERNANCE · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Board & Governance</h2></div>{metric("Pending approvals",group.approvals)}{metric("Open exceptions",group.exceptions)}{metric("Board decisions",group.decisions)}{metric("Open board actions",group.actions)}</article>
    </div>
  </section></main>;
}
