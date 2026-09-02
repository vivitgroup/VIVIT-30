import Link from "next/link";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getTechDashboard} from "@/lib/vgroup/dashboard";

const modules=[
  ["Projects","Phases, scope, checklist, milestones, risks and progress","/group/tech/projects"],
  ["Client Portal","Timeline, updates, files, scope and payments","/group/tech/client-portal"],
  ["Billing","Installments, paid/remaining and overdue controls","/group/tech/billing"],
  ["Change Requests","Submit → price → approve/reject → implement","/group/tech/change-requests"],
  ["Time ↔ Price","Duration options, compression and replanning","/group/tech/time-price"],
  ["SaaS","Plans, subscriptions, recurring billing, SLA and tenant isolation","/group/tech/saas"],
];
const money=(value:number)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(value);

export const dynamic="force-dynamic";
export default async function TechHome(){
  await requireBusinessUnitAccess("tech");
  const data=await getTechDashboard();
  const kpis=[
    ["Clients",data.clients],["Projects",data.projects],["Active projects",data.activeProjects],["Open CRs",data.openChangeRequests],
    ["Due installments",data.outstandingInstallments],["Subscriptions",data.subscriptions],["Active SaaS",data.activeSubscriptions],["Revenue",money(data.revenue)],
  ];
  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 80% 0%,rgba(46,168,255,.18),transparent 30%),#070b12",color:"#eef7ff",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group" style={{color:"#52baff",textDecoration:"none",fontWeight:800}}>← Vivit Group</Link><div style={{margin:"42px 0 26px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#42adf5"}}>VIVIT TECHNOLOGY</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"10px 0"}}>Client Delivery OS</h1><p style={{color:"#9eb3c8",maxWidth:740,lineHeight:1.7}}>Project delivery, commercial control, transparent client collaboration and SaaS operations in one isolated technology workspace.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:28}}>{kpis.map(([label,value])=><article key={String(label)} style={{padding:18,borderRadius:18,border:"1px solid #193650",background:"rgba(46,168,255,.08)"}}><div style={{fontSize:11,color:"#87a9c2",fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}}>{label}</div><strong style={{display:"block",fontSize:25,marginTop:8}}>{value}</strong></article>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>{modules.map(([name,desc,href])=><Link href={href} key={name} style={{textDecoration:"none",color:"inherit"}}><article style={{padding:24,minHeight:170,borderRadius:24,border:"1px solid #193650",background:"linear-gradient(160deg,rgba(46,168,255,.12),rgba(255,255,255,.025))"}}><h2 style={{fontSize:22,margin:"0 0 10px"}}>{name}</h2><p style={{color:"#99aec2",lineHeight:1.6,margin:0}}>{desc}</p></article></Link>)}</div></section></main>}
