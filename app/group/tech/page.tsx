import Link from "next/link";

const modules=[
  ["Clients","External client accounts and delivery access"],
  ["Projects","Phases, scope, checklist, team and progress engine"],
  ["Client Portal","Timeline, updates, files, scope and payments"],
  ["Billing","Installments, paid/remaining and overdue controls"],
  ["Change Requests","Submit → price → approve/reject → implement"],
  ["SaaS","Plans, subscriptions, recurring billing and tenant isolation"],
];

export default function TechHome(){return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 80% 0%,rgba(46,168,255,.18),transparent 30%),#070b12",color:"#eef7ff",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group" style={{color:"#52baff",textDecoration:"none",fontWeight:800}}>← Vivit Group</Link><div style={{margin:"42px 0 34px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#42adf5"}}>VIVIT TECHNOLOGY</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"10px 0"}}>Client Delivery OS</h1><p style={{color:"#9eb3c8",maxWidth:740,lineHeight:1.7}}>Project delivery, commercial control, transparent client collaboration and SaaS operations in one isolated technology workspace.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>{modules.map(([name,desc])=><article key={name} style={{padding:24,minHeight:170,borderRadius:24,border:"1px solid #193650",background:"linear-gradient(160deg,rgba(46,168,255,.12),rgba(255,255,255,.025))"}}><h2 style={{fontSize:22,margin:"0 0 10px"}}>{name}</h2><p style={{color:"#99aec2",lineHeight:1.6,margin:0}}>{desc}</p></article>)}</div></section></main>}
