"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const inputStyle={width:"100%",padding:"12px 14px",borderRadius:14,border:"1px solid #2a3342",background:"#0f141d",color:"#f8fafc"};
const buttonStyle={padding:"12px 16px",borderRadius:14,border:"1px solid #2f6fb7",background:"linear-gradient(135deg,#1d4ed8,#38bdf8)",color:"white",fontWeight:900,cursor:"pointer"};

export default function BoardControls(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function send(payload:Record<string,unknown>){
    setBusy(true);setMessage("");
    try{
      const res=await fetch("/api/vgroup/board/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
      const body=await res.json().catch(()=>({})) as {error?:string};
      if(!res.ok)throw new Error(body.error||"Operation failed");
      setMessage("Saved");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Operation failed");}
    finally{setBusy(false);}
  }
  return <section style={{marginTop:22,padding:20,border:"1px solid #242a35",borderRadius:24,background:"rgba(255,255,255,.025)"}}>
    <div style={{fontSize:12,letterSpacing:".16em",fontWeight:900,color:"#9cc9ff",marginBottom:14}}>BOARD CONTROLS</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
      <form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await send({action:"decision_create",title:f.get("title"),businessUnit:f.get("businessUnit"),decisionType:f.get("decisionType"),decisionText:f.get("decisionText")});e.currentTarget.reset();}} style={{display:"grid",gap:10}}>
        <strong>New board decision</strong>
        <input name="title" required placeholder="Decision title" style={inputStyle}/>
        <select name="businessUnit" defaultValue="group" style={inputStyle}><option value="group">Whole Group</option><option value="marketing">Marketing</option><option value="tech">Technology</option><option value="hospitality">Hospitality</option></select>
        <select name="decisionType" defaultValue="STRATEGIC" style={inputStyle}><option>STRATEGIC</option><option>FINANCIAL</option><option>OPERATIONAL</option><option>RISK</option><option>PEOPLE</option><option>INVESTMENT</option></select>
        <textarea name="decisionText" placeholder="Decision / rationale" rows={3} style={inputStyle}/>
        <button disabled={busy} style={buttonStyle}>Create decision</button>
      </form>
      <form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await send({action:"action_create",title:f.get("title"),businessUnit:f.get("businessUnit"),priority:f.get("priority"),dueAt:f.get("dueAt")});e.currentTarget.reset();}} style={{display:"grid",gap:10}}>
        <strong>New board action</strong>
        <input name="title" required placeholder="Action item" style={inputStyle}/>
        <select name="businessUnit" defaultValue="group" style={inputStyle}><option value="group">Whole Group</option><option value="marketing">Marketing</option><option value="tech">Technology</option><option value="hospitality">Hospitality</option></select>
        <select name="priority" defaultValue="HIGH" style={inputStyle}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
        <input name="dueAt" type="date" style={inputStyle}/>
        <button disabled={busy} style={buttonStyle}>Create action</button>
      </form>
    </div>
    {message?<div style={{marginTop:12,fontSize:13,color:message==="Saved"?"#86efac":"#fda4af"}}>{message}</div>:null}
  </section>;
}
