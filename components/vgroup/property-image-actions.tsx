"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export function PropertyImageActions({propertyId,imageId,isCover}:{propertyId:string;imageId:string;isCover:boolean}){
  const router=useRouter();const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  async function setCover(){setBusy(true);setMessage("");try{const r=await fetch(`/api/vgroup/hospitality/properties/${propertyId}/images`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageId,setCover:true})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof b.error==="string"?b.error:b.error?.message||"Update failed");router.refresh()}catch(e){setMessage(e instanceof Error?e.message:"Update failed")}finally{setBusy(false)}}
  async function remove(){if(!window.confirm("Delete this property image?"))return;setBusy(true);setMessage("");try{const r=await fetch(`/api/vgroup/hospitality/properties/${propertyId}/images`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageId})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof b.error==="string"?b.error:b.error?.message||"Delete failed");router.refresh()}catch(e){setMessage(e instanceof Error?e.message:"Delete failed")}finally{setBusy(false)}}
  return <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:6}}>{!isCover&&<button disabled={busy} type="button" onClick={setCover} style={btn}>Set cover</button>}<button disabled={busy} type="button" onClick={remove} style={{...btn,color:"#FFB8B8",borderColor:"rgba(255,120,120,.35)"}}>Delete</button>{message&&<span style={{fontSize:10,color:"#FFB8B8"}}>{message}</span>}</div>;
}
const btn:React.CSSProperties={padding:"6px 8px",borderRadius:9,border:"1px solid rgba(214,173,91,.3)",background:"transparent",color:"#F7E3AA",fontSize:10,fontWeight:900,cursor:"pointer"};
