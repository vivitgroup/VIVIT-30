"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const byRole:Record<string,{icon:string;label:string;href:string}[]>={
 SUPER_ADMIN:[{icon:"🏠",label:"Home",href:"/dashboard"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"🎯",label:"Sales",href:"/dashboard/sales"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 ACCOUNT_MANAGER:[{icon:"🏠",label:"Home",href:"/dashboard"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"🎨",label:"Tasks",href:"/dashboard/creative"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 MEDIA_BUYER:[{icon:"📣",label:"Media",href:"/dashboard/media/control-center"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"📊",label:"Reports",href:"/dashboard/reports"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 CREATOR:[{icon:"🎨",label:"Tasks",href:"/dashboard/creative"},{icon:"📅",label:"Calendar",href:"/dashboard/calendar"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 ACCOUNTANT:[{icon:"💰",label:"Finance",href:"/dashboard/finance"},{icon:"🏢",label:"Clients",href:"/dashboard/clients"},{icon:"📋",label:"Contracts",href:"/dashboard/contracts"},{icon:"📈",label:"Reports",href:"/dashboard/reports"},{icon:"📁",label:"Files",href:"/dashboard/files"}],
 SALES:[{icon:"🎯",label:"Pipeline",href:"/dashboard/sales"},{icon:"🧾",label:"Aman",href:"/dashboard/sales/aman"},{icon:"📈",label:"Reports",href:"/dashboard/reports"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
 CLIENT:[{icon:"🏠",label:"Portal",href:"/dashboard/portal"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}],
};
export function MobileNav({role}:{role:string}){const path=usePathname();const items=byRole[role]||[{icon:"🏠",label:"Home",href:"/dashboard"},{icon:"📁",label:"Files",href:"/dashboard/files"},{icon:"🔔",label:"Alerts",href:"/dashboard/notifications"}];return <nav className="mobile-nav">{items.map(i=>{const active=path===i.href||(i.href!=="/dashboard"&&path.startsWith(i.href+"/"));return <Link key={i.href} href={i.href} className={active?"active":""}><span>{i.icon}</span><small>{i.label}</small></Link>})}</nav>}
