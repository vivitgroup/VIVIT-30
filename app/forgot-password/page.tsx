"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
export default function ForgotPassword(){
 const [email,setEmail]=useState(""),[loading,setLoading]=useState(false),[sent,setSent]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);await fetch("/api/password/forgot",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});setSent(true);setLoading(false);}
 return <main className="auth-simple"><div className="auth-simple-card"><Image src="/vivit-logo.png" alt="VIVIT" width={190} height={105} style={{objectFit:"contain",margin:"0 auto 24px"}}/>{sent?<><div className="auth-success">✓</div><h1>Check your email</h1><p>If an active account exists, we sent a secure link that expires in 30 minutes.</p><Link href="/login" className="auth-primary">Back to sign in</Link></>:<><h1>Forgot password?</h1><p>Enter your work email and we’ll send you a secure reset link.</p><form onSubmit={submit}><input className="vivit-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@vivitgroup.com"/><button className="auth-primary" disabled={loading}>{loading?"Sending…":"Send reset link →"}</button></form><Link href="/login" className="auth-back">← Back to sign in</Link></>}</div></main>;
}
