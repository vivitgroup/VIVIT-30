import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/permissions";
import { Role } from "@/lib/types";
import "./apps.css";

const apps = [
  {title:"Dashboard",desc:"Agency command center & performance",icon:"🏠",href:"/dashboard",tone:"#875A7B"},
  {title:"Clients",desc:"Accounts, health, retainers & portal",icon:"🏢",href:"/dashboard/clients",tone:"#244D87"},
  {title:"Sales CRM",desc:"All leads, pipeline, proposals & wins",icon:"🎯",href:"/dashboard/sales",tone:"#C52A31"},
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

  return <main className="apps-launcher">
    <div className="apps-orb apps-orb-a"/><div className="apps-orb apps-orb-b"/>
    <header className="apps-topbar">
      <div className="apps-brand"><Image src="/vivit-logo.png" alt="VIVIT" width={112} height={50} priority/><span/><strong>Marketing ERP</strong></div>
      <div className="apps-user"><span>Welcome, <b>{name}</b></span><Link href="/signout">Sign Out</Link></div>
    </header>
    <section className="apps-stage">
      <div className="apps-intro"><p>VIVIT Workspace</p><h1>Choose where you want to work</h1><span>One screen. Every department. Open any workspace directly.</span></div>
      <div className="apps-grid">
        {apps.map((app,index)=><Link key={app.title} href={app.href} className="app-tile" style={{"--tone":app.tone,"--delay":`${index*55}ms`} as React.CSSProperties}>
          <div className="app-icon-3d"><span>{app.icon}</span></div>
          <div className="app-copy"><h2>{app.title}</h2><p>{app.desc}</p></div>
          <i className="app-arrow">↗</i>
        </Link>)}
      </div>
    </section>
  </main>;
}
