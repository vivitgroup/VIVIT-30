"use client";
import {useEffect,useRef} from "react";

const CHECK_MS=5*60_000;

export default function MediaAutoSync(){
  const running=useRef(false);
  useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      if(cancelled||running.current||document.hidden)return;
      running.current=true;
      try{await fetch("/api/media/auto-sync",{method:"POST",cache:"no-store",credentials:"same-origin"})}catch{}finally{running.current=false}
    };
    const onVisible=()=>{if(!document.hidden)void run()};
    const id=window.setInterval(()=>void run(),CHECK_MS);
    document.addEventListener("visibilitychange",onVisible);
    void run();
    return()=>{cancelled=true;window.clearInterval(id);document.removeEventListener("visibilitychange",onVisible)};
  },[]);
  return null;
}
