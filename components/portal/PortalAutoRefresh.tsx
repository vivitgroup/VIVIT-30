"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function PortalAutoRefresh({seconds=30}:{seconds?:number}){
  const router=useRouter();
  const [last,setLast]=useState(()=>new Date());
  useEffect(()=>{
    const intervalMs=Math.max(5,seconds)*1000;
    let id:ReturnType<typeof setInterval>|null=null;
    const stop=()=>{if(id){clearInterval(id);id=null}};
    const refresh=()=>{if(document.hidden)return;router.refresh();setLast(new Date())};
    const sync=()=>{stop();if(!document.hidden)id=setInterval(refresh,intervalMs)};
    const live=()=>setLast(new Date());
    document.addEventListener("visibilitychange",sync);
    window.addEventListener("vivit:live-change",live);
    sync();
    return()=>{stop();document.removeEventListener("visibilitychange",sync);window.removeEventListener("vivit:live-change",live)};
  },[router,seconds]);
  return <span className="portal-live"><i/> Live · updated {last.toLocaleTimeString("en-EG",{hour:"2-digit",minute:"2-digit"})}</span>;
}
