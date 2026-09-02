import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, notifications, sql } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { OperatingSystemLauncher } from "@/components/layout/OperatingSystemLauncher";
import { ClientLogoManager } from "@/components/clients/ClientLogoManager";
import { ClientSocialLinkRuntime } from "@/components/clients/ClientSocialLinkRuntime";
import { CompetitiveDeliveryApprovalRuntime } from "@/components/clients/CompetitiveDeliveryApprovalRuntime";
import { CampaignLifecycleRuntime } from "@/components/media/CampaignLifecycleRuntime";
import { TaskReminderWatcher } from "@/components/reminders/TaskReminderWatcher";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts";
import { TaskReferenceRuntime } from "@/components/creative/TaskReferenceRuntime";
import { Suspense } from "react";
import { DashboardLanguage } from "@/components/i18n/DashboardLanguage";
import { SystemAssistant } from "@/components/assistant/SystemAssistant";
import VivitoVoiceRuntime from "@/components/assistant/VivitoVoiceRuntime";
import ExperienceRuntime from "@/components/experience/ExperienceRuntime";
import "./dashboard-polish.css";
import "./final-ui-pass.css";
import "./final-module-polish.css";
import "./odoo-shell.css";
import "./odoo-module-polish.css";
import "./mobile-release.css";
import "./vivit-experience-v5.css";
import "./vivit-experience-nav.css";
import "./vivit-worlds.css";
import "./vivito-ui-motion-v1.css";
import "./vivito-ui-refinement-v2.css";
import "./vivit-one.css";
import "./professional-system.css";
import "./genz-professional-ui-v3.css";
import "./system-ui-consistency-v4.css";
import "./release-corrections-v5.css";
import "./uiux-micro-fixes.css";

function PageSkeleton(){return <div className="dashboard-skeleton" style={{padding:"28px",display:"grid",gap:"16px",minWidth:0,maxWidth:"100%",overflow:"hidden"}}><div className="dashboard-skeleton-kpis" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"16px"}}>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:"110px",borderRadius:"16px",minWidth:0}}/>)}</div><div className="dashboard-skeleton-main" style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,1fr)",gap:"16px"}}><div className="skeleton" style={{height:"300px",borderRadius:"16px",minWidth:0}}/><div className="skeleton" style={{height:"300px",borderRadius:"16px",minWidth:0}}/></div></div>}

type GrantRow={name?:string|null;permissions?:string|null};
export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const session=await auth();if(!session?.user)redirect("/login");
  const role=session.user.role??"CLIENT",userName=session.user.name??session.user.email??"User",userId=session.user.id??"",workspaceId=String(session.user.workspaceId??"");
  const [unreadRows,grantRows]=await Promise.all([
    db.select({value:count()}).from(notifications).where(and(eq(notifications.userId,userId),eq(notifications.isRead,false))).catch(()=>[]),
    role==="SUPER_ADMIN"||!workspaceId?Promise.resolve<GrantRow[]>([]):db.execute<GrantRow>(sql`select wr.name,wr.permissions from user_roles ur join workspace_roles wr on wr.id=ur.role_id and wr.workspace_id=ur.workspace_id where ur.user_id=${userId} and ur.workspace_id=${workspaceId}`).then(v=>Array.from(v)).catch(()=>[]),
  ]),unreadCount=Number(unreadRows[0]?.value??0);
  const canHrProvision=role==="SUPER_ADMIN"||grantRows.some(g=>String(g.name||"").toUpperCase()==="HR"||String(g.permissions||"").includes("hr.employee.create"));
  const showTaskReminders=["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"].includes(String(role));
  return <div style={{display:"flex",minHeight:"100vh",width:"100%",maxWidth:"100vw",minWidth:0,overflowX:"hidden",background:"var(--bg-primary)"}}><ExperienceRuntime role={role}/><Sidebar role={role} userName={userName} canHrProvision={canHrProvision}/><div className="app-main-shell" id="app-main" dir="ltr" data-ui-language="en" style={{minWidth:0,width:"100%",maxWidth:"100%",overflowX:"hidden"}}><Header role={role} unreadCount={unreadCount}/><main style={{flex:1,padding:0,minWidth:0,maxWidth:"100%",overflowX:"hidden"}}><Suspense fallback={<PageSkeleton/>}><div className="app-content animate-fade-up" style={{minWidth:0,maxWidth:"100%"}}>{children}</div></Suspense></main></div><RealtimeNotifications/><KeyboardShortcutsModal/><TaskReferenceRuntime/><CompetitiveDeliveryApprovalRuntime role={String(role)}/><CampaignLifecycleRuntime role={String(role)}/><MobileNav role={role}/><DashboardLanguage/><ClientSocialLinkRuntime/>{showTaskReminders&&<TaskReminderWatcher/>}<SystemAssistant role={role}/><VivitoVoiceRuntime/><ClientLogoManager role={role}/><OperatingSystemLauncher role={role}/></div>;
}
