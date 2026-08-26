"use client";
import {signIn} from "next-auth/react";
import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import "./login-experience.css";

export default function LoginPage(){
 const[email,setEmail]=useState("");
 const[password,setPassword]=useState("");
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState("");
 const login=async(e?:React.FormEvent)=>{e?.preventDefault();if(!email||!password)return;setLoading(true);setError("");const res=await signIn("credentials",{email,password,redirect:false});if(res?.error){setError("Email or password is incorrect.");setLoading(false)}else window.location.href="/apps"};
 return <main className="vivit-login">
  <section className="vivit-login-world" aria-label="VIVIT operating system">
   <div className="vivit-login-grid"/><div className="vivit-login-glow glow-a"/><div className="vivit-login-glow glow-b"/>
   <div className="vivit-login-brand">
    <div className="vivit-login-logo"><Image src="/vivit-logo.png" alt="VIVIT" width={196} height={128} priority style={{objectFit:"contain"}}/></div>
    <p className="vivit-login-kicker">VIVIT OPERATING SYSTEM</p>
    <h1>See the business.<br/>Move with clarity.</h1>
    <p className="vivit-login-line">Clients, campaigns, creative, finance and daily operations in one live command center.</p>
    <div className="vivit-login-pulse"><span>LIVE OPERATIONS</span><i/><span>ROLE AWARE</span><i/><span>ONE WORKSPACE</span></div>
   </div>
  </section>
  <section className="vivit-login-panel"><div className="vivit-login-form"><p className="vivit-login-eyebrow">SECURE ACCESS</p><h2>Welcome back.</h2><p className="vivit-login-sub">Sign in to continue to your VIVIT workspace.</p><form onSubmit={login}>{error&&<div className="vivit-login-error">{error}</div>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@vivitgroup.com" autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password"/></label><div className="vivit-login-meta"><Link href="/forgot-password">Forgot password?</Link></div><button disabled={loading}>{loading?"Opening workspace…":"Enter VIVIT"}<span>→</span></button></form><p className="vivit-login-request">Need access? <Link href="/signup">Request an account</Link></p><div className="vivit-login-security"><span>●</span> Protected workspace · role-based access · audited actions</div></div></section>
 </main>
}
