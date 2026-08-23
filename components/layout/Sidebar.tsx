"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const SECTIONS = [
  {
    label: "MAIN",
    items: [
      { icon:"🏠", label:"Dashboard",     href:"/dashboard",              roles:["SUPER_ADMIN"] },
      { icon:"🏢", label:"Clients",       href:"/dashboard/clients",      roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT"] },
      { icon:"🎯", label:"Sales CRM",     href:"/dashboard/sales",        roles:["SUPER_ADMIN","SALES"] },
      { icon:"📣", label:"Media Control", href:"/dashboard/media/control-center",roles:["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"] },
      { icon:"🔄", label:"Platform Sync", href:"/dashboard/media/sync",roles:["SUPER_ADMIN","MEDIA_BUYER"] },
      { icon:"🎨", label:"Creative",      href:"/dashboard/creative",     roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"] },
      { icon:"📥", label:"Tasks Inbox",   href:"/dashboard/tasks-inbox",  roles:["SUPER_ADMIN","ACCOUNT_MANAGER"] },
      { icon:"📅", label:"Calendar",      href:"/dashboard/calendar",     roles:["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"] },
    ]
  },
  {
    label: "FINANCE & HR",
    items: [
      { icon:"💰", label:"Finance",       href:"/dashboard/finance",      roles:["SUPER_ADMIN","ACCOUNTANT"] },
      { icon:"📋", label:"Contracts",     href:"/dashboard/contracts",    roles:["SUPER_ADMIN","ACCOUNTANT"] },
      { icon:"👥", label:"HR & Team",     href:"/dashboard/team",         roles:["SUPER_ADMIN"] },
      { icon:"💎", label:"LTV & Revenue", href:"/dashboard/ltv",          roles:["SUPER_ADMIN","ACCOUNTANT"] },
    ]
  },
  {
    label: "ANALYTICS",
    items: [
      { icon:"📊", label:"Analytics",     href:"/dashboard/analytics",    roles:["SUPER_ADMIN"] },
      { icon:"📈", label:"Forecast",      href:"/dashboard/forecast",     roles:["SUPER_ADMIN","ACCOUNTANT"] },
      { icon:"🎯", label:"KPIs & BI",     href:"/dashboard/kpis",         roles:["SUPER_ADMIN"] },
      { icon:"📋", label:"Reports",       href:"/dashboard/reports",      roles:["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"] },
    ]
  },
  {
    label: "AI & TOOLS",
    items: [
      { icon:"✨", label:"AI Studio",     href:"/dashboard/ai-studio",    roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"] },
      { icon:"📁", label:"Files",         href:"/dashboard/files",        roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"] },
      { icon:"🔔", label:"Notifications", href:"/dashboard/notifications",roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT"] },
      { icon:"⚙️", label:"Settings",      href:"/dashboard/settings",     roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"] },
    ]
  },
  {
    label: "CLIENT PORTAL",
    items: [
      { icon:"🏠", label:"My Portal",     href:"/dashboard/portal",       roles:["CLIENT"] },
      { icon:"🔔", label:"Notifications", href:"/dashboard/notifications",roles:["CLIENT"] },
    ]
  }
];

export function Sidebar({ role, userName }: { role:string; userName:string }) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [lang,setLang]=useState<"en"|"ar">("en");

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("vivit-sidebar-collapsed") === "true";
    const savedTheme     = (localStorage.getItem("vivit-theme") as "light"|"dark") || "light";
    setCollapsed(savedCollapsed);
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    setLang((localStorage.getItem("vivit-lang") as "en"|"ar")||"en");
    const onLang=(e:Event)=>setLang((e as CustomEvent).detail);
    window.addEventListener("vivit-language",onLang);
    return()=>window.removeEventListener("vivit-language",onLang);
  }, []);

  const ar:Record<string,string>={MAIN:"الرئيسية","FINANCE & HR":"المالية والموارد البشرية",ANALYTICS:"التحليلات","AI & TOOLS":"الذكاء الاصطناعي والأدوات","CLIENT PORTAL":"بوابة العميل",Dashboard:"لوحة التحكم",Clients:"العملاء","Sales CRM":"المبيعات","Media Control":"إدارة الإعلانات","Platform Sync":"ربط المنصات",Creative:"الإبداع","Tasks Inbox":"صندوق المهام",Calendar:"التقويم",Finance:"المالية",Contracts:"العقود","HR & Team":"الفريق","LTV & Revenue":"القيمة والإيرادات",Analytics:"التحليلات",Forecast:"التوقعات","KPIs & BI":"مؤشرات الأداء",Reports:"التقارير","AI Studio":"استوديو الذكاء الاصطناعي",Files:"الملفات",Notifications:"الإشعارات",Settings:"الإعدادات","My Portal":"بوابتي"};
  const t=(v:string)=>lang==="ar"?(ar[v]||v):v;

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("vivit-sidebar-collapsed", String(next));
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("vivit-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const initials = userName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

  const isActive = (href: string) =>
    pathname === href || (href.length > "/dashboard".length && pathname.startsWith(href));

  const visibleSections = SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(i => i.roles.includes(role))
  })).filter(s => s.items.length > 0);

  return (
    <aside className={`app-sidebar${collapsed?" collapsed":""}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{justifyContent: collapsed?"center":"flex-start"}}>
        <Image src="/vivit-mark.png" alt="VIVIT" width={collapsed?38:58} height={50}
          style={{objectFit:"contain",maxWidth:collapsed?"38px":"58px",transition:"all 0.2s ease"}}
          priority/>
        {!collapsed&&<div className="sidebar-brand-copy"><strong>VIVIT</strong><span>Marketing ERP</span></div>}
      </div>

      {/* User info */}
      {!collapsed && (
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--sidebar-border)"}}>
          <div className="flex items-center gap-2">
            <div className="avatar avatar-sm" style={{background:"var(--vivit-gradient)"}}>
              {initials}
            </div>
            <div style={{minWidth:0}}>
              <p style={{fontSize:"13px",fontWeight:700,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName.split(" ")[0]}</p>
              <p style={{fontSize:"10.5px",color:"var(--text-muted)"}}>{role.replace(/_/g," ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {visibleSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="sidebar-section-label">{t(section.label)}</div>
            )}
            {section.items.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  title={collapsed ? t(item.label) : undefined}
                  className={`nav-item${active?" active":""}`}
                  style={{justifyContent:collapsed?"center":"flex-start",paddingLeft:collapsed?"0":"14px"}}>
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{t(item.label)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{padding:"12px 8px",borderTop:"1px solid var(--sidebar-border)",display:"flex",flexDirection:collapsed?"column":"row",gap:"6px",alignItems:"center"}}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",padding:"8px",borderRadius:"var(--radius-sm)",border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)",transition:"var(--transition)",fontFamily:"inherit"}}
          title={theme==="light"?"Switch to Dark Mode":"Switch to Light Mode"}>
          {theme==="light" ? "🌙" : "☀️"}
          {!collapsed && <span>{theme==="light"?"Dark":"Light"}</span>}
        </button>
        {/* Collapse toggle */}
        <button onClick={toggleCollapse}
          style={{width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--radius-sm)",border:"1px solid var(--card-border)",background:"var(--bg-tertiary)",cursor:"pointer",fontSize:"14px",color:"var(--text-secondary)",transition:"var(--transition)",flexShrink:0}}>
          {collapsed?"→":"←"}
        </button>
      </div>
    </aside>
  );
}
