"use client";
import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

const POLL_MS=2000;
type RevisionResponse={revision?:string;updatedAt?:string|null};

export default function GroupLiveRefresh(){
  const router=useRouter();
  const pathname=usePathname();
  const revisionRef=useRef<string|null>(null);
  const inFlight=useRef(false);

  useEffect(()=>{
    if(!pathname?.startsWith("/group"))return;
    let cancelled=false;
    const check=async(force=false)=>{
      if(cancelled||inFlight.current)return;
      if(!force&&document.hidden)return;
      inFlight.current=true;
      try{
        const response=await fetch("/api/group/live/revision",{cache:"no-store",credentials:"same-origin"});
        if(!response.ok)return;
        const data=await response.json() as RevisionResponse;
        const next=String(data.revision??"0");
        if(revisionRef.current===null){revisionRef.current=next;return;}
        if(next!==revisionRef.current){
          revisionRef.current=next;
          window.dispatchEvent(new CustomEvent("vivit:group-live-change",{detail:{revision:next,updatedAt:data.updatedAt??null}}));
          router.refresh();
        }
      }catch{}finally{inFlight.current=false}
    };
    const id=window.setInterval(()=>void check(),POLL_MS);
    const onVisible=()=>{if(!document.hidden)void check(true)};
    const onFocus=()=>void check(true);
    document.addEventListener("visibilitychange",onVisible);
    window.addEventListener("focus",onFocus);
    void check(true);
    return()=>{cancelled=true;window.clearInterval(id);document.removeEventListener("visibilitychange",onVisible);window.removeEventListener("focus",onFocus)};
  },[pathname,router]);
  return null;
}
