"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
type Item={icon:string;label:string;href:string;roles:string[]};
const OPS=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"];
const SECTIONS:{label:string;items:Item[]}[]=[
 {label:"MAIN",items:[
  {icon:"🏠",label:"Dashboard",href:"/dashboard",roles:["SUPER_ADMIN"]},
  {icon:"🏢",label:"Clients",href:"/dashboard/universe",roles:OPS},
  {icon:"🎯",label:"Sales CRM",href:"/dashboard/sales",roles:["SUPER_ADMIN","SALES"]},
  {icon:"💬",label:"WhatsApp",href:"/dashboard/whatsapp",roles:[...OPS,"SALES"]},
  {icon:"📣",label:"Media Control",href:"/dashboard/media/control-center",roles:OPS},
  {icon:"🔄",label:"Platform Sync",href:"/dashboard/media/sync",roles:OPS},
  {icon:"🎨",label:"Creative",href:"/dashboard/creative",roles:[...OPS,"CREATOR"]},
  {icon:"📥",label:"Tasks Inbox",href:"/dashboard/tasks-inbox",roles:OPS},
  {icon:"📅",label:"Calendar",href:"/dashboard/calendar",roles:[...OPS,"CREATOR","SALES","CLIENT"]}
 ]},
 {label:"FINANCE & HR",items:[
  {icon:"💰",label:"Finance",href:"/dashboard/finance",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"💳",label:"Accounts Payment",href:"/dashboard/clients/accounts-payment",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"📋",label:"Contracts",href:"/dashboard/contracts",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"👥",label:"HR & Team",href:"/dashboard/team",roles:["SUPER_ADMIN"]},
  {icon:"💎",label:"LTV & Revenue",href:"/dashboard/ltv",roles:["SUPER_ADMIN","ACCOUNTANT"]}
 ]},
 {label:"ANALYTICS",items:[
  {icon:"📊",label:"Analytics",href:"/dashboard/analytics",roles:["SUPER_ADMIN"]},
  {icon:"📈",label:"Forecast",href:"/dashboard/forecast",roles:["SUPER_ADMIN","ACCOUNTANT"]},
  {icon:"🎯",label:"KPIs & BI",href:"/dashboard/kpis",roles:["SUPER_ADMIN"]},
  {icon:"📋",label:"Reports",href:"/dashboard/reports",roles:["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]}
 ]},
 {label:"INTELLIGENCE & TOOLS",items:[
  {icon:"✦",label:"VIVITO",href:"/dashboard/ai-studio",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},
  {icon:"📁",label:"Files",href:"/dashboard/files",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},
  {icon:"🗄️",label:"Archive",href:"/dashboard/archive",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]},
  {icon:"🔔",label:"Notifications",href:"/dashboard/notifications",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]},
  {icon:"⚙️",label:"Settings",href:"/dashboard/settings",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]}
 ]},
 {label:"CLIENT PORTAL",items:[{icon:"🌐",label:"My Portal",href:"/dashboard/portal",roles:["CLIENT"]}]}
];
const AR:Record<string,string>={MAIN:"الرئيسية","FINANCE & HR":"المالية والموارد البشرية",ANALYTICS:"التحليلات","INTELLIGENCE & TOOLS":"الذكاء والأدوات","CLIENT PORTAL":"بوابة العميل",Dashboard:"لوحة التحكم",Clients:"العملاء","Sales CRM":"المبيعات",WhatsApp:"واتساب","Media Control":"إدارة الإعلانات","Platform Sync":"ربط المنصات",Creative:"الإبداع","Tasks Inbox":"صندوق المهام",Calendar:"التقويم",Finance:"المالية","Accounts Payment":"تحصيلات العملاء",Contracts:"العقود","HR & Team":"الفريق","LTV & Revenue":"القيمة والإيرادات",Analytics:"التحليلات",Forecast:"التوقعات","KPIs & BI":"مؤشرات الأداء",Reports:"التقارير",VIVITO:"VIVITO",Files:"الملفات",Archive:"الأرشيف",Notifications:"الإشعارات",Settings:"الإعدادات","My Portal":"بوابتي"};
export function Sidebar({role,userName}:{role:string;userName:string}){const path=usePathname(),[collapsed,setCollapsed]=useState(false),[theme,setTheme]=useState<"light"|"dark">("light"),[lang,setLang]=useState<"en"|"ar">("en");useEffect(()=>{const h=(e:Event)=>setLang((e as CustomEvent).detail);window.addEventListener("vivit-language",h);const timer=setTimeout(()=>{const c=localStorage.getItem("vivit-sidebar-collapsed")==="true",themeRaw=localStorage.getItem("vivit-theme"),langRaw=localStorage.getItem("vivit-lang"),t: "light"|"dark"=themeRaw==="dark"?"dark":"light",l: "en"|"ar"=langRaw==="ar"?"ar":"en";setCollapsed(c);setTheme(t);setLang(l);document.documentElement.classList.toggle("dark",t==="dark")},0);return()=>{clearTimeout(timer);window.removeEventListener("vivit-language",h)}},[]);const t=(v:string)=>lang==="ar"?(AR[v]||v):v,visible=SECTIONS.map(s=>({...s,items:s.items.filter(i=>i.roles.includes(role))})).filter(s=>s.items.length),items=visible.flatMap(s=>s.items),active=items.filter(i=>path===i.href||(i.href!=="/dashboard"&&path.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]?.href,initials=userName.split(" ").filter(Boolean).map(x=>x[0]).join("").slice(0,2).toUpperCase();const collapse=()=>{const n=!collapsed;setCollapsed(n);localStorage.setItem("vivit-sidebar-collapsed",String(n))},toggleTheme=()=>{const n=theme==="light"?"dark":"light";setTheme(n);localStorage.setItem("vivit-theme",n);document.documentElement.classList.toggle("dark",n==="dark")};return <aside className={`app-sidebar${collapsed?" collapsed":""}`}><div className="sidebar-logo" style={{justifyContent:collapsed?"center":"flex-start"}}><Image src="/vivit-mark.png" alt="VIVIT" width={collapsed?38:58} height={50} style={{objectFit:"contain",maxWidth:collapsed?38:58}} priority/>{!collapsed&&<div className="sidebar-brand-copy"><strong>VIVIT</strong><span>Marketing ERP</span></div>}</div>{!collapsed&&<div style={{padding:"12px 16px",borderBottom:"1px solid var(--sidebar-border)"}}><div className="flex items-center gap-2"><div className="avatar avatar-sm" style={{background:"var(--vivit-gradient)"}}>{initials}</div><div><p style={{fontSize:13,fontWeight:700}}>{userName.split(" ")[0]}</p><p style={{fontSize:10.5,color:"var(--text-muted)"}}>{role.replace(/_/g," ")}</p></div></div></div>}<nav style={{flex:1,overflowY:"auto",padding:"8px 0"}}>{visible.map(s=><div key={s.label}>{!collapsed&&<div className="sidebar-section-label">{t(s.label)}</div>}{s.items.map(i=><Link key={i.href} href={i.href} title={collapsed?t(i.label):undefined} className={`nav-item${active===i.href?" active":""}`} style={{justifyContent:collapsed?"center":"flex-start",paddingLeft:collapsed?0:14}}><span className="nav-icon">{i.icon}</span>{!collapsed&&<span className="nav-label">{t(i.label)}</span>}</Link>)}</div>)}</nav><div style={{padding:"12px 8px",borderTop:"1px solid var(--sidebar-border)",display:"flex",gap:6}}><button onClick={toggleTheme} style={{flex:1,padding:8,borderRadius:8,border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",cursor:"pointer"}}>{theme==="light"?"🌙":"☀️"}{!collapsed&&(theme==="light"?" Dark":" Light")}</button><button onClick={collapse} style={{width:36,border:"1px solid var(--card-border)",borderRadius:8,background:"var(--bg-tertiary)"}}>{collapsed?"→":"←"}</button></div></aside>}
