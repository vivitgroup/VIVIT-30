"use client";

import {useState} from "react";

type Message={who:"you"|"vivito";text:string;modelId?:string|null};

export function GroupVivitoChat({initialWorkspace="group"}:{initialWorkspace?:string}){
  const [workspace,setWorkspace]=useState(initialWorkspace);
  const [question,setQuestion]=useState("");
  const [busy,setBusy]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  async function send(text=question){
    const q=text.trim();if(!q||busy)return;setQuestion("");setBusy(true);setMessages(m=>[...m,{who:"you",text:q}]);
    try{
      const response=await fetch("/api/vgroup/vivito/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q,workspace}),cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      setMessages(m=>[...m,{who:"vivito",text:String(data.answer||data.error||"VIVITO could not complete the request."),modelId:data.modelId||null}]);
    }catch{setMessages(m=>[...m,{who:"vivito",text:"Connection interrupted. Please retry."}])}
    finally{setBusy(false)}
  }
  const quick=["Give me an executive pulse","What needs attention today?","Top 5 priority decisions","Summarize risks across my workspaces"];
  return <section style={{border:"1px solid #263244",borderRadius:28,background:"rgba(12,17,25,.92)",overflow:"hidden",boxShadow:"0 30px 90px rgba(0,0,0,.34)"}}>
    <div style={{padding:20,borderBottom:"1px solid #202b3a",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><b style={{fontSize:20}}>VIVITO Chat</b><div style={{fontSize:12,color:"#8da2ba",marginTop:4}}>Live AI · role-aware · workspace-scoped</div></div><select value={workspace} onChange={e=>setWorkspace(e.target.value)} style={{background:'#0a1018',color:'#fff',border:'1px solid #2c3a4f',borderRadius:12,padding:'10px 12px'}}><option value="group">Vivit Group</option><option value="marketing">Vivit Marketing</option><option value="tech">Vivit Technology</option><option value="hospitality">Vivit Hospitality</option></select></div>
    <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,borderBottom:"1px solid #202b3a"}}>{quick.map(q=><button key={q} onClick={()=>send(q)} disabled={busy} style={{textAlign:'left',padding:'12px 14px',borderRadius:14,border:'1px solid #2a3648',background:'#111823',color:'#dce8f7',cursor:'pointer'}}>{q} ↗</button>)}</div>
    <div style={{minHeight:360,maxHeight:560,overflowY:'auto',padding:18,display:'flex',flexDirection:'column',gap:14}}>{messages.length===0?<div style={{margin:'auto',textAlign:'center',color:'#75869a'}}><div style={{fontSize:30,fontWeight:900,color:'#f8fbff'}}>Ask VIVITO anything.</div><p style={{maxWidth:520,lineHeight:1.6}}>This is the AI assistant. Governed execution stays separate and only runs after an explicit command and permission check.</p></div>:messages.map((m,i)=><div key={i} style={{alignSelf:m.who==='you'?'flex-end':'flex-start',maxWidth:'86%'}}><div style={{fontSize:10,letterSpacing:'.14em',color:'#72849b',marginBottom:5}}>{m.who==='you'?'YOU':'VIVITO'}</div><div style={{whiteSpace:'pre-wrap',lineHeight:1.65,padding:'13px 15px',borderRadius:16,background:m.who==='you'?'linear-gradient(135deg,#17345f,#244d87)':'#151c27',border:'1px solid #2a3648'}}>{m.text}</div>{m.modelId&&<div style={{fontSize:10,color:'#5f7289',marginTop:5}}>model: {m.modelId}</div>}</div>)}{busy&&<div style={{color:'#8bd3ff'}}>VIVITO is thinking…</div>}</div>
    <div style={{padding:16,borderTop:'1px solid #202b3a',display:'flex',gap:10}}><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="Ask, teach, or command VIVITO…" rows={2} style={{flex:1,resize:'none',borderRadius:16,border:'1px solid #2c3a4f',background:'#080d14',color:'#fff',padding:'13px 14px',fontSize:15}}/><button onClick={()=>send()} disabled={busy||!question.trim()} style={{minWidth:96,border:0,borderRadius:16,background:'linear-gradient(135deg,#2385ff,#56c8ff)',color:'#06111f',fontWeight:950,cursor:'pointer'}}>Send</button></div>
  </section>;
}
