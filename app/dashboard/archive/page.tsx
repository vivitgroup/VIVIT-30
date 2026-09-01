"use client";
import {useCallback,useEffect,useState} from "react";

type Row={id:string;name:string;archived_at:string;actor_name?:string|null};
type Entity="client"|"task"|"lead"|"campaign";
type Data={clients:Row[];tasks:Row[];leads:Row[];campaigns:Row[]};
type LifecycleResponse={error?:string;clients?:Row[];tasks?:Row[];leads?:Row[];campaigns?:Row[]};
const EMPTY:Data={clients:[],tasks:[],leads:[],campaigns:[]};
const errorText=(value:unknown)=>value instanceof Error?value.message:"Unexpected error";

export default function ArchivePage(){
 const [data,setData]=useState<Data>(EMPTY),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/lifecycle",{cache:"no-store"}),d=(await r.json().catch(()=>({}))) as LifecycleResponse;if(!r.ok)throw new Error(d.error||"Could not load archive");setData({clients:d.clients||[],tasks:d.tasks||[],leads:d.leads||[],campaigns:d.campaigns||[]})}catch(e){setError(errorText(e))}finally{setLoading(false)}},[]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);
 async function act(entity:Entity,row:Row,action:"restore"|"delete"){
  if(action==="delete"&&!confirm(`Move “${row.name}” to Delete Center?`))return;
  setBusy(`${entity}:${row.id}`);setError("");try{const r=await fetch("/api/lifecycle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,id:row.id,action})}),d=(await r.json().catch(()=>({}))) as LifecycleResponse;if(!r.ok)throw new Error(d.error||`Could not ${action} record`);await load()}catch(e){setError(errorText(e))}finally{setBusy("")}
 }
 const section=(title:string,entity:Entity,items:Row[])=><div className="card"><div className="card-header"><div><p className="card-title">{title}</p><p className="page-subtitle">{items.length} archived</p></div><span className="badge badge-gray">{items.length}</span></div><div className="card-body-flush">{items.length===0?<div className="empty-state"><p>Nothing archived here.</p></div>:<div className="responsive-table"><table className="data-table"><thead><tr><th>Name</th><th>Archived by</th><th>Archived</th><th>Actions</th></tr></thead><tbody>{items.map(x=>{const key=`${entity}:${x.id}`;return <tr key={x.id}><td style={{fontWeight:700}}>{x.name}</td><td>{x.actor_name||"—"}</td><td>{x.archived_at?new Date(x.archived_at).toLocaleString():"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-secondary btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"restore")}>Restore</button><button className="btn btn-danger btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"delete")}>{busy===key?"Working…":"Delete"}</button></div></td></tr>})}</tbody></table></div>}</div></div>;
 return <div style={{display:"flex",flexDirection:"column",gap:18}}><div><h1 className="page-title">Archive Center</h1><p className="page-subtitle">Every employee sees the items they archived. Super Admin sees the full workspace archive with the actor name.</p></div>{error&&<div className="card" role="alert" style={{padding:12,borderColor:"var(--red)",color:"var(--red)"}}>{error}</div>}{loading?<div className="card"><div className="empty-state"><p>Loading archive…</p></div></div>:<>{section("Clients","client",data.clients)}{section("Creative Tasks","task",data.tasks)}{section("Campaigns","campaign",data.campaigns)}{section("Sales CRM Leads","lead",data.leads)}</>}</div>;
}
