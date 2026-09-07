import Link from "next/link";
import {db,sql} from "@/lib/db";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
type MarketingCounts={clients:number|string;tasks:number|string;campaigns:number|string;leads:number|string};
type GroupCounts={properties:number|string;channels:number|string;calendar:number|string;owners:number|string;projects:number|string;tech_clients:number|string;tickets:number|string;opportunities:number|string;approvals:number|string;exceptions:number|string;decisions:number|string;actions:number|string};
const num=(value:number|string|undefined)=>Number(value||0);

export default async function GroupOverview(){
  await requireGroupSuperAdmin();
  const vsql=getVGroupSql();
  const [marketingRows,groupRows]=await Promise.all([
    db.execute<MarketingCounts>(sql`select
      (select count(*)::int from clients where is_active=true) clients,
      (select count(*)::int from creative_tasks where archived_at is null and deleted_at is null) tasks,
      (select count(*)::int from ad_campaigns where archived_at is null) campaigns,
      (select count(*)::int from sales_leads where archived_at is null) leads`),
    vsql<GroupCounts[]>`select
      (select count(*)::int from hospitality.properties) properties,
      (select count(*)::int from hospitality.channel_connections where lower(coalesce(status,''))='connected') channels,
      (select count(*)::int from hospitality.calendar_blocks) calendar,
      (select count(*)::int from hospitality.owners) owners,
      (select count(*)::int from tech.projects) projects,
      (select count(*)::int from tech.clients) tech_clients,
      (select count(*)::int from tech.support_tickets) tickets,
      (select count(*)::int from tech.sales_opportunities) opportunities,
      (select count(*)::int from vgroup.approval_requests where lower(status)='pending') approvals,
      (select count(*)::int from vgroup.operational_exceptions where lower(status)<>'resolved') exceptions,
      (select count(*)::int from vgroup.board_decisions) decisions,
      (select count(*)::int from vgroup.board_action_items where status not in ('DONE','CANCELLED')) actions`
  ]);
  const m=Array.from(marketingRows)[0],g=groupRows[0];
  const marketing={clients:num(m?.clients),tasks:num(m?.tasks),campaigns:num(m?.campaigns),leads:num(m?.leads)};
  const hospitality={properties:num(g?.properties),channels:num(g?.channels),calendar:num(g?.calendar),owners:num(g?.owners)};
  const tech={projects:num(g?.projects),clients:num(g?.tech_clients),tickets:num(g?.tickets),opportunities:num(g?.opportunities)};
  const group={approvals:num(g?.approvals),exceptions:num(g?.exceptions),decisions:num(g?.decisions),actions:num(g?.actions)};
  const card={padding:22,borderRadius:24,border:"1px solid #d9dee8",background:"#ffffff",color:"#111827",boxShadow:"0 14px 36px rgba(31,41,55,.07)",minWidth:0};
  const metric=(label:string,v:number)=><div style={{padding:"14px 0",borderBottom:"1px solid #eef1f5"}}><span style={{color:"#667085",fontSize:12,fontWeight:700}}>{label}</span><strong style={{display:"block",fontSize:30,marginTop:3,color:"#111827"}}>{v.toLocaleString("en-EG")}</strong></div>;

  return <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#f8fafc,#ffffff)",color:"#111827",padding:"clamp(18px,4vw,30px) clamp(14px,3vw,22px)",fontFamily:"Inter,system-ui,sans-serif",overflowX:"hidden"}}><section style={{maxWidth:1380,margin:"0 auto",minWidth:0}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:18,flexWrap:"wrap"}}><div style={{minWidth:0}}><Link href="/group" style={{color:"#315c91",textDecoration:"none",fontWeight:850}}>← Group selector</Link><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#315c91",marginTop:28}}>VIVIT GROUP · LIVE OPERATING OVERVIEW</div><h1 style={{fontSize:"clamp(34px,5vw,66px)",letterSpacing:"-.05em",margin:"8px 0",overflowWrap:"anywhere"}}>Real data. One group view.</h1><p style={{maxWidth:850,color:"#5f6b7a",lineHeight:1.7}}>This page reads each operating system directly. Marketing metrics come from the live Marketing ERP database; Hospitality and Technology come from the Group database.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href="/group/command-center" style={{padding:"11px 15px",borderRadius:999,border:"1px solid #d5dae3",color:"#26364a",background:"#fff",textDecoration:"none",fontWeight:800}}>Board control</Link><Link href="/group/finance" style={{padding:"11px 15px",borderRadius:999,border:"1px solid #d5dae3",color:"#26364a",background:"#fff",textDecoration:"none",fontWeight:800}}>Group finance</Link></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))",gap:15,marginTop:30,minWidth:0}}>
      <article style={{...card,borderTop:"4px solid #df4b4b"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><small style={{letterSpacing:".14em",color:"#b52d2d",fontWeight:900}}>MARKETING · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Marketing</h2></div><Link href="/login?workspace=marketing" style={{color:"#b52d2d",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Active clients",marketing.clients)}{metric("Creative tasks",marketing.tasks)}{metric("Campaigns",marketing.campaigns)}{metric("Sales leads",marketing.leads)}</article>
      <article style={{...card,borderTop:"4px solid #c49a42"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><small style={{letterSpacing:".14em",color:"#8a6a22",fontWeight:900}}>HOSPITALITY · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Hospitality</h2></div><Link href="/group/hospitality" style={{color:"#8a6a22",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Properties",hospitality.properties)}{metric("Connected Airbnb feeds",hospitality.channels)}{metric("Calendar blocks",hospitality.calendar)}{metric("Owners",hospitality.owners)}</article>
      <article style={{...card,borderTop:"4px solid #3196d8"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><small style={{letterSpacing:".14em",color:"#236d9e",fontWeight:900}}>TECHNOLOGY · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Vivit Technology</h2></div><Link href="/group/tech" style={{color:"#236d9e",textDecoration:"none",fontWeight:900}}>Open ↗</Link></div>{metric("Projects",tech.projects)}{metric("Clients",tech.clients)}{metric("Support tickets",tech.tickets)}{metric("Sales opportunities",tech.opportunities)}</article>
      <article style={{...card,borderTop:"4px solid #8c72d8"}}><div><small style={{letterSpacing:".14em",color:"#6950ac",fontWeight:900}}>GROUP GOVERNANCE · LIVE</small><h2 style={{margin:"7px 0 0",fontSize:27}}>Board & Governance</h2></div>{metric("Pending approvals",group.approvals)}{metric("Open exceptions",group.exceptions)}{metric("Board decisions",group.decisions)}{metric("Open board actions",group.actions)}</article>
    </div>
  </section></main>;
}