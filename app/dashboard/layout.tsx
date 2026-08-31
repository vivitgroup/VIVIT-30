import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {Sidebar} from "@/components/layout/Sidebar";
import {Header} from "@/components/layout/Header";
import {MobileNav} from "@/components/layout/MobileNav";
import {KeyboardShortcuts} from "@/components/KeyboardShortcuts";
import {DashboardLanguage} from "@/components/i18n/DashboardLanguage";
import {TaskReminderWatcher} from "@/components/notifications/TaskReminderWatcher";
import {ClientSocialLinkRuntime} from "@/components/clients/ClientSocialLinkRuntime";
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
import ExperienceRuntime from "@/components/experience/ExperienceRuntime";
import SystemAssistant from "@/components/assistant/SystemAssistant";
import {NotificationPoller} from "@/components/notifications/NotificationPoller";

export default async function DashboardLayout({children}:{children:React.ReactNode}){
 const session=await auth();if(!session?.user)redirect("/login");const user=session.user as typeof session.user&{role?:string};const role=user.role??"CLIENT";
 return <div className="app-main-shell" dir="ltr" data-ui-language="en"><Sidebar role={role} userName={user.name??"User"}/><div className="app-body"><Header role={role} unreadCount={0}/><main className="app-content">{children}</main></div><MobileNav role={role}/><SystemAssistant role={role}/><NotificationPoller/><TaskReminderWatcher role={role}/><KeyboardShortcuts/><DashboardLanguage/><ClientSocialLinkRuntime/><ExperienceRuntime/></div>
}
