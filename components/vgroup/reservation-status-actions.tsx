"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const options:Record<string,{label:string;status:string}[]>={pending:[{label:"Confirm",status:"confirmed"},{label:"Cancel",status:"cancelled"}],confirmed:[{label:"Check in",status:"checked_in"},{label:"No show",status:"no_show"},{label:"Cancel",status:"cancelled"}],checked_in:[{label:"Check out",status:"checked_out"}],checked_out:[],cancelled:[],no_show:[]};

export function ReservationStatusActions({reservationId,status}:{reservationId:string;status:string}){
  const router=useRouter();const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");const actions=options[status]??[];
  if(!actions.length)return null;
  async function update(nextStatus:string){setBusy(true);setMessage("");try{const r=await fetch("/api/vgroup/hospitality/reservations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId,status:nextStatus})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof b.error==="string"?b.error:b.error?.message||"Status update failed");router.refresh()}catch(e){setMessage(e instanceof Error?e.message:"Status update failed")}finally{setBusy(false)}}
  return <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>{actions.map(action=><button key={action.status} type="button" disabled={busy} onClick={()=>void update(action.status)} style={{padding:"6px 8px",borderRadius:9,border:"1px solid #5a4927",background:"transparent",color:action.status==="cancelled"||action.status==="no_show"?"#FFB8B8":"#F7E3AA",fontSize:10,fontWeight:900,cursor:busy?"wait":"pointer"}}>{action.label}</button>)}{message&&<span style={{fontSize:10,color:"#FFB8B8"}}>{message}</span>}</div>;
}
