"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const byRole:Record<string,{icon:string;label:string;href:string}[]>={
 SUPER_ADMIN:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"🎯",label:"Sales",href:"/dashboard/sales"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 ACCOUNT_MANAGER:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"🎨",label:"Creative",href:"/dashboard/creative"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 MEDIA_BUYER:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"📣",label:"Media",href:"/dashboard/media/control-center"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 CREATOR:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"🎨",label:"Tasks",href:"/dashboard/creative"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 ACCOUNTANT:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"💰",label:"Finance",href:"/dashboard/finance"},{icon:"🧾",label:"Payments",href:"/dashboard/clients/accounts-payment"},{icon:"📈",label:"Reports",href:"/dashboard/reports"},{icon:"📁",label:"Files",href:"/dashboard/files"}],
 SALES:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"🎯",label:"Pipeline",href:"/dashboard/sales"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"💬",label:"WhatsApp",href:"/dashboard/whatsapp"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 CLIENT:[{icon:"🏠",label:"Home",href:"/apps"},{icon:"🌐",label:"Portal",href:"/dashboard/portal"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
};
export function MobileNav({role}:{role:string}){const path=usePathname(),items=byRole[role]||byRole.CLIENT,activeHref=items.filter(i=>path===i.href||(i.href!=="/dashboard"&&path.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]?.href;return <nav className="mobile-nav">{items.map(i=><Link key={i.href} href={i.href} className={activeHref===i.href?"active":""}><span>{i.icon}</span><small>{i.label}</small></Link>)}</nav>}
