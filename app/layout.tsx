import type { Metadata, Viewport } from "next";
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
  themeColor: "#C52A31",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children:React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </head>
      <body>
        {/* Anti-flash theme script */}
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            try {
              var t=localStorage.getItem('vivit-theme')||'light';
              if(t==='dark') document.documentElement.classList.add('dark');
            } catch(e){}
          })();
        `}}/>
        {children}
      </body>
    </html>
  );
}
