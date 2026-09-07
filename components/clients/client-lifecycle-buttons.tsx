"use client";
import {useState} from "react";

function messageOf(body:unknown,fallback:string){if(body&&typeof body==="object"&&"error" in body){const value=(body as {error?:unknown}).error;if(typeof value==="string")return value;if(value&&typeof value==="object"&&"message" in value)return String((value as {message?:unknown}).message||fallback)}return fallback}
export function ClientLifecycleButtons({id,name,canArchive,canDelete}:{id:string;name:string;canArchive:boolean;canDelete:boolean}){
 const[busy,setBusy]=useState(false);
 async function post(action:"archive"|"delete"){const r=await fetch("/api/lifecycle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity:"client",id,action})}),body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(messageOf(body,`Could not ${action} client.`));return body}
 async function archive(){if(!confirm(`Archive “${name}”? It will move to Archive Center and can be restored.`))return;setBusy(true);try{await post("archive");window.location.reload()}catch(e){alert(e instanceof Error?e.message:"Could not archive client.")}finally{setBusy(false)}}
 async function remove(){if(!confirm(`Permanently delete “${name}”? VIVIT will preserve the record instead when linked history exists.`))return;setBusy(true);try{try{await post("archive")}catch(e){const text=e instanceof Error?e.message:"";if(!/already archived/i.test(text))throw e}await post("delete");window.location.reload()}catch(e){alert(`${e instanceof Error?e.message:"Could not delete client."}\n\nThe client may have been moved to Archive Center to preserve linked history.`);window.location.reload()}finally{setBusy(false)}}
 return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{canArchive&&<button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={archive}>Archive</button>}{canDelete&&<button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>Delete</button>}</div>
}
