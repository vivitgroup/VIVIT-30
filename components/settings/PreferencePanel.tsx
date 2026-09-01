"use client";
import Image from "next/image";
import {useEffect,useState} from "react";

export function PreferencePanel(){
  const [theme,setTheme]=useState("light"),[reminder,setReminder]=useState("60"),[desktop,setDesktop]=useState(true),[avatar,setAvatar]=useState<string|null>(null),[avatarBusy,setAvatarBusy]=useState(false),[avatarError,setAvatarError]=useState("");

  useEffect(()=>{
    const timer=setTimeout(()=>{
      setTheme(localStorage.getItem("vivit-theme")||"light");
      setReminder(localStorage.getItem("vivit-task-reminder-minutes")||"60");
      setDesktop(localStorage.getItem("vivit-reminder-enabled")!=="false");
    },0);
    fetch("/api/profile-avatar",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>setAvatar(d?.avatar||null)).catch(()=>{});
    return()=>clearTimeout(timer);
  },[]);

  const applyTheme=(v:string)=>{
    setTheme(v);
    localStorage.setItem("vivit-theme",v);
    document.documentElement.classList.toggle("dark",v==="dark");
  };
  const uploadAvatar=async(file:File|null)=>{
    if(!file)return;setAvatarError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setAvatarError("Use a JPG, PNG or WebP image.");return}
    if(file.size>1024*1024){setAvatarError("Profile image must be 1 MB or smaller.");return}
    setAvatarBusy(true);
    try{
      const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(new Error("Could not read image"));reader.readAsDataURL(file)});
      const response=await fetch("/api/profile-avatar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({avatar:dataUrl})}),data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not save profile image.");
      setAvatar(data.avatar||dataUrl);window.location.reload();
    }catch(error){setAvatarError(error instanceof Error?error.message:"Could not save profile image.")}finally{setAvatarBusy(false)}
  };

  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
    <section className="card"><div className="card-body">
      <h2 className="card-title">Profile Image</h2><p className="page-subtitle">Shown on your account across the ERP.</p>
      <div style={{display:"flex",alignItems:"center",gap:14,marginTop:14}}>{avatar?<Image src={avatar} alt="Profile" width={72} height={72} unoptimized style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"1px solid var(--card-border)"}}/>:<div className="avatar" style={{width:72,height:72,fontSize:22}}>👤</div>}<label className="btn btn-secondary" style={{cursor:"pointer"}}>{avatarBusy?"Saving…":"Choose Image"}<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={avatarBusy} onChange={e=>uploadAvatar(e.target.files?.[0]||null)}/></label></div>
      {avatarError&&<p role="alert" style={{color:"var(--red)",fontSize:12,marginTop:10}}>{avatarError}</p>}
      <p style={{fontSize:11,color:"var(--text-muted)",marginTop:10}}>JPG, PNG or WebP · max 1 MB</p>
    </div></section>
    <section className="card"><div className="card-body">
      <h2 className="card-title">Appearance</h2>
      <p className="page-subtitle">The ERP interface uses English consistently across desktop and mobile.</p>
      <label className="form-label" style={{marginTop:12}}>Theme</label>
      <select className="form-select" value={theme} onChange={e=>applyTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select>
    </div></section>
    <section className="card"><div className="card-body">
      <h2 className="card-title">Task Reminders</h2><p className="page-subtitle">Default reminder used for tasks on this device.</p>
      <label className="form-label" style={{marginTop:12}}>Remind me before a task</label>
      <select className="form-select" value={reminder} onChange={e=>{setReminder(e.target.value);localStorage.setItem("vivit-task-reminder-minutes",e.target.value)}}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="180">3 hours</option><option value="1440">1 day</option><option value="2880">2 days</option></select>
      <label style={{display:"flex",gap:9,alignItems:"center",marginTop:13,fontSize:12.5}}><input type="checkbox" checked={desktop} onChange={e=>{setDesktop(e.target.checked);localStorage.setItem("vivit-reminder-enabled",String(e.target.checked))}}/>Enable on-screen reminder notifications</label>
    </div></section>
    <section className="card"><div className="card-body">
      <h2 className="card-title">Session</h2><p className="page-subtitle">Return to the workspace launcher or securely end this session.</p>
      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}><a href="/apps" className="btn btn-secondary" style={{textDecoration:"none"}}>← Apps Home</a><a href="/signout" className="btn btn-danger" style={{textDecoration:"none"}}>Sign Out</a></div>
    </div></section>
  </div>;
}
