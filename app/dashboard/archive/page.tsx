"use client";
import {useEffect,useState} from "react";

type Row={id:string;name:string;archived_at:string};
type Data={clients:Row[];tasks:Row[];leads:Row[]};
const EMPTY:Data={clients:[],tasks:[],leads:[]};

export default function ArchivePage(){
 const [data,setData]=useState<Data>(EMPTY),[role,setRole]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState("");
 async function load(){setLoading(true);setError("");try{const [r,sr]=await Promise.all([fetch("/api/lifecycle",{cache:"no-store"}),fetch("/api/auth/session",{cache:"no-store"})]);const d=await r.json().catch(()=>({})),s=await sr.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Could not load archive");setData({clients:d.clients||[],tasks:d.tasks||[],leads:d.leads||[]});setRole(String(s?.user?.role||""))}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function act(entity:"client"|"task"|"lead",row:Row,action:"restore"|"delete"){
  if(action==="delete"&&!confirm(`Permanently delete “${row.name}”? This cannot be undone.`))return;
  setBusy(`${entity}:${row.id}`);setError("");
  try{const r=await fetch("/api/lifecycle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,id:row.id,action})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Could not ${action} record`);await load()}catch(e:any){setError(e.message)}finally{setBusy("")}
 }
 const section=(title:string,entity:"client"|"task"|"lead",rows:Row[])=><div className="card"><div className="card-header"><div><p className="card-title">{title}</p><p className="page-subtitle">{rows.length} archived</p></div><span className="badge badge-gray">{rows.length}</span></div><div className="card-body-flush">{rows.length===0?<div className="empty-state"><p>Nothing archived here.</p></div>:<div className="responsive-table"><table className="data-table"><thead><tr><th>Name</th><th>Archived</th><th>Actions</th></tr></thead><tbody>{rows.map(x=>{const key=`${entity}:${x.id}`,canHardDelete=entity==="lead"?(role==="SUPER_ADMIN"||role==="SALES"):role==="SUPER_ADMIN";return <tr key={x.id}><td style={{fontWeight:700}}>{x.name}</td><td>{x.archived_at?new Date(x.archived_at).toLocaleString():"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-secondary btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"restore")}>Restore</button>{canHardDelete&&<button className="btn btn-danger btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"delete")}>{busy===key?"Working…":"Delete permanently"}</button>}</div></td></tr>})}</tbody></table></div>}</div></div>;
 return <div style={{display:"flex",flexDirection:"column",gap:18}}><div><h1 className="page-title">Archive Center</h1><p className="page-subtitle">Restore archived work or permanently delete records when business rules allow it.</p></div>{error&&<div className="card" role="alert" style={{padding:12,borderColor:"var(--red)",color:"var(--red)"}}>{error}</div>}{loading?<div className="card"><div className="empty-state"><p>Loading archive…</p></div></div>:<>{section("Clients","client",data.clients)}{section("Creative Tasks","task",data.tasks)}{section("Sales CRM Leads","lead",data.leads)}</>}</div>;
}
