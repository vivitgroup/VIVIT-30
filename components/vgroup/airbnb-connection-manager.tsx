"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

type ExistingConnection={id:string;externalListingId:string;status:string;lastSyncAt:string|null;lastError:string|null;hasFeed:boolean}|null;

export function AirbnbConnectionManager({propertyId,propertyName,connection}:{propertyId:string;propertyName:string;connection:ExistingConnection}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch(`/api/vgroup/hospitality/properties/${propertyId}/airbnb`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({externalListingId:String(form.get("externalListingId")??""),icalUrl:String(form.get("icalUrl")??"")})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof body.error==="string"?body.error:body.error?.message||"Airbnb connection save failed");
      setMessage("Airbnb connection saved. Run calendar sync to verify the feed.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Airbnb connection save failed")}finally{setBusy(false)}
  }
  async function disconnect(){
    if(!window.confirm(`Disconnect Airbnb calendar from ${propertyName}? Future synced blocks will be archived.`))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/vgroup/hospitality/properties/${propertyId}/airbnb`,{method:"DELETE"});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof body.error==="string"?body.error:body.error?.message||"Disconnect failed");
      setMessage("Airbnb calendar disconnected and future synced blocks archived.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Disconnect failed")}finally{setBusy(false)}
  }
  const field:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 11px",borderRadius:11,border:"1px solid rgba(214,173,91,.28)",background:"rgba(255,255,255,.035)",color:"inherit"};
  return <section style={{maxWidth:1240,margin:"16px auto 0",padding:"0 22px",fontFamily:"Inter,system-ui,sans-serif"}}><article style={{padding:18,borderRadius:20,border:"1px solid rgba(214,173,91,.28)"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:11,color:"#D6AD5B",fontWeight:900,letterSpacing:".14em"}}>AIRBNB CONNECTION MANAGEMENT</div><h3 style={{margin:"6px 0"}}>{propertyName}</h3><div style={{fontSize:12,opacity:.72}}>{connection?`Status: ${connection.status} · Feed ${connection.hasFeed?"configured":"missing"}${connection.lastSyncAt?` · Last sync ${connection.lastSyncAt}`:""}`:"No Airbnb connection configured"}</div>{connection?.lastError&&<div style={{fontSize:12,color:"#FFB8B8",marginTop:4}}>{connection.lastError}</div>}</div>{connection&&connection.status!=="disabled"&&<button disabled={busy} type="button" onClick={disconnect} style={{alignSelf:"start",padding:"9px 11px",borderRadius:11,border:"1px solid rgba(255,120,120,.35)",background:"transparent",color:"#FFB8B8",fontWeight:900,cursor:"pointer"}}>Disconnect</button>}</div><form onSubmit={save} style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(260px,2fr) auto",gap:10,marginTop:14,alignItems:"end"}}><label style={{fontSize:12,fontWeight:800}}>Airbnb listing ID<input required name="externalListingId" defaultValue={connection?.externalListingId??""} placeholder="e.g. 12right" style={{...field,marginTop:6}}/></label><label style={{fontSize:12,fontWeight:800}}>Airbnb iCal URL<input name="icalUrl" type="url" placeholder={connection?.hasFeed?"Leave blank to keep current feed":"https://www.airbnb.com/calendar/ical/...ics"} required={!connection?.hasFeed} style={{...field,marginTop:6}}/><span style={{display:"block",fontSize:10,opacity:.6,marginTop:4}}>Existing feed URL is never shown back in the UI. Enter a new URL only to replace it.</span></label><button disabled={busy} style={{padding:"11px 14px",border:0,borderRadius:11,background:"#D6AD5B",color:"#0C1B2A",fontWeight:900,cursor:busy?"wait":"pointer"}}>{busy?"Saving…":connection?"Update connection":"Connect Airbnb"}</button></form>{message&&<div style={{fontSize:12,color:message.toLowerCase().includes("failed")||message.toLowerCase().includes("invalid")?"#FFB8B8":"#C7B894",marginTop:10}}>{message}</div>}</article></section>;
}
