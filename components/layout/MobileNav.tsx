"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item={icon:string;label:string;href:string;roles:string[]};
const SECTIONS:{label:string;items:Item[]}[]=[
 {label:"MAIN",items:[
  {icon:"🏠",label:"Dashboard",href:"/dashboard",roles:["SUPER_ADMIN"]},{icon:"🏢",label:"Clients",href:"/dashboard/clients",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT"]},{icon:"🎯",label:"Sales CRM",href:"/dashboard/sales",roles:["SUPER_ADMIN","SALES"]},{icon:"💬",label:"WhatsApp",href:"/dashboard/whatsapp",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"]},{icon:"📣",label:"Media Control",href:"/dashboard/media/control-center",roles:["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]},{icon:"🔄",label:"Platform Sync",href:"/dashboard/media/sync",roles:["SUPER_ADMIN","MEDIA_BUYER"]},{icon:"🎨",label:"Creative",href:"/dashboard/creative",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]},{icon:"📥",label:"Tasks Inbox",href:"/dashboard/tasks-inbox",roles:["SUPER_ADMIN","ACCOUNT_MANAGER"]},{icon:"📅",label:"Calendar",href:"/dashboard/calendar",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR","SALES","CLIENT"]}
 ]},{label:"FINANCE & HR",items:[{icon:"💰",label:"Finance",href:"/dashboard/finance",roles:["SUPER_ADMIN","ACCOUNTANT"]},{icon:"💳",label:"Accounts Payment",href:"/dashboard/clients/accounts-payment",roles:["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER"]},{icon:"📋",label:"Contracts",href:"/dashboard/contracts",roles:["SUPER_ADMIN","ACCOUNTANT"]},{icon:"👥",label:"HR & Team",href:"/dashboard/team",roles:["SUPER_ADMIN"]},{icon:"💎",label:"LTV & Revenue",href:"/dashboard/ltv",roles:["SUPER_ADMIN","ACCOUNTANT"]}]},{label:"ANALYTICS",items:[{icon:"📊",label:"Analytics",href:"/dashboard/analytics",roles:["SUPER_ADMIN"]},{icon:"📈",label:"Forecast",href:"/dashboard/forecast",roles:["SUPER_ADMIN","ACCOUNTANT"]},{icon:"🎯",label:"KPIs & BI",href:"/dashboard/kpis",roles:["SUPER_ADMIN"]},{icon:"📋",label:"Reports",href:"/dashboard/reports",roles:["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]}]},{label:"AI & TOOLS",items:[{icon:"✨",label:"AI Assistant",href:"/dashboard/ai-studio",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},{icon:"📁",label:"Files",href:"/dashboard/files",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},{icon:"🗄️",label:"Archive",href:"/dashboard/archive",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"]},{icon:"🔔",label:"Notifications",href:"/dashboard/notifications",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},{icon:"⚙️",label:"Settings",href:"/dashboard/settings",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]}]},{label:"CLIENT PORTAL",items:[{icon:"🌐",label:"My Portal",href:"/dashboard/portal",roles:["CLIENT"]}]}
];
const QUICK:Record<string,string[]>={SUPER_ADMIN:["/dashboard","/dashboard/clients","/dashboard/media/control-center","/dashboard/notifications"],ACCOUNT_MANAGER:["/dashboard/clients","/dashboard/creative","/dashboard/calendar","/dashboard/notifications"],MEDIA_BUYER:["/dashboard/media/control-center","/dashboard/clients","/dashboard/files","/dashboard/notifications"],CREATOR:["/dashboard/creative","/dashboard/calendar","/dashboard/files","/dashboard/ai-studio"],ACCOUNTANT:["/dashboard/finance","/dashboard/clients/accounts-payment","/dashboard/reports","/dashboard/files"],SALES:["/dashboard/sales","/dashboard/calendar","/dashboard/whatsapp","/dashboard/ai-studio"],CLIENT:["/dashboard/portal","/dashboard/calendar","/dashboard/files","/dashboard/ai-studio"]};
export function MobileNav({role}:{role:string}){
 const path=usePathname(),[open,setOpen]=useState(false);
 const visible=SECTIONS.map(s=>({...s,items:s.items.filter(i=>i.roles.includes(role))})).filter(s=>s.items.length),all=visible.flatMap(s=>s.items),quickHrefs=QUICK[role]||QUICK.CLIENT,quick=quickHrefs.map(h=>all.find(i=>i.href===h)).filter(Boolean) as Item[];
 const active=all.filter(i=>path===i.href||(i.href!=="/dashboard"&&path.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
 return <>
  {open&&<div className="mobile-menu-backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>}
  <aside className={`mobile-menu-drawer${open?" open":""}`} aria-hidden={!open}>
   <div className="mobile-menu-head"><div><strong>VIVIT</strong><span>{role.replace(/_/g," ")}</span></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu">×</button></div>
   <nav>{visible.map(s=><section key={s.label}><p>{s.label}</p>{s.items.map(i=><Link key={i.href} href={i.href} className={active===i.href?"active":""}><span>{i.icon}</span><b>{i.label}</b></Link>)}</section>)}</nav>
  </aside>
  <nav className="mobile-nav" aria-label="Mobile navigation">{quick.map(i=><Link key={i.href} href={i.href} className={active===i.href?"active":""}><span>{i.icon}</span><small>{i.label}</small></Link>)}<button type="button" className={open?"active":""} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Open full menu"><span>☰</span><small>Menu</small></button></nav>
 </>;
}
