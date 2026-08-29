"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
  { keys:["G","D"],  label:"Go to Dashboard",      href:"/dashboard" },
  { keys:["G","C"],  label:"Go to Clients",         href:"/dashboard/clients" },
  { keys:["G","S"],  label:"Go to Sales",           href:"/dashboard/sales" },
  { keys:["G","M"],  label:"Go to Media Buying",    href:"/dashboard/media" },
  { keys:["G","F"],  label:"Go to Finance",         href:"/dashboard/finance" },
  { keys:["G","T"],  label:"Go to Team / HR",       href:"/dashboard/team" },
  { keys:["G","A"],  label:"Go to Analytics",       href:"/dashboard/analytics" },
  { keys:["G","I"],  label:"Go to Tasks Inbox",     href:"/dashboard/tasks-inbox" },
  { keys:["G","L"],  label:"Go to Calendar",        href:"/dashboard/calendar" },
  { keys:["N","T"],  label:"New Task",              href:"/dashboard/creative/new" },
  { keys:["N","C"],  label:"New Client",            href:"/dashboard/clients/new" },
  { keys:["⌘","K"],  label:"Global Search",         href:"#search" },
  { keys:["?"],      label:"Show this help",        href:"#help" },
];

export function KeyboardShortcutsModal() {
  const router  = useRouter();
  const [open, setOpen]   = useState(false);
  const [theme, setTheme] = useState<"dark"|"light">("dark");

  // Theme persistence
  useEffect(() => {
    const saved = localStorage.getItem("vivit-theme") as "dark"|"light" || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("light", next === "light");
      localStorage.setItem("vivit-theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    let buf = "";
    let timer: NodeJS.Timeout;

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toUpperCase();

      // Single shortcuts
      if (key === "?" && !e.metaKey && !e.ctrlKey) { setOpen(v=>!v); return; }
      if (key === "ESCAPE") { setOpen(false); return; }

      // Toggle theme: T T
      buf += key;
      clearTimeout(timer);
      timer = setTimeout(() => { buf = ""; }, 1000);

      if (buf === "TT") { toggleTheme(); buf = ""; return; }

      // Two-key navigation shortcuts
      const match = SHORTCUTS.find(s => s.keys.join("") === buf && s.href !== "#help" && s.href !== "#search");
      if (match) {
        router.push(match.href);
        buf = "";
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, toggleTheme]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      title="Keyboard shortcuts (?)"
      style={{position:"fixed",bottom:"20px",left:"20px",zIndex:9990,background:"rgba(10,28,55,0.9)",border:"1px solid rgba(0,119,182,0.2)",borderRadius:"8px",padding:"6px 10px",cursor:"pointer",fontSize:"11px",color:"#5A80A0",fontFamily:"Inter,sans-serif"}}>
      ⌨️ Shortcuts
    </button>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={()=>setOpen(false)}>
      <div style={{background:"#0D1A2E",border:"1px solid rgba(0,119,182,0.3)",borderRadius:"16px",padding:"24px",maxWidth:"480px",width:"90%",maxHeight:"80vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h2 style={{fontFamily:"Inter,sans-serif",fontSize:"16px",fontWeight:700,color:"#F0F8FF",margin:0}}>⌨️ Keyboard Shortcuts</h2>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              style={{background:"rgba(0,119,182,0.1)",border:"1px solid rgba(0,119,182,0.2)",borderRadius:"8px",padding:"4px 10px",cursor:"pointer",fontSize:"12px",color:"#00B4D8",fontFamily:"Inter,sans-serif"}}>
              {theme==="dark"?"☀️ Light":"🌙 Dark"}
            </button>
            <button onClick={()=>setOpen(false)}
              style={{background:"none",border:"none",color:"#5A80A0",cursor:"pointer",fontSize:"20px",lineHeight:1}}>×</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
          {SHORTCUTS.filter(s=>s.href!=="search").map(s=>(
            <div key={s.keys.join("")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:"8px",background:"rgba(255,255,255,0.03)"}}>
              <span style={{fontFamily:"Inter,sans-serif",fontSize:"12px",color:"#6B8FAF"}}>{s.label}</span>
              <div style={{display:"flex",gap:"3px"}}>
                {s.keys.map(k=>(
                  <kbd key={k} style={{background:"rgba(0,119,182,0.15)",border:"1px solid rgba(0,119,182,0.25)",borderRadius:"4px",padding:"1px 6px",fontFamily:"monospace",fontSize:"11px",color:"#00B4D8"}}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
          {/* Special */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:"8px",background:"rgba(255,255,255,0.03)"}}>
            <span style={{fontFamily:"Inter,sans-serif",fontSize:"12px",color:"#6B8FAF"}}>Toggle Light/Dark</span>
            <div style={{display:"flex",gap:"3px"}}>
              {["T","T"].map((k,i)=>(
                <kbd key={i} style={{background:"rgba(0,119,182,0.15)",border:"1px solid rgba(0,119,182,0.25)",borderRadius:"4px",padding:"1px 6px",fontFamily:"monospace",fontSize:"11px",color:"#00B4D8"}}>{k}</kbd>
              ))}
            </div>
          </div>
        </div>
        <p style={{fontFamily:"Inter,sans-serif",fontSize:"11px",color:"#3A5A7A",marginTop:"16px",textAlign:"center"}}>Press <kbd style={{fontFamily:"monospace",fontSize:"11px",color:"#00B4D8"}}>?</kbd> to toggle this panel · <kbd style={{fontFamily:"monospace",fontSize:"11px",color:"#00B4D8"}}>ESC</kbd> to close</p>
      </div>
    </div>
  );
}
