"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const ROLES = [
  { label:"👑 Super Admin",    email:"asem@vivitgroup.com",    color:"#9F1D25" },
  { label:"💰 Accountant",     email:"mostafa@vivitgroup.com", color:"#059669" },
  { label:"📣 Media Buyer",    email:"noha@vivitgroup.com",    color:"#D97706" },
  { label:"🎨 Creator",        email:"samo@vivitgroup.com",    color:"#7C3AED" },
  { label:"🤝 Account Manager",email:"sondos@vivitgroup.com",  color:"#0891B2" },
  { label:"🎯 Sales",          email:"sales@vivitgroup.com",   color:"#DC2626" },
  { label:"🏠 Client Portal",  email:"client@misfive.com",     color:"#374151" },
];

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const login = async (e?: React.FormEvent, em?: string, pw?: string) => {
    e?.preventDefault();
    const finalEmail    = em ?? email;
    const finalPassword = pw ?? password;
    if (!finalEmail || !finalPassword) return;
    setLoading(true); setError("");
    const res = await signIn("credentials", { email:finalEmail, password:finalPassword, redirect:false });
    if (res?.error) { setError("Invalid credentials. Try again."); setLoading(false); }
    else { window.location.href = "/dashboard"; }
  };

  const quickLogin = (em: string) => {
    setEmail(em); setPassword("password");
    login(undefined, em, "password");
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",background:"#F8FAFF",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>

      {/* Left panel — branding */}
      <div className="login-brand-panel" style={{flex:1,background:"linear-gradient(145deg,#171717 0%,#73151B 42%,#C52A31 72%,#E24A3B 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 48px",position:"relative",overflow:"hidden"}}>
        {/* Background circles */}
        <div style={{position:"absolute",width:"400px",height:"400px",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)",top:"-100px",right:"-100px"}}/>
        <div style={{position:"absolute",width:"300px",height:"300px",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.06)",bottom:"-50px",left:"-50px"}}/>
        <div style={{position:"absolute",width:"200px",height:"200px",borderRadius:"50%",background:"rgba(255,255,255,0.03)",top:"40%",right:"10%"}}/>

        <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:"380px"}}>
          {/* Logo */}
          <div style={{marginBottom:"40px",display:"flex",justifyContent:"center"}}>
            <div style={{background:"rgba(255,255,255,0.96)",backdropFilter:"blur(10px)",borderRadius:"20px",padding:"18px 28px",border:"1px solid rgba(255,255,255,0.55)",boxShadow:"0 20px 50px rgba(0,0,0,.18)"}}>
              <Image src="/vivit-logo.png" alt="VIVIT Marketing" width={220} height={165} style={{objectFit:"contain",display:"block"}} priority/>
            </div>
          </div>

          <h1 style={{fontSize:"2rem",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.02em",marginBottom:"12px",lineHeight:1.2}}>
            Enterprise Marketing<br/>Management Platform
          </h1>
          <p style={{color:"rgba(255,255,255,0.75)",fontSize:"15px",lineHeight:1.7,marginBottom:"40px"}}>
            CRM · Media Buying · Creative Workflow · Finance · AI Studio — all in one beautiful platform.
          </p>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
            {[{n:"125+",l:"Features"},{n:"47",l:"DB Tables"},{n:"70",l:"Pages"}].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,0.1)",borderRadius:"12px",padding:"14px",border:"1px solid rgba(255,255,255,0.15)"}}>
                <p style={{fontSize:"22px",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>{s.n}</p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.65)",marginTop:"2px"}}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="login-form-panel" style={{width:"480px",display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px",background:"#fff",boxShadow:"-8px 0 40px rgba(0,0,0,0.08)"}}>
        <div style={{marginBottom:"32px"}}>
          <h2 style={{fontSize:"1.6rem",fontWeight:800,color:"#0F172A",fontFamily:"Sora,sans-serif",letterSpacing:"-0.02em",marginBottom:"6px"}}>Sign in</h2>
          <p style={{color:"#64748B",fontSize:"14px"}}>Welcome back to VIVIT ERP</p>
        </div>

        {/* Quick login */}
        <div style={{marginBottom:"24px"}}>
          <p style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#94A3B8",marginBottom:"10px"}}>⚡ Quick Demo Login</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            {ROLES.map(r=>(
              <button key={r.email} onClick={()=>quickLogin(r.email)} disabled={loading}
                style={{padding:"8px 10px",borderRadius:"8px",border:`1.5px solid ${r.color}22`,background:`${r.color}08`,cursor:"pointer",fontSize:"12px",fontWeight:600,color:r.color,transition:"all 0.15s",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px"}}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <div style={{flex:1,height:"1px",background:"#E2E8F0"}}/>
          <span style={{fontSize:"12px",color:"#94A3B8",fontWeight:600}}>OR SIGN IN MANUALLY</span>
          <div style={{flex:1,height:"1px",background:"#E2E8F0"}}/>
        </div>

        {/* Form */}
        <form onSubmit={login} style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {error && (
            <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:"8px",padding:"10px 14px",color:"#DC2626",fontSize:"13px",fontWeight:500}}>
              ⚠️ {error}
            </div>
          )}
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:700,color:"#475569",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              placeholder="you@vivitgroup.com"
              style={{width:"100%",padding:"11px 14px",border:"1.5px solid #E2E8F0",borderRadius:"8px",fontSize:"14px",color:"#0F172A",outline:"none",transition:"all 0.15s",fontFamily:"inherit",background:"#F8FAFF"}}
              onFocus={e=>e.target.style.borderColor="#C52A31"}
              onBlur={e=>e.target.style.borderColor="#E2E8F0"}
            />
          </div>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:700,color:"#475569",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{width:"100%",padding:"11px 14px",border:"1.5px solid #E2E8F0",borderRadius:"8px",fontSize:"14px",color:"#0F172A",outline:"none",transition:"all 0.15s",fontFamily:"inherit",background:"#F8FAFF"}}
              onFocus={e=>e.target.style.borderColor="#C52A31"}
              onBlur={e=>e.target.style.borderColor="#E2E8F0"}
            />
            <div style={{textAlign:"right",marginTop:"7px"}}><Link href="/forgot-password" style={{fontSize:"12px",color:"#244D87",fontWeight:700}}>Forgot password?</Link></div>
          </div>
          <button type="submit" disabled={loading}
            style={{padding:"12px",background:"linear-gradient(135deg,#9F1D25,#C52A31,#EFB324)",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:700,cursor:"pointer",transition:"all 0.2s",boxShadow:"0 4px 16px rgba(33,150,243,0.35)",fontFamily:"inherit",marginTop:"4px",opacity:loading?0.7:1}}>
            {loading ? "Signing in..." : "Sign in to VIVIT ERP →"}
          </button>
        </form>

        <p style={{marginTop:"24px",textAlign:"center",fontSize:"11.5px",color:"#94A3B8"}}>
          Demo password: <code style={{background:"#F1F5F9",padding:"2px 6px",borderRadius:"4px",color:"#9F1D25",fontWeight:700}}>password</code>
        </p>

        <p style={{marginTop:"14px",textAlign:"center",fontSize:"13px",color:"#64748B"}}>
          Need an account? <Link href="/signup" style={{color:"#C52A31",fontWeight:800}}>Request access</Link>
        </p>

        <div style={{marginTop:"32px",padding:"16px",background:"#F0F9FF",borderRadius:"10px",border:"1px solid #BAE6FD"}}>
          <p style={{fontSize:"12px",color:"#0369A1",fontWeight:600,marginBottom:"4px"}}>🔒 Enterprise Security</p>
          <p style={{fontSize:"11.5px",color:"#0284C7"}}>JWT sessions · bcrypt passwords · RBAC · Audit logs · Rate limiting</p>
        </div>
      </div>
    </div>
  );
}
