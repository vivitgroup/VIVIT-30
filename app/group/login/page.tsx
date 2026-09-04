"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";

type Workspace="group"|"tech"|"hospitality";
function selectedWorkspace():Workspace{if(typeof window==="undefined")return"group";const raw=new URLSearchParams(window.location.search).get("workspace");return raw==="tech"||raw==="hospitality"?raw:"group"}

export default function GroupLogin(){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");
    const workspace=selectedWorkspace();
    const data=new FormData(event.currentTarget);
    const response=await fetch('/api/vgroup/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),password:data.get('password')}),cache:'no-store'});
    if(response.ok){window.location.replace(`/group/enter/${workspace}`);return}
    const payload=await response.json().catch(()=>({error:'Unable to sign in'}));
    setError(String(payload.error||'Unable to sign in'));setLoading(false);
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'radial-gradient(circle at 75% 20%,rgba(46,168,255,.14),transparent 30%),radial-gradient(circle at 20% 80%,rgba(178,138,59,.12),transparent 28%),#080b10',color:'#f8fafc',fontFamily:'Inter,system-ui,sans-serif'}}><form onSubmit={submit} style={{width:'min(430px,100%)',padding:30,borderRadius:28,border:'1px solid #263244',background:'rgba(13,18,27,.92)',boxShadow:'0 34px 90px rgba(0,0,0,.42)'}}><div style={{fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#8da2ba'}}>WORKSPACE ACCESS</div><h1 style={{fontSize:36,letterSpacing:'-.045em',margin:'10px 0 8px'}}>VIVIT Workspace</h1><p style={{color:'#91a0b3',lineHeight:1.6,margin:'0 0 28px'}}>Sign in to the workspace you selected. Your selected destination is preserved and access is checked against live permissions.</p><label style={{display:'grid',gap:8,fontSize:12,fontWeight:800,marginBottom:16}}>EMAIL<input name="email" type="email" autoComplete="email" required style={{height:48,borderRadius:14,border:'1px solid #2c3a4f',background:'#0c121b',color:'#fff',padding:'0 14px',fontSize:15}}/></label><label style={{display:'grid',gap:8,fontSize:12,fontWeight:800,marginBottom:18}}>PASSWORD<input name="password" type="password" autoComplete="current-password" required style={{height:48,borderRadius:14,border:'1px solid #2c3a4f',background:'#0c121b',color:'#fff',padding:'0 14px',fontSize:15}}/></label>{error&&<div style={{padding:12,borderRadius:12,background:'rgba(220,38,38,.15)',border:'1px solid rgba(248,113,113,.35)',color:'#fecaca',fontSize:13,marginBottom:16}}>{error}</div>}<button disabled={loading} style={{width:'100%',height:50,border:0,borderRadius:14,background:'linear-gradient(90deg,#b9964f,#49b8ff)',color:'#071018',fontWeight:950,fontSize:14,cursor:loading?'wait':'pointer'}}>{loading?'Signing in…':'Enter selected workspace'}</button><div style={{marginTop:18,textAlign:'center'}}><Link href="/" style={{fontSize:12,color:'#8da2ba',textDecoration:'none'}}>← Choose another workspace</Link></div></form></main>;
}
