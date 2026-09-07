"use client";
import {useState} from "react";

export function ClientLifecycleButtons({id,name,canDelete}:{id:string;name:string;canDelete:boolean}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function request(action:"archive"|"delete"){const r=await fetch("/api/lifecycle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity:"client",id,action})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Could not ${action} client`)}
 async function archive(){if(!confirm(`Archive “${name}”?`))return;setBusy(true);setMessage("");try{await request("archive");window.location.reload()}catch(e){setMessage(e instanceof Error?e.message:"Archive failed");setBusy(false)}}
 async function remove(){if(!confirm(`Permanently delete “${name}”? If linked history exists it will remain archived.`))return;setBusy(true);setMessage("");try{try{await request("archive")}catch(e){if(!/already archived/i.test(e instanceof Error?e.message:""))throw e}await request("delete");window.location.reload()}catch(e){setMessage(e instanceof Error?e.message:"Delete failed");setBusy(false)}}
 return <div style={{display:"grid",gap:4,minWidth:0}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>void archive()}>Archive</button>{canDelete&&<button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={()=>void remove()}>Delete</button>}</div>{message&&<small style={{color:"var(--red)",maxWidth:220,overflowWrap:"anywhere"}}>{message}</small>}</div>
}
