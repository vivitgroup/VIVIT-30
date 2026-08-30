"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function PortalAutoRefresh({seconds=90}:{seconds?:number}){
  const router=useRouter();
  const [last,setLast]=useState(()=>new Date());
  useEffect(()=>{
    const intervalMs=Math.max(90,seconds)*1000;
    let id:ReturnType<typeof setInterval>|null=null;
    const stop=()=>{if(id){clearInterval(id);id=null}};
    const refresh=()=>{if(document.hidden)return;router.refresh();setLast(new Date())};
    const sync=()=>{stop();if(!document.hidden)id=setInterval(refresh,intervalMs)};
    document.addEventListener("visibilitychange",sync);
    sync();
    return()=>{stop();document.removeEventListener("visibilitychange",sync)};
  },[router,seconds]);
  return <span className="portal-live"><i/> Live · updated {last.toLocaleTimeString("en-EG",{hour:"2-digit",minute:"2-digit"})}</span>;
}
