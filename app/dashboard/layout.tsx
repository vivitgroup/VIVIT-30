import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, notifications } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts";
import { Suspense } from "react";
import { DashboardLanguage } from "@/components/i18n/DashboardLanguage";
import { WorkspaceCurrencyGuard } from "@/components/ui/WorkspaceCurrencyGuard";
import { LegacyUiGuard } from "@/components/ui/LegacyUiGuard";
import { SystemAssistant } from "@/components/assistant/SystemAssistant";
import "./dashboard-polish.css";
import "./final-ui-pass.css";
import "./final-module-polish.css";
import "./odoo-shell.css";
import "./odoo-module-polish.css";

function PageSkeleton(){return <div className="dashboard-skeleton" style={{padding:"28px",display:"grid",gap:"16px"}}><div className="dashboard-skeleton-kpis" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:"110px",borderRadius:"16px"}}/>)}</div><div className="dashboard-skeleton-main" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}><div className="skeleton" style={{height:"300px",borderRadius:"16px"}}/><div className="skeleton" style={{height:"300px",borderRadius:"16px"}}/></div></div>}

export default async function DashboardLayout({children}:{children:React.ReactNode}){
 const session=await auth();if(!session?.user)redirect("/login");
 const role=(session.user as any).role??"CLIENT",userName=session.user.name??session.user.email??"User",userId=(session.user as any).id??"";
 const unreadRows=await db.select({value:count()}).from(notifications).where(and(eq(notifications.userId,userId),eq(notifications.isRead,false))).catch(()=>[]);const unreadCount=Number(unreadRows[0]?.value??0);
 return <div style={{display:"flex",minHeight:"100vh",background:"var(--bg-primary)"}}><Sidebar role={role} userName={userName}/><div className="app-main-shell" id="app-main"><Header role={role} unreadCount={unreadCount}/><main style={{flex:1,padding:0}}><Suspense fallback={<PageSkeleton/>}><div className="app-content animate-fade-up">{children}</div></Suspense></main></div><WorkspaceCurrencyGuard/><LegacyUiGuard/><RealtimeNotifications/><KeyboardShortcutsModal/><MobileNav role={role}/><DashboardLanguage/><SystemAssistant role={role}/></div>;
}
