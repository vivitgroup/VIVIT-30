import type { Metadata, Viewport } from "next";
import VivitoOutputGuard from "@/components/assistant/VivitoOutputGuard";
import LiveWorkspaceRefresh from "@/components/live/LiveWorkspaceRefresh";
import GroupLiveRefresh from "@/components/live/GroupLiveRefresh";
import WebMcpBridge from "@/components/webmcp/WebMcpBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: { default:"VIVIT Operating System", template:"%s | VIVIT" },
  description:"VIVIT Operating System — unified access to Vivit Group, Marketing, Technology, and Hospitality.",
  applicationName:"VIVIT Operating System",
  appleWebApp:{ capable:true, statusBarStyle:"default", title:"VIVIT" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F8FB",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children:React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </head>
      <body>
        {/* Mobile must visually match the light desktop system. Desktop keeps the saved preference. */}
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            try {
              var mobile=window.matchMedia('(max-width: 900px)').matches;
              var root=document.documentElement;
              root.classList.remove('dark');
              if(!mobile){
                var t=localStorage.getItem('vivit-theme')||'light';
                if(t==='dark') root.classList.add('dark');
              }
              root.dataset.mobileTheme=mobile?'light':'desktop';
            } catch(e){}
          })();
        `}}/>
        {children}
        <LiveWorkspaceRefresh/>
        <GroupLiveRefresh/>
        <WebMcpBridge/>
        <VivitoOutputGuard/>
      </body>
    </html>
  );
}
