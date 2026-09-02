"use client";
import {useEffect,useState} from "react";

type N={id:string;title?:string;body?:string;is_read?:boolean;created_at?:string};
type Audit={id:string;action:string;entity_type:string;actor_email?:string;business_unit?:string;created_at?:string};
type Archived={id:string;entity_type:string;label:string;subtitle?:string;archived_at?:string};
type Employee={id:string;full_name?:string;email:string;business_unit?:string;roles?:string[];status?:"active"|"suspended"|"archived"};

export function GroupAdminPanel(){
  const[employees,setEmployees]=useState<Employee[]>([]);const[notifications,setNotifications]=useState<N[]>([]);const[audit,setAudit]=useState<Audit[]>([]);const[archive,setArchive]=useState<Archived[]>([]);const[error,setError]=useState("");
  const load=async()=>{try{const[e,n,a,r]=await Promise.all([fetch("/api/vgroup/admin/employees",{cache:"no-store"}),fetch("/api/vgroup/notifications",{cache:"no-store"}),fetch("/api/vgroup/admin/audit",{cache:"no-store"}),fetch("/api/vgroup/admin/archive",{cache:"no-store"})]);if(!e.ok||!n.ok||!a.ok||!r.ok)throw new Error("admin_load_failed");setEmployees((await e.json() as {employees?:Employee[]}).employees||[]);setNotifications((await n.json() as {notifications?:N[]}).notifications||[]);setAudit((await a.json() as {audit?:Audit[]}).audit||[]);setArchive((await r.json() as {archive?:Archived[]}).archive||[])}catch(x){setError(x instanceof Error?x.message:"admin_load_failed")}};
  useEffect(()=>{const timer=setTimeout(()=>{void load()},0);return()=>clearTimeout(timer)},[]);
  async function mark(id:string){await fetch(`/api/vgroup/notifications/${id}/read`,{method:"POST"});await load()}
  async function employeeStatus(id:string,status:"active"|"suspended"|"archived"){const r=await fetch(`/api/vgroup/admin/employees/${id}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(!r.ok){setError("employee_status_update_failed");return}await load()}
  async function restoreEmployee(id:string){const r=await fetch(`/api/vgroup/admin/employees/${id}/restore`,{method:"POST"});if(!r.ok){setError("employee_restore_failed");return}await load()}
  if(error)return <p style={{color:"#fca5a5"}}>{error}</p>;
  const box={padding:14,border:"1px solid #2d2d39",borderRadius:14} as const;
  return <div style={{display:"grid",gap:30}}>
    <section><h2>Employees <small style={{opacity:.6}}>({employees.length})</small></h2><div style={{display:"grid",gap:8}}>{employees.slice(0,50).map(e=><div key={e.id} style={{...box,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span><b>{e.full_name||e.email}</b><br/><small>{e.email} · {e.business_unit||"group"} · {(e.roles||[]).join(", ")||"No role"}</small></span><span style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><b>{e.status||"active"}</b>{e.status!=="suspended"?<button onClick={()=>employeeStatus(e.id,"suspended")}>Suspend</button>:<button onClick={()=>employeeStatus(e.id,"active")}>Reactivate</button>}{e.status!=="archived"?<button onClick={()=>employeeStatus(e.id,"archived")}>Archive</button>:<button onClick={()=>restoreEmployee(e.id)}>Restore</button>}</span></div>)}</div></section>
    <section><h2>Archive <small style={{opacity:.6}}>({archive.length})</small></h2><div style={{display:"grid",gap:8}}>{archive.length===0?<div style={box}>Archive is empty.</div>:archive.slice(0,50).map(x=><div key={`${x.entity_type}:${x.id}`} style={{...box,display:"flex",justifyContent:"space-between",gap:10}}><span><b>{x.label}</b><br/><small>{x.entity_type} · {x.subtitle||""}</small></span>{x.entity_type==="employee"?<button onClick={()=>restoreEmployee(x.id)}>Restore employee</button>:<small style={{opacity:.6}}>Archived record</small>}</div>)}</div></section>
    <section><h2>Notifications</h2><div style={{display:"grid",gap:8}}>{notifications.slice(0,30).map(n=><div key={n.id} style={{...box,display:"flex",justifyContent:"space-between",gap:12}}><span><b>{n.title||"Notification"}</b><br/><small>{n.body}</small></span>{!n.is_read?<button onClick={()=>mark(n.id)} style={{height:34}}>Mark read</button>:<span style={{opacity:.55}}>Read</span>}</div>)}</div></section>
    <section><h2>Audit Trail</h2><div style={{display:"grid",gap:8}}>{audit.slice(0,60).map(a=><div key={a.id} style={{...box,display:"grid",gridTemplateColumns:"minmax(140px,1fr) minmax(120px,1fr) auto",gap:10}}><b>{a.action}</b><span>{a.entity_type} · {a.business_unit||"group"}</span><small>{a.actor_email||"system"}</small></div>)}</div></section>
  </div>;
}
