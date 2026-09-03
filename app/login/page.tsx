"use client";
import {signIn} from "next-auth/react";
import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import "./login-experience.css";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const login=async(e?:React.FormEvent)=>{
    e?.preventDefault();
    if(!email||!password)return;
    setLoading(true);
    setError("");
    try{
      // Group-native identities authenticate against the isolated Vivit Group
      // runtime first. Successful Group auth lands on the four-workspace selector.
      const groupResponse=await fetch("/api/vgroup/auth/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password}),
        cache:"no-store",
      });
      if(groupResponse.ok){
        window.location.replace("/group");
        return;
      }

      // Marketing identities use NextAuth. After the cookie is committed, return
      // through / so the server chooses the correct destination by the live role:
      // Super Admin -> /group, regular Marketing roles -> their existing home.
      const res=await signIn("credentials",{email,password,redirect:false});
      if(res?.error){
        setError("Email or password is incorrect.");
        setLoading(false);
        return;
      }
      if(!res?.ok){
        setError("Could not start your session. Please try again.");
        setLoading(false);
        return;
      }
      window.location.replace("/");
    }catch{
      setError("Could not start your session. Please try again.");
      setLoading(false);
    }
  };

  return <main className="vivit-login"><section className="vivit-login-world"><div className="vivit-login-grid"/><div className="vivit-login-glow glow-a"/><div className="vivit-login-glow glow-b"/><div className="vivit-login-brand"><div className="vivit-login-lockup"><Image src="/vivit-mark.png" alt="VIVIT" width={92} height={78} priority/><div><b>VIVIT</b><span>MARKETING ERP</span></div></div><p className="vivit-login-kicker">VIVIT OPERATING SYSTEM</p><h1>One business.<br/>One clear view.</h1><p className="vivit-login-line">Clients, campaigns, creative and daily operations — connected in one workspace.</p><div className="vivit-login-pulse"><span>LIVE OPERATIONS</span><i/><span>ROLE AWARE</span><i/><span>ONE WORKSPACE</span></div></div></section><section className="vivit-login-panel"><div className="vivit-login-form"><p className="vivit-login-eyebrow">SECURE ACCESS</p><h2>Welcome back.</h2><p className="vivit-login-sub">Sign in to continue to your VIVIT workspace.</p><form onSubmit={login}>{error&&<div className="vivit-login-error" role="alert">{error}</div>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@vivitgroup.com" autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password"/></label><div className="vivit-login-meta"><Link href="/forgot-password">Forgot password?</Link></div><button disabled={loading}>{loading?"Opening workspace…":"Enter VIVIT"}<span>→</span></button></form><p className="vivit-login-request">Need access? <Link href="/signup">Request an account</Link></p><div className="vivit-login-security"><span>●</span> Protected workspace · role-based access · audited actions</div></div></section></main>;
}
