"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

type Owner={id:string;full_name:string;email:string|null;phone:string|null;status:string;properties:number};
const field:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",borderRadius:12,border:"1px solid #4a3d25",background:"#13110d",color:"#f8f4ea"};
const button:React.CSSProperties={border:0,borderRadius:12,padding:"10px 13px",fontWeight:900,cursor:"pointer",background:"#d9be7d",color:"#17130c"};

export function OwnersManager({initialOwners,canCreate,canUpdate}:{initialOwners:Owner[];canCreate:boolean;canUpdate:boolean}){
  const router=useRouter();
  const [owners,setOwners]=useState(initialOwners);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function createOwner(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/vgroup/hospitality/owners",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:form.get("fullName"),email:form.get("email"),phone:form.get("phone")})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(String(body.error?.message??body.error??"Owner creation failed"));setBusy(false);return}
    setOwners(current=>[{...body.owner,properties:0},...current]);event.currentTarget.reset();setMessage("Owner created");setBusy(false);router.refresh();
  }
  async function updateOwner(owner:Owner,patch:Partial<Owner>){
    setBusy(true);setMessage("");
    const next={...owner,...patch};
    const response=await fetch("/api/vgroup/hospitality/owners",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:owner.id,fullName:next.full_name,email:next.email,phone:next.phone,status:next.status})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(String(body.error?.message??body.error??"Owner update failed"));setBusy(false);return}
    setOwners(current=>current.map(item=>item.id===owner.id?{...item,...body.owner}:item));setMessage("Owner updated");setBusy(false);router.refresh();
  }
  return <div style={{display:"grid",gap:20}}>
    {canCreate?<form onSubmit={createOwner} style={{padding:20,border:"1px solid #4a3a1c",borderRadius:20,display:"grid",gap:12}}><h2 style={{margin:0}}>Add owner</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}><input name="fullName" required minLength={2} placeholder="Full name" style={field}/><input name="email" type="email" placeholder="Email" style={field}/><input name="phone" placeholder="Phone" style={field}/></div><button disabled={busy} style={button}>{busy?"Saving…":"Create owner"}</button></form>:null}
    {message?<div style={{padding:12,border:"1px solid #4a3a1c",borderRadius:12}}>{message}</div>:null}
    <section style={{display:"grid",gap:10}}>{owners.map(owner=><article key={owner.id} style={{padding:16,border:"1px solid #4a3a1c",borderRadius:16,display:"grid",gap:10}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>{owner.full_name}</strong><div style={{fontSize:12,opacity:.7,marginTop:4}}>{owner.email||"No email"} · {owner.phone||"No phone"} · {owner.properties} properties</div></div><b>{owner.status}</b></div>{canUpdate?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}><input defaultValue={owner.full_name} onBlur={e=>{if(e.target.value.trim()&&e.target.value.trim()!==owner.full_name)void updateOwner(owner,{full_name:e.target.value.trim()})}} style={field}/><input type="email" defaultValue={owner.email??""} onBlur={e=>{const value=e.target.value.trim()||null;if(value!==owner.email)void updateOwner(owner,{email:value})}} style={field}/><input defaultValue={owner.phone??""} onBlur={e=>{const value=e.target.value.trim()||null;if(value!==owner.phone)void updateOwner(owner,{phone:value})}} style={field}/><select value={owner.status} onChange={e=>void updateOwner(owner,{status:e.target.value})} style={field}><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></div>:null}</article>)}{owners.length===0?<p style={{opacity:.7}}>No owners yet.</p>:null}</section>
  </div>;
}
