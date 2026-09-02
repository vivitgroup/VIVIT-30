"use client";
import {useEffect,useState} from "react";

type PortalData={clients:any[];projects:any[];updates:any[];phases:any[];scope:any[]};
const money=(v:unknown,currency="EGP")=>`${Number(v??0).toLocaleString()} ${currency}`;

export function TechClientPortalPanel(){
  const[data,setData]=useState<PortalData>({clients:[],projects:[],updates:[],phases:[],scope:[]});
  const[loading,setLoading]=useState(true);const[error,setError]=useState("");
  useEffect(()=>{(async()=>{try{const r=await fetch("/api/vgroup/tech/client-portal",{cache:"no-store"});if(!r.ok)throw new Error("client_portal_load_failed");setData(await r.json())}catch(e){setError(e instanceof Error?e.message:"client_portal_load_failed")}finally{setLoading(false)}})()},[]);
  if(loading)return <p style={{opacity:.65}}>Loading client delivery data…</p>;
  if(error)return <p style={{color:"#fca5a5"}}>{error}</p>;
  return <div style={{display:"grid",gap:18}}>
    {data.projects.length===0?<div style={{padding:20,border:"1px solid #193650",borderRadius:18}}>No projects are currently assigned to this portal account.</div>:data.projects.map((p:any)=>{
      const phases=data.phases.filter((x:any)=>x.project_id===p.id);const scope=data.scope.filter((x:any)=>x.project_id===p.id);const updates=data.updates.filter((x:any)=>x.project_id===p.id);const remaining=Math.max(0,Number(p.total_billed??0)-Number(p.paid_amount??0));
      return <article key={p.id} style={{padding:20,border:"1px solid #193650",borderRadius:20,background:"rgba(66,173,245,.035)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:"0 0 5px"}}>{p.name}</h2><small style={{opacity:.65}}>{p.current_phase||"Planning"} · {p.status}</small></div><b>{Number(p.progress_percent??0)}%</b></div>
        <div style={{height:8,background:"#132536",borderRadius:999,margin:"14px 0",overflow:"hidden"}}><div style={{width:`${Math.min(100,Math.max(0,Number(p.progress_percent??0)))}%`,height:"100%",background:"#42adf5"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}><div><small>Total value</small><br/><b>{money(p.current_price,p.currency)}</b></div><div><small>Paid</small><br/><b>{money(p.paid_amount,p.currency)}</b></div><div><small>Remaining</small><br/><b>{money(remaining,p.currency)}</b></div><div><small>Target end</small><br/><b>{p.target_end||"—"}</b></div></div>
        <details><summary style={{cursor:"pointer",fontWeight:800}}>Delivery phases ({phases.length})</summary><div style={{display:"grid",gap:6,marginTop:9}}>{phases.map((x:any)=><div key={x.id}>{x.sequence}. {x.name} — {x.progress_percent}% · {x.status}</div>)}</div></details>
        <details><summary style={{cursor:"pointer",fontWeight:800}}>Approved scope ({scope.length})</summary><div style={{display:"grid",gap:6,marginTop:9}}>{scope.map((x:any)=><div key={x.id}>{x.title} · {x.status}</div>)}</div></details>
        <details><summary style={{cursor:"pointer",fontWeight:800}}>Client updates ({updates.length})</summary><div style={{display:"grid",gap:8,marginTop:9}}>{updates.map((x:any)=><div key={x.id}><b>{x.title}</b><br/><small>{x.body}</small></div>)}</div></details>
      </article>})}
  </div>;
}
