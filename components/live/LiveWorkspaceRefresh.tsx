"use client";
import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

const POLL_MS=2000;
const MEDIA_MAINTENANCE_MS=5*60*1000;

type RevisionResponse={revision?:string;updatedAt?:string|null;mayMaintainMedia?:boolean};

export default function LiveWorkspaceRefresh(){
  const router=useRouter();
  const pathname=usePathname();
  const revisionRef=useRef<string|null>(null);
  const inFlight=useRef(false);
  const mediaAttemptAt=useRef(0);
  const mediaInFlight=useRef(false);

  useEffect(()=>{
    if(!pathname?.startsWith("/dashboard"))return;
    let cancelled=false;

    const maintainMedia=async()=>{
      if(cancelled||mediaInFlight.current||document.hidden)return;
      const now=Date.now();
      if(now-mediaAttemptAt.current<MEDIA_MAINTENANCE_MS)return;
      mediaAttemptAt.current=now;
      mediaInFlight.current=true;
      try{
        await fetch("/api/media/auto-sync",{method:"POST",cache:"no-store",credentials:"same-origin"});
      }catch{}finally{mediaInFlight.current=false}
    };

    const check=async(force=false)=>{
      if(cancelled||inFlight.current)return;
      if(!force&&typeof document!=="undefined"&&document.hidden)return;
      inFlight.current=true;
      try{
        const response=await fetch("/api/live/revision",{cache:"no-store",credentials:"same-origin"});
        if(!response.ok)return;
        const data=await response.json() as RevisionResponse;
        if(data.mayMaintainMedia)void maintainMedia();
        const next=String(data.revision??"0");
        if(revisionRef.current===null){revisionRef.current=next;return;}
        if(next!==revisionRef.current){
          revisionRef.current=next;
          window.dispatchEvent(new CustomEvent("vivit:live-change",{detail:{revision:next,updatedAt:data.updatedAt??null}}));
          router.refresh();
        }
      }catch{}finally{inFlight.current=false}
    };

    const interval=window.setInterval(()=>void check(),POLL_MS);
    const onVisibility=()=>{if(!document.hidden)void check(true)};
    const onFocus=()=>void check(true);
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("focus",onFocus);
    void check(true);

    return()=>{
      cancelled=true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange",onVisibility);
      window.removeEventListener("focus",onFocus);
    };
  },[pathname,router]);

  return null;
}
