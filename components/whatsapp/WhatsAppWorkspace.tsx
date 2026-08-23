"use client";
import {useEffect,useMemo,useState} from "react";

function normalizePhone(v:string){
 let p=v.replace(/[^0-9]/g,"");
 if(p.startsWith("00"))p=p.slice(2);
 if(p.startsWith("0"))p=`20${p.slice(1)}`;
 return p;
}

export default function WhatsAppWorkspace(){
 const[phone,setPhone]=useState(""),[body,setBody]=useState(""),[mode,setMode]=useState<"text"|"template">("text"),[templateName,setTemplateName]=useState(""),[languageCode,setLanguageCode]=useState("en_US"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[configured,setConfigured]=useState<boolean|null>(null),[recent,setRecent]=useState<any[]>([]);
 async function load(){try{const r=await fetch("/api/whatsapp-templates",{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load WhatsApp status");setConfigured(!!d.hasRealAPI);setRecent(d.recent||[])}catch(e:any){setMessage(e.message||"Could not load WhatsApp status")}}
 useEffect(()=>{load()},[]);
 const normalized=normalizePhone(phone),valid=normalized.length>=8&&normalized.length<=15,directUrl=useMemo(()=>valid?`https://wa.me/${normalized}${body?`?text=${encodeURIComponent(body)}`:""}`:"",[normalized,body,valid]);
 async function send(){if(!valid||!body.trim())return setMessage("Valid phone number and message are required.");setBusy(true);setMessage("");try{const r=await fetch("/api/whatsapp-templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:phone,body:body.trim(),mode,templateName,languageCode})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Send failed");setMessage(`Sent from VIVIT successfully · ${d.messageId}`);await load()}catch(e:any){setMessage(e.message||"Send failed")}finally{setBusy(false)}}
 return <div style={{display:"grid",gap:18,maxWidth:1000}}>
  <div><h1 className="page-title">WhatsApp</h1><p className="page-subtitle">Open a WhatsApp conversation instantly, or send directly from VIVIT through Meta WhatsApp Cloud API.</p></div>
  <div className={configured?"media-success":"media-error"}>{configured===null?"Checking WhatsApp Cloud API…":configured?"WhatsApp Cloud API is configured — in-system sending is enabled.":"Open WhatsApp works now. Sending from VIVIT requires WHATSAPP_TOKEN + WHATSAPP_PHONE_ID in Vercel."}</div>
  {message&&<div className={message.startsWith("Sent")?"media-success":"media-error"}>{message}</div>}
  <div className="card"><div className="card-header"><p className="card-title">New WhatsApp message</p><span className="badge badge-green">Egypt numbers supported</span></div><div className="card-body" style={{display:"grid",gap:12}}>
   <label className="form-label">WHATSAPP NUMBER<input className="form-input" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="01012345678 or +201012345678"/><small style={{color:"var(--text-muted)"}}>Egyptian local numbers are converted automatically to country code 20.</small></label>
   <label className="form-label">MESSAGE<textarea className="form-input" value={body} onChange={e=>setBody(e.target.value)} rows={5} maxLength={4096} placeholder="Write the message…"/></label>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><a className={`btn btn-success${!valid?" disabled":""}`} href={directUrl||"#"} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",pointerEvents:valid?"auto":"none"}}>Open WhatsApp ↗</a><button className="btn btn-primary" onClick={send} disabled={busy||configured===false||!valid}>{busy?"Sending…":"Send from VIVIT"}</button></div>
  </div></div>
  <div className="card"><div className="card-header"><p className="card-title">Cloud API mode</p><span className="badge badge-blue">Meta</span></div><div className="card-body" style={{display:"grid",gap:12}}><label className="form-label">MESSAGE TYPE<select className="form-select" value={mode} onChange={e=>setMode(e.target.value as any)}><option value="text">Text — inside the 24h customer service window</option><option value="template">Approved template — business initiated message</option></select></label>{mode==="template"&&<><label className="form-label">TEMPLATE NAME<input className="form-input" value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="approved_template_name"/></label><label className="form-label">LANGUAGE CODE<input className="form-input" value={languageCode} onChange={e=>setLanguageCode(e.target.value)} placeholder="en_US"/></label></>}</div></div>
  <div className="card"><div className="card-header"><p className="card-title">Recent messages</p><span className="badge badge-gray">Last 20</span></div><div className="card-body" style={{display:"grid",gap:8}}>{recent.map((x:any)=><div className="media-decision" key={x.id}><div><strong>{x.to}</strong><small>{x.body}<br/>{x.createdAt?new Date(x.createdAt).toLocaleString():""}</small></div><span className={`badge ${x.status==="SENT"||x.status==="DELIVERED"||x.status==="READ"?"badge-green":x.status==="FAILED"?"badge-red":"badge-gray"}`}>{x.status}</span></div>)}{!recent.length&&<p className="text-muted">No WhatsApp messages logged yet.</p>}</div></div>
 </div>;
}
