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
  return <div className={`task-reminder-toast ${overdue?"is-overdue":""}`} role="alert"><div className="task-reminder-row"><div><b>⏰ Task Reminder</b><p>{task.title}</p><small>{task.clientName} · {overdue?`${Math.abs(mins)} min overdue`:mins===0?"Due now":`Due in ${mins} min`}</small></div><button onClick={()=>setTask(null)} aria-label="Dismiss reminder">×</button></div><a href={`/dashboard/creative/${task.id}`}>Open Task →</a></div>;
}
