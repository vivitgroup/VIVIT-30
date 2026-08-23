"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

type NavItem={icon:string;label:string;href:string;roles:string[]};
type Section={label:string;items:NavItem[]};
const SECTIONS:Section[]=[
 {label:"MAIN",items:[
  {icon:"🏠",label:"Dashboard",href:"/dashboard",roles:["SUPER_ADMIN"]},
  {icon:"🏢",label:"Clients",href:"/dashboard/clients",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT"]},
  {icon:"🎯",label:"Sales CRM",href:"/dashboard/sales",roles:["SUPER_ADMIN","SALES"]},
  {icon:"🧾",label:"Online Aman",href:"/dashboard/sales/aman",roles:["SUPER_ADMIN","SALES"]},
  {icon:"📣",label:"Media Control",href:"/dashboard/media/control-center",roles:["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]},
  {icon:"🔄",label:"Platform Sync",href:"/dashboard/media/sync",roles:["SUPER_ADMIN","MEDIA_BUYER"]},
  {icon:"🎨",label:"Creative",href:"/dashboard/creative",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]},
  {icon:"📥",label:"Tasks Inbox",href:"/dashboard/tasks-inbox",roles:["SUPER_ADMIN","ACCOUNT_MANAGER"]},
  {icon:"📅",label:"Calendar",href:"/dashboard/calendar",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]},
 ]},
 {label:"FINANCE & HR",items:[
  {icon:"💰",label:"Finance",href:"/dashboard/finance",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"📋",label:"Contracts",href:"/dashboard/contracts",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"👥",label:"HR & Team",href:"/dashboard/team",roles:["SUPER_ADMIN"]},
  {icon:"💎",label:"LTV & Revenue",href:"/dashboard/ltv",roles:["SUPER_ADMIN","ACCOUNTANT"]},
 ]},
 {label:"ANALYTICS",items:[
  {icon:"📊",label:"Analytics",href:"/dashboard/analytics",roles:["SUPER_ADMIN"]},
  {icon:"📈",label:"Forecast",href:"/dashboard/forecast",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"🎯",label:"KPIs & BI",href:"/dashboard/kpis",roles:["SUPER_ADMIN"]},
  {icon:"📋",label:"Reports",href:"/dashboard/reports",roles:["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]},
 ]},
 {label:"AI & TOOLS",items:[
  {icon:"✨",label:"AI Studio",href:"/dashboard/ai-studio",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"]},
  {icon:"📁",label:"Files",href:"/dashboard/files",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},
  {icon:"🔔",label:"Notifications",href:"/dashboard/notifications",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT"]},
  {icon:"⚙️",label:"Settings",href:"/dashboard/settings",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]},
 ]},
 {label:"CLIENT PORTAL",items:[
  {icon:"🏠",label:"My Portal",href:"/dashboard/portal",roles:["CLIENT"]},
  {icon:"🔔",label:"Notifications",href:"/dashboard/notifications",roles:["CLIENT"]},
 ]},
];

export function Sidebar({role,userName}:{role:string;userName:string}){
 const pathname=usePathname();
 const [collapsed,setCollapsed]=useState(false);
 const [theme,setTheme]=useState<"light"|"dark">("light");
 const [lang,setLang]=useState<"en"|"ar">("en");
 useEffect(()=>{
  const c=localStorage.getItem("vivit-sidebar-collapsed")==="true";
  const t=(localStorage.getItem("vivit-theme") as "light"|"dark")||"light";
  const l=(localStorage.getItem("vivit-lang") as "en"|"ar")||"en";
  setCollapsed(c);setTheme(t);setLang(l);document.documentElement.classList.toggle("dark",t==="dark");
  const onLang=(e:Event)=>setLang((e as CustomEvent).detail);window.addEventListener("vivit-language",onLang);return()=>window.removeEventListener("vivit-language",onLang);
 },[]);
 const ar:Record<string,string>={MAIN:"الرئيسية","FINANCE & HR":"المالية والموارد البشرية",ANALYTICS:"التحليلات","AI & TOOLS":"الذكاء الاصطناعي والأدوات","CLIENT PORTAL":"بوابة العميل",Dashboard:"لوحة التحكم",Clients:"العملاء","Sales CRM":"المبيعات","Online Aman":"أمان أونلاين","Media Control":"إدارة الإعلانات","Platform Sync":"ربط المنصات",Creative:"الإبداع","Tasks Inbox":"صندوق المهام",Calendar:"التقويم",Finance:"المالية",Contracts:"العقود","HR & Team":"الفريق","LTV & Revenue":"القيمة والإيرادات",Analytics:"التحليلات",Forecast:"التوقعات","KPIs & BI":"مؤشرات الأداء",Reports:"التقارير","AI Studio":"استوديو الذكاء الاصطناعي",Files:"الملفات",Notifications:"الإشعارات",Settings:"الإعدادات","My Portal":"بوابتي"};
 const t=(v:string)=>lang==="ar"?(ar[v]||v):v;
 const initials=userName.split(" ").filter(Boolean).map(n=>n[0]).join("").slice(0,2).toUpperCase();
 const visible=SECTIONS.map(s=>({...s,items:s.items.filter(i=>i.roles.includes(role))})).filter(s=>s.items.length);
 const active=(href:string)=>pathname===href||(href!=="/dashboard"&&pathname.startsWith(href+"/"));
 const toggleCollapse=()=>{const n=!collapsed;setCollapsed(n);localStorage.setItem("vivit-sidebar-collapsed",String(n));};
 const toggleTheme=()=>{const n=theme==="light"?"dark":"light";setTheme(n);localStorage.setItem("vivit-theme",n);document.documentElement.classList.toggle("dark",n==="dark");};
 return <aside className={`app-sidebar${collapsed?" collapsed":""}`}>
  <div className="sidebar-logo" style={{justifyContent:collapsed?"center":"flex-start"}}>
   <Image src="/vivit-mark.png" alt="VIVIT" width={collapsed?38:58} height={50} style={{objectFit:"contain",maxWidth:collapsed?38:58,transition:"all .2s ease"}} priority/>
   {!collapsed&&<div className="sidebar-brand-copy"><strong>VIVIT</strong><span>Marketing ERP</span></div>}
  </div>
  {!collapsed&&<div style={{padding:"12px 16px",borderBottom:"1px solid var(--sidebar-border)"}}><div className="flex items-center gap-2"><div className="avatar avatar-sm" style={{background:"var(--vivit-gradient)"}}>{initials}</div><div style={{minWidth:0}}><p style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName.split(" ")[0]}</p><p style={{fontSize:10.5,color:"var(--text-muted)"}}>{role.replace(/_/g," ")}</p></div></div></div>}
  <nav style={{flex:1,overflowY:"auto",padding:"8px 0"}}>{visible.map(section=><div key={section.label}>{!collapsed&&<div className="sidebar-section-label">{t(section.label)}</div>}{section.items.map(item=><Link key={item.href} href={item.href} title={collapsed?t(item.label):undefined} className={`nav-item${active(item.href)?" active":""}`} style={{justifyContent:collapsed?"center":"flex-start",paddingLeft:collapsed?0:14}}><span className="nav-icon">{item.icon}</span>{!collapsed&&<span className="nav-label">{t(item.label)}</span>}</Link>)}</div>)}</nav>
  <div style={{padding:"12px 8px",borderTop:"1px solid var(--sidebar-border)",display:"flex",flexDirection:collapsed?"column":"row",gap:6,alignItems:"center"}}>
   <button onClick={toggleTheme} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:8,borderRadius:"var(--radius-sm)",border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",cursor:"pointer",fontSize:12,color:"var(--text-secondary)",fontFamily:"inherit"}} title={theme==="light"?"Switch to Dark Mode":"Switch to Light Mode"}>{theme==="light"?"🌙":"☀️"}{!collapsed&&<span>{theme==="light"?"Dark":"Light"}</span>}</button>
   <button onClick={toggleCollapse} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--radius-sm)",border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",cursor:"pointer",fontSize:14,color:"var(--text-secondary)",flexShrink:0}}>{collapsed?"→":"←"}</button>
  </div>
 </aside>;
}
