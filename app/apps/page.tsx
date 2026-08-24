import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/permissions";
import { Role } from "@/lib/types";

const apps = [
  {title:"Dashboard",desc:"Agency command center & performance",icon:"🏠",href:"/dashboard",tone:"#875A7B"},
  {title:"Clients",desc:"Accounts, health, retainers & portal",icon:"🏢",href:"/dashboard/clients",tone:"#244D87"},
  {title:"Sales CRM",desc:"Leads, pipeline, proposals & wins",icon:"🎯",href:"/dashboard/sales",tone:"#C52A31"},
  {title:"Online Aman",desc:"Online sales workspace",icon:"▤",href:"/dashboard/sales/aman",tone:"#7C3AED"},
  {title:"WhatsApp",desc:"Customer conversations & follow-ups",icon:"💬",href:"/dashboard/whatsapp",tone:"#0D9466"},
  {title:"Media Control",desc:"Campaigns, budgets, ROAS & buying",icon:"📣",href:"/dashboard/media/control-center",tone:"#D97706"},
  {title:"Platform Sync",desc:"Meta, TikTok, Google & integrations",icon:"🔄",href:"/dashboard/media/sync",tone:"#0891B2"},
  {title:"Creative",desc:"Briefs, production, review & approval",icon:"🎨",href:"/dashboard/creative",tone:"#DB2777"},
  {title:"Tasks Inbox",desc:"Work queue, ownership & deadlines",icon:"📥",href:"/dashboard/tasks-inbox",tone:"#4F46E5"},
  {title:"Calendar",desc:"Content schedule & delivery planning",icon:"🗓️",href:"/dashboard/calendar",tone:"#2563EB"},
  {title:"Finance",desc:"Revenue, invoices, expenses & payroll",icon:"💰",href:"/dashboard/finance",tone:"#15803D"},
  {title:"Analytics",desc:"Reports, KPIs & agency intelligence",icon:"📊",href:"/dashboard/analytics",tone:"#9333EA"},
];

export default async function AppsPage(){
  const session=await auth();
  if(!session?.user) redirect("/login");
  const role=((session.user as any).role??Role.CLIENT) as Role;
  if(role!==Role.SUPER_ADMIN) redirect(homeFor(role));
  const name=session.user.name??session.user.email??"User";
  return <main style={{minHeight:"100vh",background:"linear-gradient(145deg,#f7f5f2 0%,#f4f4f6 55%,#eee8ed 100%)",color:"#27272a",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
    <header style={{height:72,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 clamp(20px,4vw,56px)",background:"rgba(255,255,255,.94)",borderBottom:"1px solid #dedee3"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><Image src="/vivit-logo.png" alt="VIVIT" width={112} height={50} style={{objectFit:"contain"}} priority/><span style={{height:28,width:1,background:"#dedee3"}}/><strong style={{fontSize:14}}>Marketing ERP</strong></div>
      <div style={{display:"flex",alignItems:"center",gap:12,fontSize:13}}><span style={{color:"#71717a"}}>Welcome, <b style={{color:"#27272a"}}>{name}</b></span><Link href="/signout" style={{padding:"9px 13px",border:"1px solid #dedee3",borderRadius:7,textDecoration:"none",color:"#3f3f46",fontWeight:700,background:"#fff"}}>Sign Out</Link></div>
    </header>
    <section style={{width:"min(1380px,100%)",margin:"0 auto",padding:"clamp(34px,5vw,64px) clamp(18px,4vw,48px) 70px"}}>
      <div style={{marginBottom:30}}><p style={{fontSize:11,fontWeight:800,letterSpacing:".13em",color:"#875A7B",textTransform:"uppercase"}}>VIVIT Workspace</p><h1 style={{fontSize:"clamp(30px,4vw,46px)",lineHeight:1.05,letterSpacing:"-.04em",margin:"7px 0 9px"}}>Choose where you want to work</h1><p style={{fontSize:14,color:"#71717a"}}>One screen. Every department. Open any workspace directly.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>{apps.map(app=><Link key={app.title} href={app.href} style={{minHeight:155,padding:20,border:"1px solid #dedee3",borderRadius:12,background:"rgba(255,255,255,.96)",textDecoration:"none",color:"inherit",boxShadow:"0 2px 8px rgba(20,20,24,.035)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}><div style={{width:48,height:48,borderRadius:12,display:"grid",placeItems:"center",fontSize:23,background:`${app.tone}14`,border:`1px solid ${app.tone}28`}}>{app.icon}</div><div><h2 style={{fontSize:16,marginBottom:4}}>{app.title}</h2><p style={{fontSize:12.5,lineHeight:1.5,color:"#71717a"}}>{app.desc}</p></div></Link>)}</div>
    </section>
  </main>;
}
