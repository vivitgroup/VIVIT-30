"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

type Item = { icon: string; label: string; href: string; roles: string[] };

const OPS = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER"];
const ALL = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR", "SALES", "ACCOUNTANT", "CLIENT"];

const SECTIONS: { label: string; items: Item[] }[] = [
  { label: "الرئيسية", items: [
    { icon: "⌂", label: "لوحة التحكم", href: "/dashboard", roles: ["SUPER_ADMIN"] },
    { icon: "◫", label: "العملاء", href: "/dashboard/universe", roles: OPS },
    { icon: "◫", label: "العملاء", href: "/dashboard/clients", roles: ["ACCOUNTANT"] },
    { icon: "◎", label: "المبيعات", href: "/dashboard/sales", roles: ["SUPER_ADMIN", "SALES"] },
    { icon: "◌", label: "واتساب", href: "/dashboard/whatsapp", roles: [...OPS, "SALES"] },
    { icon: "◈", label: "إدارة الإعلانات", href: "/dashboard/media/control-center", roles: OPS },
    { icon: "↻", label: "ربط المنصات", href: "/dashboard/media/sync", roles: OPS },
    { icon: "✦", label: "الإبداع", href: "/dashboard/creative", roles: [...OPS, "CREATOR"] },
    { icon: "☑", label: "صندوق المهام", href: "/dashboard/tasks-inbox", roles: OPS },
    { icon: "□", label: "التقويم", href: "/dashboard/calendar", roles: [...OPS, "CREATOR", "SALES", "CLIENT"] },
  ]},
  { label: "المالية والموارد البشرية", items: [
    { icon: "$", label: "المالية", href: "/dashboard/finance", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "◉", label: "تحصيلات العملاء", href: "/dashboard/clients/accounts-payment", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "▤", label: "العقود", href: "/dashboard/contracts", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "♙", label: "الفريق", href: "/dashboard/team", roles: ["SUPER_ADMIN"] },
    { icon: "◇", label: "القيمة والإيرادات", href: "/dashboard/ltv", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
  ]},
  { label: "التحليلات", items: [
    { icon: "▥", label: "التحليلات", href: "/dashboard/analytics", roles: ["SUPER_ADMIN"] },
    { icon: "⌁", label: "التوقعات", href: "/dashboard/forecast", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { icon: "◎", label: "مؤشرات الأداء", href: "/dashboard/kpis", roles: ["SUPER_ADMIN"] },
    { icon: "≡", label: "التقارير", href: "/dashboard/reports", roles: ["SUPER_ADMIN", "ACCOUNTANT", "ACCOUNT_MANAGER", "MEDIA_BUYER", "SALES"] },
  ]},
  { label: "الذكاء والأدوات", items: [
    {icon:"✦",label:"VIVITO",href:"/dashboard/ai-studio",roles:ALL},
    { icon: "▱", label: "الملفات", href: "/dashboard/files", roles: ALL },
    { icon: "▣", label: "الأرشيف", href: "/dashboard/archive", roles: [...OPS, "SALES"] },
    { icon: "◔", label: "الإشعارات", href: "/dashboard/notifications", roles: ALL },
    { icon: "⚙", label: "الإعدادات", href: "/dashboard/settings", roles: ALL },
  ]},
  { label: "بوابة العميل", items: [
    { icon: "◉", label: "بوابتي", href: "/dashboard/portal", roles: ["CLIENT"] },
  ]},
];

const ROLE_AR: Record<string, string> = {
  SUPER_ADMIN: "مدير النظام",
  ACCOUNT_MANAGER: "مدير حساب",
  MEDIA_BUYER: "مشتري إعلانات",
  CREATOR: "كريتور",
  ACCOUNTANT: "محاسب",
  SALES: "مبيعات",
  CLIENT: "عميل",
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
    <aside className={`app-sidebar vivit-ar-sidebar${collapsed ? " collapsed" : ""}`} dir="rtl">
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
        <Image src="/vivit-mark.png" alt="VIVIT" width={collapsed ? 38 : 58} height={50} style={{ objectFit: "contain", maxWidth: collapsed ? 38 : 58 }} priority />
        {!collapsed && <div className="sidebar-brand-copy"><strong>VIVIT</strong><span>نظام إدارة التسويق</span></div>}
      </div>

      {!collapsed && (
        <div className="sidebar-user-card">
          <div className="avatar avatar-sm sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-copy">
            <p>{userName.split(" ")[0]}</p>
            <span>{ROLE_AR[role] || role.replace(/_/g, " ")}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {visible.map((section) => (
          <div key={section.label} className="sidebar-section">
            {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
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
        <button onClick={toggleTheme} className="sidebar-theme-button" title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}>
          <span aria-hidden="true">{theme === "light" ? "◐" : "◑"}</span>
          {!collapsed && <span>{theme === "light" ? "داكن" : "فاتح"}</span>}
        </button>
        <button onClick={collapse} className="sidebar-collapse-button" aria-label={collapsed ? "فتح القائمة" : "طي القائمة"}>{collapsed ? "‹" : "›"}</button>
      </div>
    </aside>
  );
}
