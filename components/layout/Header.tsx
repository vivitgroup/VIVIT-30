"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

function exportCSV() {
  const table = document.querySelector<HTMLTableElement>("table");
  if (!table) { alert("No table on this page"); return; }
  const rows = Array.from(table.querySelectorAll("tr"));
  const csv  = rows.map(r => Array.from(r.querySelectorAll("th,td")).map(c=>`"${c.textContent?.trim()??""}`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:"vivit-export.csv"});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

const PAGE_TITLES: Record<string,string> = {
  "/dashboard":"Dashboard","/dashboard/clients":"Clients","/dashboard/sales":"Sales CRM",
  "/dashboard/media":"Media Buying","/dashboard/creative":"Creative Tasks",
  "/dashboard/tasks-inbox":"Tasks Inbox","/dashboard/finance":"Finance",
  "/dashboard/analytics":"Analytics","/dashboard/team":"HR & Team",
  "/dashboard/ai-studio":"AI Studio","/dashboard/settings":"Settings",
  "/dashboard/kpis":"KPIs & BI","/dashboard/forecast":"Revenue Forecast",
  "/dashboard/reports":"Reports","/dashboard/notifications":"Notifications",
  "/dashboard/files":"Files & Documents",
  "/dashboard/media/control-center":"Media Buying Control Center",
  "/dashboard/media/sync":"Ad Platform Connections",
};

export function Header({ role, unreadCount }: { role:string; unreadCount:number }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query,  setQuery]    = useState("");
  const [results,setResults]  = useState<any[]>([]);
  const [loading,setLoading]  = useState(false);
  const [history,setHistory]  = useState<string[]>([]);
  const [selected,setSelected]= useState(0);
  const [lang,setLang]=useState<"en"|"ar">("en");
  const inputRef = useRef<HTMLInputElement>(null);
  const timer    = useRef<NodeJS.Timeout|null>(null);
  const pageTitle = PAGE_TITLES[pathname] || pathname.split("/").pop()?.replace(/-/g," ") || "Dashboard";

  useEffect(()=>{
    try { setHistory(JSON.parse(localStorage.getItem("vivit-search-history")??"[]")); const saved=(localStorage.getItem("vivit-lang") as "en"|"ar")||"en";setLang(saved);document.documentElement.lang=saved;document.documentElement.dir=saved==="ar"?"rtl":"ltr"; } catch {}
  },[]);

  const toggleLanguage=()=>{const next=lang==="en"?"ar":"en";setLang(next);localStorage.setItem("vivit-lang",next);document.documentElement.lang=next;document.documentElement.dir=next==="ar"?"rtl":"ltr";};

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){ e.preventDefault(); setSearchOpen(v=>!v); setQuery(""); setResults([]); }
      if(e.key==="Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  useEffect(()=>{ if(searchOpen) setTimeout(()=>inputRef.current?.focus(),50); },[searchOpen]);

  const doSearch = useCallback((q:string)=>{
    if(timer.current) clearTimeout(timer.current);
    if(!q||q.length<2){ setResults([]); return; }
    setLoading(true);
    timer.current=setTimeout(async()=>{
      try {
        const r=await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setResults((await r.json()).results??[]);
        setSelected(0);
      } catch {}
      setLoading(false);
    },250);
  },[]);

  const addHistory=(q:string)=>{
    if(!q.trim()) return;
    const next=[q,...history.filter(h=>h!==q)].slice(0,8);
    setHistory(next);
    localStorage.setItem("vivit-search-history",JSON.stringify(next));
  };

  const select=(item:any)=>{ addHistory(item.title||query); router.push(item.href); setSearchOpen(false); setQuery(""); setResults([]); };

  return (
    <>
      <header className="app-header">
        {/* Page title */}
        <div style={{flex:1}}>
          <h1 style={{fontSize:"16px",fontWeight:700,color:"var(--text-primary)",fontFamily:"Sora,sans-serif",textTransform:"capitalize"}}>{pageTitle}</h1>
        </div>

        {/* Search bar */}
        <button onClick={()=>setSearchOpen(true)}
          style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 14px",background:"var(--bg-tertiary)",border:"1.5px solid var(--card-border)",borderRadius:"var(--radius-sm)",cursor:"text",color:"var(--text-muted)",fontSize:"13px",minWidth:"220px",transition:"var(--transition)"}}>
          <span>🔍</span>
          <span style={{flex:1,textAlign:"left"}}>Search...</span>
          <kbd style={{fontSize:"10px",background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:"4px",padding:"1px 5px",color:"var(--text-muted)"}}>⌘K</kbd>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleLanguage} className="btn btn-ghost btn-sm" title="Switch language">{lang==="en"?"عربي":"English"}</button>
          {/* Export CSV */}
          <button onClick={exportCSV} className="btn btn-ghost btn-sm btn-icon" title="Export CSV">
            📥
          </button>

          {/* Notifications */}
          <a href="/dashboard/notifications"
            style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"36px",height:"36px",borderRadius:"var(--radius-sm)",border:"1.5px solid var(--card-border)",background:"var(--card-bg)",textDecoration:"none",fontSize:"16px",transition:"var(--transition)"}}>
            🔔
            {unreadCount>0&&(
              <span style={{position:"absolute",top:"-4px",right:"-4px",background:"var(--red)",color:"#fff",fontSize:"9px",fontWeight:800,borderRadius:"999px",minWidth:"16px",height:"16px",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>
                {unreadCount>9?"9+":unreadCount}
              </span>
            )}
          </a>

          {/* Role badge */}
          <span className="badge badge-blue" style={{fontSize:"11px"}}>
            {role.replace(/_/g," ")}
          </span>

          {/* Sign out */}
          <a href="/api/auth/signout" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>
            Sign Out
          </a>
        </div>
      </header>

      {/* Search Palette */}
      {searchOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"80px"}}
          onClick={()=>setSearchOpen(false)}>
          <div style={{width:"min(580px,90vw)",background:"var(--card-bg)",border:"1.5px solid var(--card-border)",borderRadius:"var(--radius-lg)",overflow:"hidden",boxShadow:"0 32px 64px rgba(0,0,0,0.2)",animation:"fadeUp 0.15s ease-out"}}
            onClick={e=>e.stopPropagation()}>
            {/* Input */}
            <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 18px",borderBottom:"1px solid var(--card-border)"}}>
              <span style={{fontSize:"18px"}}>{loading?"⏳":"🔍"}</span>
              <input ref={inputRef} value={query}
                onChange={e=>{setQuery(e.target.value);doSearch(e.target.value);}}
                onKeyDown={e=>{
                  if(e.key==="ArrowDown"){e.preventDefault();setSelected(s=>Math.min(s+1,(results.length||5)-1));}
                  if(e.key==="ArrowUp"){e.preventDefault();setSelected(s=>Math.max(s-1,0));}
                  if(e.key==="Enter"&&results[selected]) select(results[selected]);
                }}
                placeholder="Search clients, tasks, leads..."
                style={{flex:1,border:"none",outline:"none",fontSize:"15px",color:"var(--text-primary)",background:"transparent",fontFamily:"inherit"}}
              />
              {query&&<button onClick={()=>{setQuery("");setResults([]);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:"var(--text-muted)"}}>×</button>}
            </div>

            {/* Results */}
            <div style={{maxHeight:"380px",overflowY:"auto",padding:"8px"}}>
              {results.length>0 ? (
                <>
                  <p className="sidebar-section-label" style={{padding:"8px 12px 4px"}}>Results</p>
                  {results.map((r,i)=>(
                    <div key={i} onClick={()=>select(r)}
                      style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",borderRadius:"var(--radius-sm)",cursor:"pointer",background:i===selected?"var(--bg-hover)":"transparent",transition:"var(--transition)"}}
                      onMouseEnter={()=>setSelected(i)}>
                      <span style={{fontSize:"20px",width:"28px",textAlign:"center"}}>{r.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:600,color:"var(--text-primary)",fontSize:"13.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</p>
                        <p style={{fontSize:"12px",color:"var(--text-muted)"}}>{r.subtitle}</p>
                      </div>
                      <span className="badge badge-gray" style={{fontSize:"11px"}}>{r.type}</span>
                    </div>
                  ))}
                </>
              ) : query.length>=2&&!loading ? (
                <div style={{textAlign:"center",padding:"32px",color:"var(--text-muted)"}}>
                  <p style={{fontSize:"32px",marginBottom:"8px"}}>🔍</p>
                  <p>No results for "{query}"</p>
                </div>
              ) : history.length>0 ? (
                <>
                  <p className="sidebar-section-label" style={{padding:"8px 12px 4px"}}>Recent Searches</p>
                  {history.map((h,i)=>(
                    <div key={i} onClick={()=>{setQuery(h);doSearch(h);}}
                      style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"var(--radius-sm)",cursor:"pointer",color:"var(--text-secondary)"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-hover)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <span>🕐</span><span style={{fontSize:"13px"}}>{h}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{padding:"24px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px"}}>
                  Start typing to search across clients, tasks, leads, and more
                </div>
              )}
            </div>

            <div style={{padding:"8px 16px",borderTop:"1px solid var(--card-border)",display:"flex",gap:"16px",fontSize:"11px",color:"var(--text-dim)"}}>
              <span>↑↓ navigate</span><span>↵ select</span><span>ESC close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
