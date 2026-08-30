"use client";
import { useEffect,useState } from "react";

type Task={id:string;title:string;deadline:string;clientName:string;priority:string;status:string};
type ReminderResponse={tasks?:Task[]};
type DueTask={x:Task;diff:number};
const REMINDER_POLL_MS=120000;
const readLocal=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const readSession=(key:string)=>{try{return sessionStorage.getItem(key)}catch{return null}};
const writeSession=(key:string,value:string)=>{try{sessionStorage.setItem(key,value)}catch{}};

export function TaskReminderWatcher(){
  const [task,setTask]=useState<Task|null>(null),[mins,setMins]=useState(0);
  useEffect(()=>{
    let dead=false;
    async function check(){
      if(document.hidden)return;
      if(readLocal("vivit-reminder-enabled")==="false"){setTask(null);return}
      const raw=Number(readLocal("vivit-task-reminder-minutes")||"60"),threshold=Number.isFinite(raw)?Math.min(1440,Math.max(5,raw)):60;
      try{
        const r=await fetch("/api/reminders/tasks",{cache:"no-store"});if(!r.ok)return;
        const d:ReminderResponse=await r.json(),now=Date.now();
        const due=(d.tasks||[]).map((x):DueTask=>({x,diff:(new Date(x.deadline).getTime()-now)/60000})).filter(z=>z.diff<=threshold&&z.diff>=-1440).sort((a,b)=>a.diff-b.diff)[0];
        if(!dead&&due){const key=`vivit-task-reminder:${due.x.id}:${Math.floor(due.diff/15)}`;if(!readSession(key)){setTask(due.x);setMins(Math.round(due.diff));writeSession(key,"1")}}
      }catch{}
    }
    const onVisibility=()=>{if(!document.hidden)void check()};
    void check();
    const timer=setInterval(()=>void check(),REMINDER_POLL_MS);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{dead=true;clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility)};
  },[]);
  if(!task)return null;
  const overdue=mins<0;
  return <div role="alert" style={{position:"fixed",right:22,top:88,zIndex:930,width:"min(380px,calc(100vw - 30px))",padding:14,borderRadius:16,background:overdue?"#7f1d1d":"#172554",color:"#fff",boxShadow:"0 18px 48px rgba(15,23,42,.28)",border:"1px solid rgba(255,255,255,.15)",animation:"reminderIn .35s ease-out"}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><b style={{fontSize:13}}>⏰ Task Reminder</b><p style={{fontSize:12.5,fontWeight:700,marginTop:5}}>{task.title}</p><p style={{fontSize:11,opacity:.78,marginTop:3}}>{task.clientName} · {overdue?`${Math.abs(mins)} min overdue`:mins===0?"Due now":`Due in ${mins} min`}</p></div><button onClick={()=>setTask(null)} aria-label="Dismiss reminder" style={{border:0,background:"transparent",color:"white",fontSize:20,cursor:"pointer",height:26}}>×</button></div><a href={`/dashboard/creative/${task.id}`} style={{display:"inline-block",marginTop:10,padding:"7px 10px",borderRadius:9,background:"rgba(255,255,255,.14)",color:"#fff",textDecoration:"none",fontSize:11,fontWeight:800}}>Open Task →</a><style>{`@keyframes reminderIn{from{opacity:0;transform:translateY(-14px) scale(.97)}to{opacity:1;transform:none}}`}</style></div>;
}
