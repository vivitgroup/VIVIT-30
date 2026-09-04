"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";

export function AirbnbSyncButton({channelId}:{channelId:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");
  async function sync(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/vgroup/hospitality/calendar-sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channelId})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(String(body.error??"Sync failed"));
      setMessage(`${Number(body.events??0)} calendar events synced`);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Sync failed")}finally{setBusy(false)}
  }
  return <div style={{display:"grid",gap:7,justifyItems:"start"}}><button type="button" disabled={busy} onClick={sync} style={{border:0,borderRadius:12,padding:"9px 12px",background:"#D6AD5B",color:"#0C1B2A",fontWeight:900,cursor:busy?"wait":"pointer",opacity:busy?.65:1}}>{busy?"Syncing…":"Sync Airbnb calendar"}</button>{message&&<small style={{color:"#C7B894"}}>{message}</small>}</div>;
}
