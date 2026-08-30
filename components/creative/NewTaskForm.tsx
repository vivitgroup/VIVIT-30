"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {createTask} from "@/lib/actions";
import {TASK_TEMPLATES} from "@/lib/task-templates";

type Option={id:string;name:string};
type Client={id:string;companyName:string};
type TaskTemplate=(typeof TASK_TEMPLATES)[number];
const types=["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"];
const typeLabels:Record<string,string>={REEL:"🎬 Reel",GRAPHIC:"🎨 Graphic",CAROUSEL:"📊 Carousel",MOTION_GRAPHIC:"✨ Motion Graphic",VIDEO_EDIT:"🎥 Video Edit",PHOTO_SESSION:"📸 Photo Session",STORY:"📱 Story",UGC:"👤 UGC"};
const pad=(n:number)=>String(n).padStart(2,"0");
function toDisplay(iso:string){if(!iso)return"";const [y,m,d]=iso.split("-");return `${d}/${m}/${y}`}
function toIso(v:string){const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return"";const [,d,mo,y]=m,n=new Date(Number(y),Number(mo)-1,Number(d));if(n.getFullYear()!==Number(y)||n.getMonth()!==Number(mo)-1||n.getDate()!==Number(d))return"";return `${y}-${mo}-${d}`}
function addDays(days:number){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function formatDateInput(raw:string){const digits=raw.replace(/\D/g,"").slice(0,8);return digits.length<=2?digits:digits.length<=4?`${digits.slice(0,2)}/${digits.slice(2)}`:`${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`}

export default function NewTaskForm({clients,creators}:{clients:Client[];creators:Option[]}){
 const [title,setTitle]=useState(""),[type,setType]=useState(""),[priority,setPriority]=useState("MEDIUM"),[brief,setBrief]=useState(""),[tov,setTov]=useState(""),[reference,setReference]=useState(""),[deadlineText,setDeadlineText]=useState(""),[activeTemplate,setActiveTemplate]=useState("");
 const deadline=useMemo(()=>toIso(deadlineText),[deadlineText]);
 const combinedBrief=useMemo(()=>reference.trim()?`${brief.trim()}\n\nREFERENCE / INSPIRATION\n${reference.trim()}`:brief,[brief,reference]);
 function applyTemplate(t:TaskTemplate){setActiveTemplate(t.id);setTitle(String(t.name||"").replace(/^[^\s]+\s/,""));setType(t.type);setPriority(t.priority);setBrief(t.brief);setTov(t.tov||"");setDeadlineText(toDisplay(addDays(Number(t.daysToDeadline||3))));setTimeout(()=>document.getElementById("taskForm")?.scrollIntoView({behavior:"smooth",block:"start"}),50)}
 return <div className="animate-fade-up" style={{display:"grid",gap:18,maxWidth:980}}>
  <div className="flex items-center gap-3"><Link href="/dashboard/creative" className="text-[#6B8FAF] text-xl">←</Link><div><h1 className="page-title">New Creative Task</h1><p className="page-subtitle">Create a clear task, add a reference and set an exact deadline.</p></div></div>
  <div className="card"><div className="card-header"><div><p className="card-title">⚡ Quick Templates</p><p className="page-subtitle" style={{margin:0}}>Click once to fill the title, type, brief, priority and suggested deadline.</p></div></div><div className="card-body" style={{display:"flex",flexWrap:"wrap",gap:8}}>{TASK_TEMPLATES.map(t=><button key={t.id} type="button" onClick={()=>applyTemplate(t)} className={activeTemplate===t.id?"btn btn-primary btn-sm":"btn btn-ghost btn-sm"} style={{cursor:"pointer"}}>{t.name}</button>)}</div></div>
  <form action={createTask} id="taskForm" style={{display:"grid",gap:18}}>
   <input type="hidden" name="brief" value={combinedBrief}/><input type="hidden" name="deadline" value={deadline}/>
   <div className="card"><div className="card-header"><p className="card-title">Task Details</p></div><div className="card-body" style={{display:"grid",gap:14}}>
    <label className="form-label">TASK TITLE *<input name="title" value={title} onChange={e=>setTitle(e.target.value)} required className="form-input" placeholder="e.g. Summer Campaign Reel"/></label>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}><label className="form-label">CLIENT *<select name="clientId" required className="form-select"><option value="">Select client…</option>{clients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}</select></label><label className="form-label">CREATIVE TYPE *<select name="type" required value={type} onChange={e=>setType(e.target.value)} className="form-select"><option value="">Select type…</option>{types.map(t=><option key={t} value={t}>{typeLabels[t]}</option>)}</select></label></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}><label className="form-label">ASSIGN TO<select name="assignedToId" className="form-select"><option value="">Unassigned</option>{creators.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="form-label">PRIORITY *<select name="priority" value={priority} onChange={e=>setPriority(e.target.value)} required className="form-select"><option value="URGENT">🔴 Urgent</option><option value="HIGH">🟠 High</option><option value="MEDIUM">🟡 Medium</option><option value="LOW">⚪ Low</option></select></label></div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) auto",gap:10,alignItems:"end"}}><label className="form-label">DEADLINE * <small style={{fontWeight:500,color:"var(--text-muted)"}}>DD/MM/YYYY</small><input value={deadlineText} onChange={e=>setDeadlineText(formatDateInput(e.target.value))} inputMode="numeric" placeholder="24/08/2026" maxLength={10} required className="form-input" style={{fontVariantNumeric:"tabular-nums"}}/></label><label className="btn btn-ghost" style={{position:"relative",overflow:"hidden",cursor:"pointer",height:42,display:"flex",alignItems:"center"}}>Pick date<input type="date" aria-label="Pick deadline" onChange={e=>e.target.value&&setDeadlineText(toDisplay(e.target.value))} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/></label></div>{deadlineText&&!deadline&&<p className="form-error">Enter a valid date as DD/MM/YYYY.</p>}
   </div></div>
   <div className="card"><div className="card-header"><p className="card-title">Creative Brief & Reference</p></div><div className="card-body" style={{display:"grid",gap:14}}>
    <label className="form-label">BRIEF *<textarea value={brief} onChange={e=>setBrief(e.target.value)} required rows={7} className="form-input" style={{resize:"vertical"}} placeholder="Objective, key message, audience, deliverables…"/></label>
    <label className="form-label">REFERENCE / INSPIRATION<input value={reference} onChange={e=>setReference(e.target.value)} className="form-input" placeholder="Paste a Drive, Instagram, Behance, TikTok or website reference link"/><small style={{display:"block",marginTop:5,color:"var(--text-muted)"}}>This reference is saved with the task brief so the creator sees it in the task.</small></label>
    <label className="form-label">TONE OF VOICE<textarea name="tov" value={tov} onChange={e=>setTov(e.target.value)} rows={2} className="form-input" style={{resize:"vertical"}} placeholder="Professional, energetic, luxury…"/></label>
    <label className="form-label">CAPTION / COPY<textarea name="caption" rows={3} className="form-input" style={{resize:"vertical"}} placeholder="Optional social caption…"/></label>
   </div></div>
   <div style={{display:"flex",gap:10}}><Link href="/dashboard/creative" className="btn btn-ghost" style={{flex:1,textDecoration:"none",justifyContent:"center"}}>Cancel</Link><button type="submit" className="btn btn-primary" disabled={!deadline} style={{flex:1,justifyContent:"center"}}>Create Task →</button></div>
  </form>
 </div>
}
