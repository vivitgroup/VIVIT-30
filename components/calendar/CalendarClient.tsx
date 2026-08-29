"use client";
import { useState, useCallback } from "react";
import { createCalendarEvent } from "@/lib/actions";

interface CalEvent {
  id: string;
  title: string;
  date: Date | string;
  platform: string | null;
  caption: string | null;
  status: string;
  client: { companyName: string };
}
interface Client  { id: string; companyName: string; }
interface Task    { id: string; title: string; client: { companyName: string }; }

interface Props {
  events: CalEvent[];
  clients: Client[];
  approvedTasks: Task[];
  canManage: boolean;
}

// ── Platform config ───────────────────────────────────────────
const PLATFORMS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  instagram: { label:"Instagram", icon:"📸", color:"#E1306C", bg:"#FFF0F5" },
  facebook:  { label:"Facebook",  icon:"👥", color:"#1877F2", bg:"#EEF4FF" },
  tiktok:    { label:"TikTok",    icon:"🎵", color:"#010101", bg:"#F0F0F0" },
  snapchat:  { label:"Snapchat",  icon:"👻", color:"#FFFC00", bg:"#FFFDE0" },
  google:    { label:"Google",    icon:"🔍", color:"#4285F4", bg:"#EEF3FF" },
  linkedin:  { label:"LinkedIn",  icon:"💼", color:"#0A66C2", bg:"#EEF6FF" },
  twitter:   { label:"Twitter/X", icon:"🐦", color:"#1DA1F2", bg:"#EEF8FF" },
  youtube:   { label:"YouTube",   icon:"▶️", color:"#FF0000", bg:"#FFF0F0" },
};

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Post Card Component ───────────────────────────────────────
function PostCard({ event, onPosted, canManage }: { event: CalEvent; onPosted: (id:string)=>void; canManage:boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pl  = event.platform ?? "instagram";
  const cfg = PLATFORMS[pl] ?? PLATFORMS.instagram;
  const isPosted = event.status === "posted";

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: `1px solid ${isPosted ? "rgba(16,185,129,0.2)" : cfg.color + "33"}`,
        borderRadius: "10px",
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: expanded ? "0 8px 24px rgba(0,0,0,0.08)" : "var(--card-shadow)",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: "3px", background: isPosted ? "var(--green)" : cfg.color }} />

      {/* Card header */}
      <div
        style={{ padding: "10px 12px", cursor: "pointer", display:"flex", alignItems:"center", gap:"8px" }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Platform icon */}
        <div style={{
          width: "30px", height: "30px", borderRadius: "8px",
          background: isPosted ? "var(--green-bg)" : cfg.bg,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"14px", flexShrink:0
        }}>
          {isPosted ? "✅" : cfg.icon}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{
            fontSize:"12.5px", fontWeight:700,
            color:"var(--text-primary)",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
          }}>{event.title}</p>
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"2px"}}>
            <span style={{
              fontSize:"10px", fontWeight:600, padding:"1px 6px",
              borderRadius:"12px", background: isPosted?"var(--green-bg)":cfg.bg,
              color: isPosted?"var(--green)":cfg.color
            }}>{cfg.label}</span>
            <span style={{fontSize:"10px",color:"var(--text-muted)"}}>{event.client.companyName}</span>
          </div>
        </div>

        {/* Expand arrow */}
        <span style={{
          fontSize:"10px", color:"var(--text-muted)",
          transform: expanded?"rotate(180deg)":"none",
          transition:"transform 0.2s ease", flexShrink:0
        }}>▼</span>
      </div>

      {/* Expanded: Caption + Post button */}
      {expanded && (
        <div style={{
          borderTop:"1px solid var(--card-border)",
          padding:"12px",
          background:"var(--bg-tertiary)",
          animation:"fadeIn 0.15s ease-out"
        }}>
          {event.caption ? (
            <div style={{marginBottom:"10px"}}>
              <p style={{
                fontSize:"11px",fontWeight:700,color:"var(--text-muted)",
                textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"6px"
              }}>📝 Caption</p>
              <p style={{
                fontSize:"12.5px", lineHeight:1.7,
                color:"var(--text-secondary)",
                whiteSpace:"pre-wrap",
                background:"var(--card-bg)",
                border:"1px solid var(--card-border)",
                borderRadius:"8px",
                padding:"10px 12px",
                maxHeight:"80px",
                overflowY:"auto"
              }}>{event.caption}</p>
            </div>
          ) : (
            <p style={{fontSize:"12px",color:"var(--text-muted)",marginBottom:"10px",fontStyle:"italic"}}>
              No caption added yet
            </p>
          )}

          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{
              fontSize:"11px",fontWeight:700,padding:"3px 10px",borderRadius:"12px",
              background:isPosted?"var(--green-bg)":"var(--amber-bg)",
              color:isPosted?"var(--green)":"var(--amber)"
            }}>
              {isPosted ? "✅ Posted" : "⏰ Scheduled"}
            </span>
            {!isPosted && canManage && (
              <button
                onClick={() => onPosted(event.id)}
                style={{
                  padding:"4px 12px",borderRadius:"7px",fontSize:"11.5px",fontWeight:700,
                  background:"var(--green)",color:"#fff",border:"none",cursor:"pointer",
                  transition:"all 0.15s ease", marginLeft:"auto"
                }}
              >Mark Posted ✓</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Calendar Component ───────────────────────────────────
export function CalendarClient({ events, clients, approvedTasks, canManage }: Props) {
  const today  = new Date();
  const [year,  setYear]   = useState(today.getFullYear());
  const [month, setMonth]  = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [showAdd, setShowAdd]  = useState(false);
  const [addDate, setAddDate]  = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterClient,   setFilterClient]   = useState("all");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [actionError,setActionError]=useState("");
  const [assetFileId, setAssetFileId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  // Filter events
  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return false;
    if (filterPlatform !== "all" && e.platform !== filterPlatform) return false;
    if (filterClient   !== "all" && e.client.companyName !== filterClient) return false;
    return true;
  });

  const eventsOnDay = (d: number) =>
    monthEvents.filter(e => new Date(e.date).getDate() === d);

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  function prevMonth() { month===0 ? (setMonth(11), setYear(y=>y-1)) : setMonth(m=>m-1); }
  function nextMonth() { month===11? (setMonth(0),  setYear(y=>y+1)) : setMonth(m=>m+1); }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  async function handleAdd(fd: FormData) {
    if (!assetFileId) {
      setUploadError("Upload the post image or video before scheduling.");
      return;
    }
    setActionError("");
    setSaving(true);
    try {
      await createCalendarEvent(fd);
      setShowAdd(false);
      window.location.reload();
    } catch(error) {
      setActionError(error?.message || "The post could not be scheduled.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPostAsset(file: File) {
    setUploadError("");
    setAssetFileId("");
    if (!selectedClientId) {
      setUploadError("Select the client first, then upload the post asset.");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setUploadError("Only image and video files are accepted for scheduled posts.");
      return;
    }
    setUploading(true);
    try {
      const signResponse = await fetch("/api/files", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({op:"sign", name:file.name, size:file.size, mimeType:file.type})
      });
      const sign = await signResponse.json();
      if (!signResponse.ok) throw new Error(sign.error || "Could not prepare the upload.");
      const uploadResponse = await fetch(sign.uploadUrl, {method:"PUT", headers:{"Content-Type":file.type || "application/octet-stream"}, body:file});
      if (!uploadResponse.ok) throw new Error("The media upload did not complete.");
      const completeResponse = await fetch("/api/files", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({op:"complete", path:sign.path, name:file.name, size:file.size, mimeType:file.type, category:"SOCIAL_POST", clientId:selectedClientId})
      });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error || "Could not save the uploaded media.");
      setAssetFileId(complete.file?.id || complete.fileId);
      setAssetName(file.name);
    } catch(error) {
      setUploadError(error.message || "The media upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePosted(id: string) {
    setActionError("");
    const response=await fetch(`/api/calendar/${id}/posted`, { method:"POST" });
    if(!response.ok){const body=await response.json().catch(()=>({}));setActionError(body.error||"The post status could not be updated.");return;}
    window.location.reload();
  }

  const scheduled = monthEvents.filter(e=>e.status==="scheduled").length;
  const posted    = monthEvents.filter(e=>e.status==="posted").length;
  const uniqueClients = [...new Set(events.map(e=>e.client.companyName))];

  // Platform breakdown for header stats
  const byPlatform = Object.entries(PLATFORMS).map(([key,cfg])=>({
    key, ...cfg, count: monthEvents.filter(e=>e.platform===key).length
  })).filter(p=>p.count>0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* ── Page Header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">
            {MONTHS[month]} {year} · {scheduled} scheduled · {posted} posted
            {byPlatform.length>0&&" · "+byPlatform.map(p=>`${p.icon} ${p.count}`).join(" · ")}
          </p>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          {/* Filters */}
          <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)}
            className="form-select" style={{fontSize:"12.5px",padding:"7px 10px",width:"auto"}}>
            <option value="all">All Platforms</option>
            {Object.entries(PLATFORMS).map(([k,v])=>(
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          <select value={filterClient} onChange={e=>setFilterClient(e.target.value)}
            className="form-select" style={{fontSize:"12.5px",padding:"7px 10px",width:"auto"}}>
            <option value="all">All Clients</option>
            {uniqueClients.map(c=><option key={c} value={c}>{c}</option>)}
          </select>

          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
            <button onClick={prevMonth} className="btn btn-ghost btn-sm btn-icon">‹</button>
            <button onClick={goToToday} className="btn btn-ghost btn-sm" style={{fontSize:"12px",padding:"6px 10px"}}>Today</button>
            <button onClick={nextMonth} className="btn btn-ghost btn-sm btn-icon">›</button>
          </div>

          {/* Month/Year display */}
          <div style={{padding:"6px 16px",background:"var(--vivit-gradient)",borderRadius:"8px",color:"#fff",fontSize:"13px",fontWeight:700,fontFamily:"Sora,sans-serif"}}>
            {MONTHS[month].slice(0,3)} {year}
          </div>

          {canManage&&(
            <button onClick={()=>{setAddDate(`${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay??today.getDate()).padStart(2,"0")}`);setShowAdd(true);}}
              className="btn btn-primary">+ Add Post</button>
          )}
        </div>
      </div>

      {/* ── Main Layout: Calendar + Sidebar ── */}
      <div className="calendar-layout" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:"16px",alignItems:"start"}}>

        {/* ── Calendar Grid ── */}
        <div className="card calendar-board">
          {/* Day headers */}
          <div className="calendar-days-header" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--card-border)"}}>
            {DAYS_SHORT.map(d=>(
              <div key={d} style={{padding:"10px 4px",textAlign:"center",fontSize:"11px",fontWeight:700,
                color:d==="Sun"||d==="Sat"?"var(--vivit-blue)":"var(--text-muted)",
                textTransform:"uppercase",letterSpacing:"0.06em",borderRight:"1px solid var(--card-border)"}}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="calendar-days-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
            {/* Previous month filler days */}
            {Array.from({length:firstDay},(_,i)=>(
              <div key={`prev-${i}`} style={{
                minHeight:"100px",padding:"8px",
                borderRight:"1px solid var(--card-border)",
                borderBottom:"1px solid var(--card-border)",
                opacity:0.3,
                background:"var(--bg-tertiary)"
              }}>
                <span style={{fontSize:"12px",color:"var(--text-dim)",fontWeight:500}}>
                  {prevDays - firstDay + i + 1}
                </span>
              </div>
            ))}

            {/* Current month days */}
            {Array.from({length:daysInMonth},(_,i)=>{
              const day    = i+1;
              const dayEvs = eventsOnDay(day);
              const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
              const isSel   = day===selectedDay;
              const isWeekend = ((firstDay+i)%7===0 || (firstDay+i)%7===6);

              return (
                <div key={day}
                  onClick={()=>setSelectedDay(day)}
                  style={{
                    minHeight:"100px",
                    padding:"8px",
                    borderRight:"1px solid var(--card-border)",
                    borderBottom:"1px solid var(--card-border)",
                    cursor:"pointer",
                    background: isSel
                      ? "rgba(33,150,243,0.05)"
                      : isWeekend
                      ? "var(--bg-tertiary)"
                      : "var(--card-bg)",
                    transition:"background 0.15s ease",
                    position:"relative",
                    outline: isSel ? `2px solid rgba(33,150,243,0.4)` : "none",
                    outlineOffset:"-2px",
                    borderRadius: isSel ? "4px" : "0",
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    width:"26px",height:"26px",borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background: isToday ? "var(--vivit-blue)" : "transparent",
                    marginBottom:"6px"
                  }}>
                    <span style={{
                      fontSize:"12px",fontWeight: isToday||isSel ? 800 : 500,
                      color: isToday ? "#fff" : isSel ? "var(--vivit-blue)" : isWeekend ? "var(--vivit-blue)" : "var(--text-secondary)"
                    }}>{day}</span>
                  </div>

                  {/* Events on this day */}
                  <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
                    {dayEvs.slice(0,3).map(ev=>{
                      const pl  = ev.platform ?? "instagram";
                      const cfg = PLATFORMS[pl] ?? PLATFORMS.instagram;
                      return (
                        <div key={ev.id} style={{
                          fontSize:"10px",fontWeight:600,
                          padding:"2px 5px",borderRadius:"5px",
                          background: ev.status==="posted" ? "var(--green-bg)" : cfg.bg,
                          color: ev.status==="posted" ? "var(--green)" : cfg.color,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          display:"flex",alignItems:"center",gap:"3px",
                          border:`1px solid ${ev.status==="posted"?"rgba(16,185,129,0.2)":cfg.color+"33"}`
                        }}>
                          <span style={{fontSize:"9px",flexShrink:0}}>
                            {ev.status==="posted"?"✅":cfg.icon}
                          </span>
                          {ev.title.length>14 ? ev.title.slice(0,14)+"…" : ev.title}
                        </div>
                      );
                    })}
                    {dayEvs.length>3&&(
                      <div style={{fontSize:"10px",color:"var(--vivit-blue)",fontWeight:700,padding:"1px 4px"}}>
                        +{dayEvs.length-3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Next month filler */}
            {Array.from({length:(7-((firstDay+daysInMonth)%7))%7},(_,i)=>(
              <div key={`next-${i}`} style={{
                minHeight:"100px",padding:"8px",
                borderRight:"1px solid var(--card-border)",
                borderBottom:"1px solid var(--card-border)",
                opacity:0.3,background:"var(--bg-tertiary)"
              }}>
                <span style={{fontSize:"12px",color:"var(--text-dim)",fontWeight:500}}>{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"12px",position:"sticky",top:"76px"}}>

          {/* Selected day posts */}
          <div className="card">
            <div className="card-header" style={{padding:"14px 16px"}}>
              <div>
                <p className="card-title" style={{fontSize:"14px"}}>
                  {selectedDay
                    ? `${DAYS_SHORT[new Date(year,month,selectedDay).getDay()]} · ${selectedDay} ${MONTHS[month].slice(0,3)}`
                    : "Select a day"}
                </p>
                {selectedDay&&<p style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"2px"}}>
                  {selectedEvents.length} post{selectedEvents.length!==1?"s":""}
                </p>}
              </div>
              {canManage&&selectedDay&&(
                <button onClick={()=>{
                  setAddDate(`${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`);
                  setShowAdd(true);
                }} className="btn btn-primary btn-sm">+ Add</button>
              )}
            </div>

            <div style={{padding:"12px",display:"flex",flexDirection:"column",gap:"8px",maxHeight:"400px",overflowY:"auto"}}>
              {selectedEvents.length===0 ? (
                <div style={{textAlign:"center",padding:"32px 16px"}}>
                  <p style={{fontSize:"28px",marginBottom:"8px"}}>📭</p>
                  <p style={{fontSize:"13px",fontWeight:600,color:"var(--text-secondary)"}}>No posts this day</p>
                  {canManage&&(
                    <button onClick={()=>{
                      if(selectedDay) setAddDate(`${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`);
                      setShowAdd(true);
                    }} className="btn btn-primary btn-sm" style={{marginTop:"12px"}}>Schedule Post +</button>
                  )}
                </div>
              ) : selectedEvents.map(ev=>(
                <PostCard key={ev.id} event={ev} onPosted={handlePosted} canManage={canManage}/>
              ))}
              {actionError&&<p className="form-error" role="alert">{actionError}</p>}
            </div>
          </div>

          {/* Month summary stats */}
          <div className="card">
            <div className="card-header" style={{padding:"14px 16px"}}>
              <p className="card-title" style={{fontSize:"14px"}}>Month Stats</p>
            </div>
            <div style={{padding:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>
              {/* Platform breakdown */}
              {byPlatform.length>0 ? byPlatform.map(p=>(
                <div key={p.key} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"14px",width:"20px",textAlign:"center"}}>{p.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                      <span style={{fontSize:"11.5px",fontWeight:600,color:"var(--text-secondary)"}}>{p.label}</span>
                      <span style={{fontSize:"11.5px",fontWeight:700,color:p.color}}>{p.count}</span>
                    </div>
                    <div className="progress-bar" style={{height:"4px"}}>
                      <div className="progress-fill" style={{width:`${(p.count/Math.max(monthEvents.length,1))*100}%`,background:p.color}}/>
                    </div>
                  </div>
                </div>
              )) : (
                <p style={{fontSize:"12px",color:"var(--text-muted)",textAlign:"center",padding:"8px"}}>No posts this month</p>
              )}

              <div className="divider"/>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {[
                  {label:"Scheduled",value:scheduled,color:"var(--amber)"},
                  {label:"Posted",   value:posted,    color:"var(--green)"},
                  {label:"Total",    value:monthEvents.length,color:"var(--vivit-blue)"},
                  {label:"Rate",     value:`${monthEvents.length>0?Math.round(posted/monthEvents.length*100):0}%`,color:"var(--purple)"},
                ].map(s=>(
                  <div key={s.label} style={{background:"var(--bg-tertiary)",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
                    <p style={{fontSize:"18px",fontWeight:800,color:s.color,fontFamily:"Sora,sans-serif"}}>{s.value}</p>
                    <p style={{fontSize:"10.5px",color:"var(--text-muted)",marginTop:"2px"}}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ready to schedule */}
          {approvedTasks.length>0&&(
            <div className="card" style={{borderColor:"rgba(33,150,243,0.2)"}}>
              <div className="card-header" style={{padding:"14px 16px",borderColor:"rgba(33,150,243,0.15)"}}>
                <div>
                  <p className="card-title" style={{fontSize:"14px",color:"var(--vivit-blue)"}}>Ready to Schedule</p>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)"}}>Approved tasks awaiting a post date</p>
                </div>
              </div>
              <div style={{padding:"12px",display:"flex",flexDirection:"column",gap:"6px",maxHeight:"200px",overflowY:"auto"}}>
                {approvedTasks.map(t=>(
                  <div key={t.id} style={{
                    display:"flex",alignItems:"center",gap:"8px",
                    padding:"8px 10px",borderRadius:"8px",
                    background:"var(--bg-tertiary)",
                    border:"1px solid var(--card-border)"
                  }}>
                    <span style={{fontSize:"14px"}}>🎨</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:"12px",fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</p>
                      <p style={{fontSize:"10.5px",color:"var(--text-muted)"}}>{t.client.companyName}</p>
                    </div>
                    {canManage&&(
                      <button onClick={()=>{
                        if(selectedDay) setAddDate(`${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`);
                        setShowAdd(true);
                      }} style={{fontSize:"10px",padding:"3px 8px",borderRadius:"6px",border:"1px solid var(--vivit-blue)",background:"rgba(33,150,243,0.08)",color:"var(--vivit-blue)",cursor:"pointer",fontWeight:700,fontFamily:"inherit",flexShrink:0}}>
                        Schedule
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Post Modal ── */}
      {showAdd&&canManage&&(
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
          onClick={()=>setShowAdd(false)}>
          <div style={{
            width:"min(560px,100%)",background:"var(--card-bg)",
            borderRadius:"20px",overflow:"hidden",
            boxShadow:"0 32px 64px rgba(0,0,0,0.2)",
            border:"1px solid var(--card-border)",
            animation:"fadeUp 0.2s ease-out"
          }} onClick={e=>e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              padding:"20px 24px",
              background:"var(--vivit-gradient)",
              display:"flex",alignItems:"center",justifyContent:"space-between"
            }}>
              <div>
                <p style={{fontFamily:"Sora,sans-serif",fontSize:"16px",fontWeight:800,color:"#fff"}}>Schedule New Post</p>
                <p style={{fontSize:"12px",color:"rgba(255,255,255,0.75)",marginTop:"2px"}}>Plan and caption your content</p>
              </div>
              <button onClick={()=>setShowAdd(false)}
                style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",fontSize:"16px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                ×
              </button>
            </div>

            {/* Modal body */}
            <form action={handleAdd}>
              <div style={{padding:"24px",display:"flex",flexDirection:"column",gap:"16px"}}>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  {/* Date */}
                  <div>
                    <label className="form-label">Post Date</label>
                    <input name="date" type="date" required defaultValue={addDate}
                      className="form-input"/>
                  </div>

                  {/* Platform */}
                  <div>
                    <label className="form-label">Platform</label>
                    <select name="platform" className="form-select">
                      {Object.entries(PLATFORMS).map(([k,v])=>(
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Client */}
                <div>
                  <label className="form-label">Client</label>
                  <select name="clientId" required className="form-select" value={selectedClientId} onChange={e=>{setSelectedClientId(e.target.value);setAssetFileId("");setAssetName("");}}>
                    <option value="">Select client...</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Post image / video <span style={{color:"var(--red)"}}>*</span></label>
                  <label style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px",border:"1px dashed var(--vivit-blue)",borderRadius:"12px",cursor:uploading?"wait":"pointer",background:"rgba(36,77,135,.05)"}}>
                    <span style={{fontSize:"24px"}}>{assetFileId?"✅":"🖼️"}</span>
                    <span style={{flex:1,fontSize:"12px",color:"var(--text-secondary)"}}>{uploading?"Uploading securely…":assetName||"Choose the final image or video for this post"}</span>
                    <input type="file" accept="image/*,video/*" required={!assetFileId} disabled={uploading} style={{display:"none"}} onChange={e=>{const file=e.target.files?.[0];if(file)uploadPostAsset(file);}}/>
                  </label>
                  <input type="hidden" name="assetFileId" value={assetFileId}/>
                  {uploadError&&<p className="form-error" role="alert">{uploadError}</p>}
                  {assetFileId&&<p style={{fontSize:"11px",color:"var(--green)",marginTop:"6px"}}>Media uploaded and linked to this client.</p>}
                </div>

                {/* Title */}
                <div>
                  <label className="form-label">Post Title / Brief</label>
                  <input name="title" required placeholder="e.g. Ramadan Campaign Reel — Week 2"
                    className="form-input"/>
                </div>

                {/* Caption */}
                <div>
                  <label className="form-label">
                    Caption
                    <span style={{fontSize:"10px",color:"var(--text-muted)",fontWeight:500,textTransform:"none",marginLeft:"6px"}}>Write the actual post copy</span>
                  </label>
                  <textarea name="caption" rows={5}
                    placeholder={`✨ Your caption here...\n\nTell the story. Add the value. Drive the action.\n\n#hashtag1 #hashtag2 #hashtag3`}
                    className="form-input form-textarea"
                    style={{resize:"vertical",lineHeight:1.7,fontFamily:"inherit"}}/>
                </div>

                {/* Hashtags hint */}
                <div style={{
                  padding:"10px 14px",borderRadius:"8px",
                  background:"rgba(33,150,243,0.06)",
                  border:"1px solid rgba(33,150,243,0.15)"
                }}>
                  <p style={{fontSize:"11.5px",color:"var(--vivit-blue)",fontWeight:600,marginBottom:"4px"}}>💡 Caption Tips</p>
                  <p style={{fontSize:"11px",color:"var(--text-muted)",lineHeight:1.6}}>
                    Hook in first 2 lines · Add value · CTA at end · 3-5 hashtags · Emojis for readability
                  </p>
                </div>

                <input type="hidden" name="status" value="scheduled"/>
              </div>

              {/* Modal footer */}
              <div style={{
                padding:"16px 24px",
                borderTop:"1px solid var(--card-border)",
                display:"flex",gap:"10px",justifyContent:"flex-end",
                background:"var(--bg-tertiary)"
              }}>
                <button type="button" onClick={()=>setShowAdd(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving||uploading||!assetFileId} className="btn btn-primary"
                  style={{opacity:saving?0.7:1,minWidth:"140px"}}>
                  {saving ? "Scheduling..." : "📅 Schedule Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
