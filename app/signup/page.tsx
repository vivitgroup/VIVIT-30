"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const roles = [
  ["ACCOUNT_MANAGER","Account Manager","إدارة العملاء والمشروعات"], ["MEDIA_BUYER","Media Buyer","إدارة الحملات والميزانيات"],
  ["CREATOR","Creator","المحتوى والتصميمات"], ["ACCOUNTANT","Accountant","الحسابات والفواتير"],
  ["SALES","Sales","المبيعات والعملاء المحتملون"], ["CLIENT","Client","بوابة العميل والمتابعة"],
];

export default function SignupPage() {
  const [form,setForm]=useState({name:"",email:"",password:"",confirmPassword:"",requestedRole:"",approvalNote:""});
  const [loading,setLoading]=useState(false), [error,setError]=useState(""), [sent,setSent]=useState(false);
  const update=(key:string,value:string)=>{setForm(v=>({...v,[key]:value}));setError("");};
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(form.password.length<8)return setError("Password must be at least 8 characters.");
    if(form.password!==form.confirmPassword)return setError("Passwords do not match.");
    setLoading(true);
    try{const res=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not send your request.");setSent(true);}catch(e:any){setError(e.message);}finally{setLoading(false);}
  }
  return <main className="access-layout" style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"minmax(300px,.85fr) minmax(420px,1.15fr)",background:"#F8F5ED",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section className="login-brand-panel" style={{padding:48,background:"linear-gradient(150deg,#201F20 0%,#7D1820 45%,#C52A31 100%)",color:"white",display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:360,height:360,borderRadius:"50%",background:"#244D87",right:-190,top:70,opacity:.55}}/><div style={{position:"absolute",width:230,height:230,borderRadius:"50%",background:"#F4B223",left:-130,bottom:60,opacity:.8}}/>
      <div style={{position:"relative",zIndex:1}}><div style={{display:"inline-flex",background:"white",borderRadius:18,padding:"12px 20px",boxShadow:"0 18px 50px #0004"}}><Image src="/vivit-logo.png" alt="VIVIT Marketing" width={190} height={105} style={{objectFit:"contain"}} priority/></div></div>
      <div style={{position:"relative",zIndex:1,maxWidth:470}}><p style={{fontSize:13,fontWeight:800,letterSpacing:2,color:"#F4B223",marginBottom:14}}>JOIN THE VIVIT TEAM</p><h1 style={{fontSize:"clamp(34px,4vw,58px)",lineHeight:1.04,margin:0,fontWeight:900}}>One team.<br/>The right access.</h1><p style={{fontSize:16,lineHeight:1.8,color:"#F8EDED",marginTop:20}}>Choose the role you need. Your account stays protected until a Super Admin reviews and approves your request.</p></div>
      <p style={{position:"relative",zIndex:1,fontSize:12,color:"#ffffff99"}}>VIVIT Marketing · Marketing brings it to the world.</p>
    </section>
    <section style={{padding:"48px 7vw",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"100%",maxWidth:650}}>
      {sent?<div style={{background:"white",border:"1px solid #E9DFC9",borderRadius:24,padding:48,boxShadow:"0 20px 70px #251b1020",textAlign:"center"}}><div style={{width:72,height:72,borderRadius:"50%",background:"#EAF3EC",display:"grid",placeItems:"center",fontSize:34,margin:"0 auto 20px"}}>✓</div><h1 style={{fontSize:30,color:"#201F20",marginBottom:12}}>Request sent</h1><p style={{color:"#6A6258",lineHeight:1.7}}>Your account is pending Super Admin approval. You will be able to sign in after it is approved.</p><Link href="/login" style={{display:"inline-block",marginTop:26,padding:"13px 24px",borderRadius:12,background:"#C52A31",color:"white",textDecoration:"none",fontWeight:800}}>Back to sign in</Link></div>:
      <><p style={{fontSize:13,fontWeight:800,letterSpacing:1.5,color:"#C52A31"}}>ACCESS REQUEST</p><h2 style={{fontSize:36,color:"#171717",margin:"8px 0",fontWeight:900}}>Create your account</h2><p style={{color:"#70685F",marginBottom:28}}>Fill in your details and select the access level you need.</p>
      <form onSubmit={submit} style={{display:"grid",gap:16}}>{error&&<div style={{padding:"12px 14px",borderRadius:10,background:"#FFF0F0",border:"1px solid #F0B8BB",color:"#A51F27"}}>{error}</div>}
        <label style={label}>FULL NAME<input className="vivit-input" required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Your full name"/></label>
        <label style={label}>WORK EMAIL<input className="vivit-input" type="email" required value={form.email} onChange={e=>update("email",e.target.value)} placeholder="you@vivitgroup.com"/></label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><label style={label}>PASSWORD<input className="vivit-input" type="password" required value={form.password} onChange={e=>update("password",e.target.value)} placeholder="8+ characters"/></label><label style={label}>CONFIRM PASSWORD<input className="vivit-input" type="password" required value={form.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} placeholder="Repeat password"/></label></div>
        <div><p style={{fontSize:12,fontWeight:800,color:"#39342F",marginBottom:9}}>REQUESTED ROLE</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{roles.map(([id,title,desc])=><button type="button" key={id} onClick={()=>update("requestedRole",id)} style={{textAlign:"left",padding:"12px 14px",borderRadius:12,cursor:"pointer",background:form.requestedRole===id?"#FFF0F0":"white",border:form.requestedRole===id?"2px solid #C52A31":"1px solid #DDD4C6",color:"#252220"}}><strong style={{display:"block",fontSize:13}}>{title}</strong><span style={{fontSize:11,color:"#7A7167"}}>{desc}</span></button>)}</div>{!form.requestedRole&&<span style={{fontSize:11,color:"#8B8278"}}>Select one role to continue.</span>}</div>
        <label style={label}>WHY DO YOU NEED THIS ACCESS? (OPTIONAL)<textarea className="vivit-input" rows={3} value={form.approvalNote} onChange={e=>update("approvalNote",e.target.value)} placeholder="Team, department, or a short note for the admin" style={{resize:"vertical"}}/></label>
        <button disabled={loading||!form.requestedRole} style={{padding:15,border:0,borderRadius:12,background:"linear-gradient(100deg,#A51F27,#C52A31 55%,#F4B223)",color:"white",fontSize:15,fontWeight:900,cursor:"pointer",opacity:(loading||!form.requestedRole) ? 0.65 : 1}}>{loading?"Sending request…":"Send approval request →"}</button>
      </form><p style={{textAlign:"center",marginTop:20,color:"#746C63",fontSize:13}}>Already approved? <Link href="/login" style={{color:"#244D87",fontWeight:800}}>Sign in</Link></p></>}
    </div></section>
  </main>;
}
const label={display:"grid",gap:7,fontSize:12,fontWeight:800,color:"#39342F"} as const;
