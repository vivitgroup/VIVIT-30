"use client";
import {FormEvent,useEffect,useState} from "react";

type Capability={key:string;workspace:string;label:string;risk:string;approvalRequired:boolean;enabled:boolean;integrationRequired?:boolean};
type Task={id:string;workspace_code:string;capability_key:string;status:string;risk_level:string;created_at:string};
type Data={capabilities:Capability[];tasks:Task[]};

export function VivitoControlPanel({initialWorkspace}:{initialWorkspace?:string}){
 const[data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
 const[capability,setCapability]=useState(""),[payload,setPayload]=useState("{}"),[idempotency,setIdempotency]=useState("");
 const load=()=>fetch("/api/vgroup/vivito/tasks",{cache:"no-store"}).then(r=>r.json()).then(setData).catch(()=>setError("Failed to load Vivito capabilities"));
 useEffect(()=>{void load()},[]);
 const caps=(data?.capabilities??[]).filter(c=>!initialWorkspace||c.workspace===initialWorkspace);
 async function submit(e:FormEvent, dryRun:boolean){e.preventDefault();setError("");setMessage("");let parsed:unknown;try{parsed=JSON.parse(payload)}catch{setError("Payload must be valid JSON");return}const key=idempotency||`vivito-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const r=await fetch("/api/vgroup/vivito/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({capabilityKey:capability,idempotencyKey:key,payload:parsed,dryRun})});const body=await r.json();if(!r.ok){setError(body?.error?.message||"Vivito request failed");return}setMessage(dryRun?"Preflight passed. Nothing was changed.":body.approvalRequired?"Task queued and is waiting for approval.":"Task executed.");setIdempotency(key);await load()}
 return <div style={{display:"grid",gap:18}}>
  <section style={{padding:20,border:"1px solid #2d3748",borderRadius:20,background:"rgba(255,255,255,.035)"}}><h2 style={{marginTop:0}}>Execution console</h2><p style={{color:"#9aa8ba",lineHeight:1.6}}>Vivito can only use registered capabilities. Sensitive actions stop for approval; Marketing execution stays locked until the controlled integration.</p><form style={{display:"grid",gap:10}} onSubmit={e=>void submit(e,false)}><select required value={capability} onChange={e=>setCapability(e.target.value)} style={{padding:12,borderRadius:12}}><option value="">Choose capability</option>{caps.map(c=><option key={c.key} value={c.key} disabled={!c.enabled}>{c.label} · {c.workspace} · {c.risk}{c.integrationRequired?" · integration required":""}</option>)}</select><textarea rows={8} value={payload} onChange={e=>setPayload(e.target.value)} spellCheck={false} style={{padding:12,borderRadius:12,fontFamily:"monospace"}}/><input value={idempotency} onChange={e=>setIdempotency(e.target.value)} placeholder="Idempotency key (auto-generated if empty)" style={{padding:12,borderRadius:12}}/><div style={{display:"flex",gap:9,flexWrap:"wrap"}}><button type="button" onClick={e=>void submit(e as unknown as FormEvent,true)} style={{padding:"11px 15px",borderRadius:12}}>Dry run</button><button type="submit" style={{padding:"11px 15px",borderRadius:12,fontWeight:900}}>Execute / Queue</button></div></form>{error&&<p style={{color:"#fca5a5"}}>{error}</p>}{message&&<p style={{color:"#86efac"}}>{message}</p>}</section>
  <section><h2>Recent Vivito tasks</h2><div style={{display:"grid",gap:8}}>{(data?.tasks??[]).map(t=><article key={t.id} style={{padding:14,border:"1px solid #273244",borderRadius:14,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span><b>{t.capability_key}</b><br/><small>{t.workspace_code} · {t.risk_level}</small></span><strong>{t.status}</strong></article>)}</div></section>
 </div>
}
