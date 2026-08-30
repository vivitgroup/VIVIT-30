"use client";
import {useEffect,useState} from "react";

export function PreferencePanel(){
  const [theme,setTheme]=useState("light"),[reminder,setReminder]=useState("60"),[desktop,setDesktop]=useState(true);

  useEffect(()=>{
    const timer=setTimeout(()=>{
      localStorage.setItem("vivit-lang","en");
      document.documentElement.lang="en";
      document.documentElement.dir="ltr";
      setTheme(localStorage.getItem("vivit-theme")||"light");
      setReminder(localStorage.getItem("vivit-task-reminder-minutes")||"60");
      setDesktop(localStorage.getItem("vivit-reminder-enabled")!=="false");
    },0);
    return()=>clearTimeout(timer);
  },[]);

  const applyTheme=(v:string)=>{
    setTheme(v);
    localStorage.setItem("vivit-theme",v);
    document.documentElement.classList.toggle("dark",v==="dark");
  };

  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
    <section className="card"><div className="card-body">
      <h2 className="card-title">Appearance</h2>
      <p className="page-subtitle">The workspace interface stays in English. Navigation labels in the desktop sidebar are Arabic by design.</p>
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
