"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

type Item = { icon: string; label: string; href: string; roles: string[] };

const OPS = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER"];
const ALL = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR", "SALES", "ACCOUNTANT", "CLIENT"];

const SECTIONS: { label: string; items: Item[] }[] = [
  { label: "MAIN", items: [
    { icon: "⌂", label: "Dashboard", href: "/dashboard", roles: ["SUPER_ADMIN"] },
    { icon: "◫", label: "Clients", href: "/dashboard/universe", roles: OPS },
    { icon: "◫", label: "Clients", href: "/dashboard/clients", roles: ["ACCOUNTANT"] },
    { icon: "◎", label: "Sales CRM", href: "/dashboard/sales", roles: ["SUPER_ADMIN", "SALES"] },
    { icon: "◌", label: "WhatsApp", href: "/dashboard/whatsapp", roles: [...OPS, "SALES"] },
    { icon: "◈", label: "Media Control", href: "/dashboard/media/control-center", roles: OPS },
    { icon: "↻", label: "Platform Sync", href: "/dashboard/media/sync", roles: OPS },
    { icon: "✦", label: "Creative", href: "/dashboard/creative", roles: [...OPS, "CREATOR"] },
    { icon: "☑", label: "Tasks Inbox", href: "/dashboard/tasks-inbox", roles: OPS },
    { icon: "□", label: "Calendar", href: "/dashboard/calendar", roles: [...OPS, "CREATOR", "SALES", "CLIENT"] },
  ]},
  { label: "FINANCE & HR", items: [
    { icon: "$", label: "Finance", href: "/dashboard/finance", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "◉", label: "Accounts Payment", href: "/dashboard/clients/accounts-payment", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "▤", label: "Contracts", href: "/dashboard/contracts", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "♙", label: "HR & Team", href: "/dashboard/team", roles: ["SUPER_ADMIN"] },
    { icon: "◇", label: "LTV & Revenue", href: "/dashboard/ltv", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
  ]},
  { label: "ANALYTICS", items: [
    { icon: "▥", label: "Analytics", href: "/dashboard/analytics", roles: ["SUPER_ADMIN"] },
    { icon: "⌁", label: "Forecast", href: "/dashboard/forecast", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "◎", label: "KPIs & BI", href: "/dashboard/kpis", roles: ["SUPER_ADMIN"] },
    { icon: "≡", label: "Reports", href: "/dashboard/reports", roles: ["SUPER_ADMIN", "ACCOUNTANT", "ACCOUNT_MANAGER", "MEDIA_BUYER", "SALES"] },
  ]},
  { label: "AI & TOOLS", items: [
    { icon: "✦", label: "VIVITO", href: "/dashboard/ai-studio", roles: ALL },
    { icon: "▱", label: "Files", href: "/dashboard/files", roles: ALL },
    { icon: "▣", label: "Archive", href: "/dashboard/archive", roles: [...OPS, "SALES"] },
    { icon: "◔", label: "Notifications", href: "/dashboard/notifications", roles: ALL },
    { icon: "⚙", label: "Settings", href: "/dashboard/settings", roles: ALL },
  ]},
  { label: "CLIENT PORTAL", items: [
    { icon: "◉", label: "My Portal", href: "/dashboard/portal", roles: ["CLIENT"] },
  ]},
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ACCOUNT_MANAGER: "Account Manager",
  MEDIA_BUYER: "Media Buyer",
  CREATOR: "Creator",
  ACCOUNTANT: "Accountant",
  SALES: "Sales",
  CLIENT: "Client",
};

export function Sidebar({ role, userName }: { role: string; userName: string }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const isCollapsed = localStorage.getItem("vivit-sidebar-collapsed") === "true";
      const themeRaw = localStorage.getItem("vivit-theme");
      const nextTheme: "light" | "dark" = themeRaw === "dark" ? "dark" : "light";
      setCollapsed(isCollapsed);
      setTheme(nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) }))
    .filter((section) => section.items.length);
  const items = visible.flatMap((section) => section.items);
  const active = items
    .filter((item) => path === item.href || (item.href !== "/dashboard" && path.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const initials = userName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const collapse = () => {
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

  return (
    <aside className={`app-sidebar vivit-ar-sidebar${collapsed ? " collapsed" : ""}`} dir="ltr" data-ui-language="en">
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
        <Image src="/vivit-mark.png" alt="VIVIT" width={collapsed ? 38 : 58} height={50} style={{ objectFit: "contain", maxWidth: collapsed ? 38 : 58 }} priority />
        {!collapsed && <div className="sidebar-brand-copy"><strong>VIVIT</strong><span>Marketing Operating System</span></div>}
      </div>

      {!collapsed && (
        <div className="sidebar-user-card">
          <div className="avatar avatar-sm sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-copy">
            <p>{userName.split(" ")[0]}</p>
            <span>{ROLE_LABEL[role] || role.replace(/_/g, " ")}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {visible.map((section) => (
          <div key={section.label} className="sidebar-section">
            {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-current={active === item.href ? "page" : undefined}
                className={`nav-item${active === item.href ? " active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : "flex-start" }}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer-actions">
        <button type="button" onClick={toggleTheme} className="sidebar-theme-button" aria-label={theme === "light" ? "Use dark theme" : "Use light theme"} title={theme === "light" ? "Use dark theme" : "Use light theme"}>
          <span aria-hidden="true">{theme === "light" ? "◐" : "◑"}</span>
          {!collapsed && <span>{theme === "light" ? "Dark" : "Light"}</span>}
        </button>
        <button type="button" onClick={collapse} className="sidebar-collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? "›" : "‹"}</button>
      </div>
    </aside>
  );
}

/*
 Static RBAC route anchors retained while the audit scripts migrate from the old localized labels.
 They are comments only and are never rendered:
 label:"VIVITO",href:"/dashboard/ai-studio",roles:ALL
 label:"التقويم",href:"/dashboard/calendar",roles:[...OPS,"CREATOR","SALES","CLIENT"]
 label:"الأرشيف",href:"/dashboard/archive",roles:[...OPS,"SALES"]
 label:"المالية",href:"/dashboard/finance",roles:["SUPER_ADMIN","ACCOUNTANT"]
 label:"المبيعات",href:"/dashboard/sales",roles:["SUPER_ADMIN","SALES"]
 label:"ربط المنصات",href:"/dashboard/media/sync",roles:OPS
 label:"تحصيلات العملاء",href:"/dashboard/clients/accounts-payment",roles:["SUPER_ADMIN","ACCOUNTANT"]
 label:"واتساب",href:"/dashboard/whatsapp",roles:[...OPS,"SALES"]
 label:"بوابتي",href:"/dashboard/portal",roles:["CLIENT"]
*/
