"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignupPage() {
  const [form,setForm]=useState({name:"",email:"",password:"",confirmPassword:"",requestedRole:"CLIENT",approvalNote:"",otp:""});
  const [loading,setLoading]=useState(false), [error,setError]=useState(""), [sent,setSent]=useState(false), [otpSent,setOtpSent]=useState(false);
  const [otpRequired,setOtpRequired]=useState(true), [otpStatusLoaded,setOtpStatusLoaded]=useState(false);
  useEffect(()=>{fetch("/api/signup/otp").then(r=>r.json()).then(d=>setOtpRequired(Boolean(d.configured))).finally(()=>setOtpStatusLoaded(true))},[]);
  const update=(key:string,value:string)=>{setForm(v=>({...v,[key]:value}));setError("");};
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(form.password.length<8)return setError("Password must be at least 8 characters.");
    if(form.password!==form.confirmPassword)return setError("Passwords do not match.");
    setLoading(true);
    try{const res=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not send your request.");setSent(true);}catch(e:any){setError(e.message);}finally{setLoading(false);}
  }
  async function sendOtp(){
    if(!/^[a-z0-9._%+-]+@gmail\.com$/i.test(form.email))return setError("Use a valid Gmail address first.");
    setLoading(true);setError("");
    try{const res=await fetch("/api/signup/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.email})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not send verification code.");setOtpSent(true);}catch(e:any){setError(e.message);}finally{setLoading(false);}
  }
  return <main className="access-layout" style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"minmax(300px,.85fr) minmax(420px,1.15fr)",background:"#F8F5ED",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section className="login-brand-panel" style={{padding:48,background:"linear-gradient(150deg,#201F20 0%,#7D1820 45%,#C52A31 100%)",color:"white",display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:360,height:360,borderRadius:"50%",background:"#244D87",right:-190,top:70,opacity:.55}}/><div style={{position:"absolute",width:230,height:230,borderRadius:"50%",background:"#F4B223",left:-130,bottom:60,opacity:.8}}/>
      <div style={{position:"relative",zIndex:1}}><div style={{display:"inline-flex",background:"white",borderRadius:18,padding:"12px 20px",boxShadow:"0 18px 50px #0004"}}><Image src="/vivit-logo.png" alt="VIVIT Marketing" width={190} height={105} style={{objectFit:"contain"}} priority/></div></div>
      <div style={{position:"relative",zIndex:1,maxWidth:470}}><p style={{fontSize:13,fontWeight:800,letterSpacing:2,color:"#F4B223",marginBottom:14}}>VIVIT CLIENT PORTAL</p><h1 style={{fontSize:"clamp(34px,4vw,58px)",lineHeight:1.04,margin:0,fontWeight:900}}>Your work.<br/>One secure view.</h1><p style={{fontSize:16,lineHeight:1.8,color:"#F8EDED",marginTop:20}}>Create your client portal request. Employee access is assigned separately by the Super Admin.</p></div>
      <p style={{position:"relative",zIndex:1,fontSize:12,color:"#ffffff99"}}>VIVIT Marketing · Marketing brings it to the world.</p>
    </section>
    <section style={{padding:"48px 7vw",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"100%",maxWidth:650}}>
      {sent?<div style={{background:"white",border:"1px solid #E9DFC9",borderRadius:24,padding:48,boxShadow:"0 20px 70px #251b1020",textAlign:"center"}}><div style={{width:72,height:72,borderRadius:"50%",background:"#EAF3EC",display:"grid",placeItems:"center",fontSize:34,margin:"0 auto 20px"}}>✓</div><h1 style={{fontSize:30,color:"#201F20",marginBottom:12}}>Request sent</h1><p style={{color:"#6A6258",lineHeight:1.7}}>Your account is pending Super Admin approval. You will be able to sign in after it is approved.</p><Link href="/login" style={{display:"inline-block",marginTop:26,padding:"13px 24px",borderRadius:12,background:"#C52A31",color:"white",textDecoration:"none",fontWeight:800}}>Back to sign in</Link></div>:
      <><p style={{fontSize:13,fontWeight:800,letterSpacing:1.5,color:"#C52A31"}}>CLIENT ACCESS REQUEST</p><h2 style={{fontSize:36,color:"#171717",margin:"8px 0",fontWeight:900}}>Create your account</h2><p style={{color:"#70685F",marginBottom:28}}>Verify your Gmail and request access to your company portal.</p>
      <form onSubmit={submit} style={{display:"grid",gap:16}}>{error&&<div style={{padding:"12px 14px",borderRadius:10,background:"#FFF0F0",border:"1px solid #F0B8BB",color:"#A51F27"}}>{error}</div>}
        <label style={label}>FULL NAME<input className="vivit-input" required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Your full name"/></label>
        <label style={label}>GMAIL ADDRESS<div style={{display:"grid",gridTemplateColumns:otpRequired?"1fr auto":"1fr",gap:10}}><input className="vivit-input" type="email" required value={form.email} onChange={e=>{update("email",e.target.value);setOtpSent(false)}} placeholder="yourname@gmail.com"/>{otpRequired&&<button type="button" onClick={sendOtp} disabled={loading||!form.email} className="auth-secondary">{otpSent?"Resend code":"Send OTP"}</button>}</div></label>
        {otpStatusLoaded&&!otpRequired&&<div style={{padding:"11px 13px",borderRadius:12,background:"#F8F1DF",color:"#75531B",fontSize:12,fontWeight:700}}>Email OTP is being activated. You can request access now; the Super Admin will verify and approve your Gmail account.</div>}
        {otpRequired&&otpSent&&<label style={label}>6-DIGIT VERIFICATION CODE<input className="vivit-input otp-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={form.otp} onChange={e=>update("otp",e.target.value.replace(/\D/g,""))} placeholder="000000"/><span style={{fontSize:11,color:"#7A7167"}}>The code expires in 10 minutes.</span></label>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><label style={label}>PASSWORD<input className="vivit-input" type="password" required value={form.password} onChange={e=>update("password",e.target.value)} placeholder="8+ characters"/></label><label style={label}>CONFIRM PASSWORD<input className="vivit-input" type="password" required value={form.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} placeholder="Repeat password"/></label></div>
        <div style={{padding:"13px 15px",borderRadius:12,background:"#EEF3FA",border:"1px solid #C9D8EC",color:"#244D87",fontSize:13,lineHeight:1.6}}><strong>Client portal access</strong><br/>Your Super Admin will link this login to the correct company before activation.</div>
        <label style={label}>WHY DO YOU NEED THIS ACCESS? (OPTIONAL)<textarea className="vivit-input" rows={3} value={form.approvalNote} onChange={e=>update("approvalNote",e.target.value)} placeholder="Team, department, or a short note for the admin" style={{resize:"vertical"}}/></label>
        <button disabled={loading||(otpRequired&&(!otpSent||form.otp.length!==6))} style={{padding:15,border:0,borderRadius:12,background:"linear-gradient(100deg,#A51F27,#C52A31 55%,#F4B223)",color:"white",fontSize:15,fontWeight:900,cursor:"pointer",opacity:(loading||(otpRequired&&(!otpSent||form.otp.length!==6))) ? 0.65 : 1}}>{loading?"Submitting…":otpRequired?"Verify email & request access →":"Request access →"}</button>
      </form><p style={{textAlign:"center",marginTop:20,color:"#746C63",fontSize:13}}>Already approved? <Link href="/login" style={{color:"#244D87",fontWeight:800}}>Sign in</Link></p></>}
    </div></section>
  </main>;
}
const label={display:"grid",gap:7,fontSize:12,fontWeight:800,color:"#39342F"} as const;
