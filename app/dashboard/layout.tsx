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

function PageSkeleton() {
  return (
    <div style={{padding:"28px",display:"grid",gap:"16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>
        {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:"110px",borderRadius:"16px"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>
        <div className="skeleton" style={{height:"300px",borderRadius:"16px"}}/>
        <div className="skeleton" style={{height:"300px",borderRadius:"16px"}}/>
      </div>
      <div className="skeleton" style={{height:"250px",borderRadius:"16px"}}/>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children:React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role     = (session.user as any).role ?? "CLIENT";
  const userName = session.user.name ?? session.user.email ?? "User";
  const userId   = (session.user as any).id ?? "";

  const unreadRows = await db.select({ value: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .catch(() => []);
  const unreadCount = Number(unreadRows[0]?.value ?? 0);

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg-primary)"}}>
      <Sidebar role={role} userName={userName}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",transition:"margin-left 0.2s ease"}}
        id="app-main">
        <Header role={role} unreadCount={unreadCount}/>
        <main style={{flex:1,padding:"0"}}>
          <Suspense fallback={<PageSkeleton/>}>
            <div className="app-content animate-fade-up">
              {children}
            </div>
          </Suspense>
        </main>
      </div>
      <RealtimeNotifications/>
      <KeyboardShortcutsModal/>
      <MobileNav role={role}/>
      <DashboardLanguage/>

      {/* JS to sync sidebar collapse with main content margin */}
      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          var main = document.getElementById('app-main');
          function sync(){
            if(window.matchMedia('(max-width: 768px)').matches){
              if(main){ main.style.marginLeft='0'; main.style.marginRight='0'; }
              return;
            }
            var collapsed = localStorage.getItem('vivit-sidebar-collapsed')==='true';
            if(main) main.style.marginLeft = collapsed ? '64px' : '240px';
          }
          sync();
          window.addEventListener('resize', sync, {passive:true});
          window.addEventListener('storage', sync);
          // Also listen for sidebar toggle clicks
          document.addEventListener('click', function(e){
            if(e.target && e.target.textContent && (e.target.textContent.includes('←') || e.target.textContent.includes('→')))
              setTimeout(sync, 250);
          });
        })();
      `}}/>
    </div>
  );
}
