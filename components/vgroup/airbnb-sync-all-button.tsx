"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";

export function AirbnbSyncAllButton(){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");
  async function sync(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/vgroup/hospitality/calendar-sync-all",{method:"POST",cache:"no-store"});
      const body=await response.json().catch(()=>({}));
      if(!response.ok&&response.status!==200)throw new Error(typeof body.error==="string"?body.error:String(body.error?.message??"Sync failed"));
      const synced=Number(body.synced??0),failed=Number(body.failed??0);
      setMessage(failed?`${synced} synced · ${failed} failed`:`${synced} Airbnb calendars synced`);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Sync failed")}finally{setBusy(false)}
  }
  return <div style={{display:"grid",gap:7}}><button type="button" disabled={busy} onClick={sync} style={{border:0,borderRadius:12,padding:"10px 14px",fontWeight:900,cursor:busy?"wait":"pointer",opacity:busy?.65:1}}>{busy?"Syncing all…":"Sync all Airbnb calendars"}</button>{message&&<small style={{color:"#C7B894"}}>{message}</small>}</div>;
}
