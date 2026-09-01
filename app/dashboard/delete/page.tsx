"use client";
import {useCallback,useEffect,useState} from "react";

type Row={id:string;name:string;deleted_at:string;actor_name?:string|null};
type Entity="client"|"task"|"lead"|"campaign";
type Data={clients:Row[];tasks:Row[];leads:Row[];campaigns:Row[]};
const EMPTY:Data={clients:[],tasks:[],leads:[],campaigns:[]};
export default function DeleteCenterPage(){
 const [data,setData]=useState<Data>(EMPTY),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/lifecycle?view=deleted",{cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Could not load Delete Center");setData({clients:d.clients||[],tasks:d.tasks||[],leads:d.leads||[],campaigns:d.campaigns||[]})}catch(e){setError(e instanceof Error?e.message:"Could not load Delete Center")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function restore(entity:Entity,row:Row){setBusy(`${entity}:${row.id}`);setError("");try{const r=await fetch("/api/lifecycle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,id:row.id,action:"restore_deleted"})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Could not restore record");await load()}catch(e){setError(e instanceof Error?e.message:"Could not restore record")}finally{setBusy("")}}
 const section=(title:string,entity:Entity,items:Row[])=><section className="card"><div className="card-header"><div><p className="card-title">{title}</p><p className="page-subtitle">{items.length} deleted</p></div></div><div className="card-body-flush">{!items.length?<div className="empty-state"><p>No deleted items.</p></div>:<div className="responsive-table"><table className="data-table"><thead><tr><th>Name</th><th>Deleted by</th><th>Deleted at</th><th>Action</th></tr></thead><tbody>{items.map(row=><tr key={row.id}><td><b>{row.name}</b></td><td>{row.actor_name||"Unknown user"}</td><td>{row.deleted_at?new Date(row.deleted_at).toLocaleString():"—"}</td><td><button className="btn btn-secondary btn-sm" disabled={busy===`${entity}:${row.id}`} onClick={()=>restore(entity,row)}>Restore</button></td></tr>)}</tbody></table></div>}</div></section>;
 return <div style={{display:"grid",gap:18}}><div><h1 className="page-title">Delete Center</h1><p className="page-subtitle">Super Admin audit view for deleted clients, tasks, campaigns and leads, including who deleted each record.</p></div>{error&&<div className="form-error">{error}</div>}{loading?<div className="card"><div className="empty-state">Loading deleted records…</div></div>:<>{section("Clients","client",data.clients)}{section("Creative Tasks","task",data.tasks)}{section("Campaigns","campaign",data.campaigns)}{section("Sales Leads","lead",data.leads)}</>}</div>;
}
