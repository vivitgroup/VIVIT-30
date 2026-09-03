"use client";
import {useEffect,useMemo,useState} from "react";

type Property={id:string;name:string};
type Reservation={id:string;property_id:string;guest_name:string;check_in:string;check_out:string;status:string};
type AirbnbBlock={id:string;property_id:string;property_name:string;summary:string;starts_on:string;ends_on:string;source:string};

export default function HospitalityCalendar({properties,reservations}:{properties:Property[];reservations:Reservation[]}){
 const [items,setItems]=useState(reservations);const [blocks,setBlocks]=useState<AirbnbBlock[]>([]);const [message,setMessage]=useState("");
 const propertyIds=useMemo(()=>new Set(properties.map(property=>property.id)),[properties]);
 useEffect(()=>{
  let active=true;const single=properties.length===1?`?propertyId=${encodeURIComponent(properties[0].id)}`:"";
  fetch(`/api/vgroup/hospitality/calendar-live${single}`,{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("calendar-live-failed");const payload=await response.json() as {blocks?:AirbnbBlock[]};if(active)setBlocks((payload.blocks||[]).filter(block=>propertyIds.has(block.property_id))) }).catch(()=>{if(active)setMessage("Airbnb calendar feed unavailable")});
  return()=>{active=false};
 },[properties,propertyIds]);
 async function move(reservationId:string,propertyId:string){
  const previous=items;setItems(current=>current.map(item=>item.id===reservationId?{...item,property_id:propertyId}:item));setMessage("Saving…");
  const response=await fetch("/api/vgroup/hospitality/operating-system",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"move_reservation",reservationId,propertyId})});
  if(!response.ok){setItems(previous);const payload=await response.json().catch(()=>null);setMessage(payload?.error?.message||"Move rejected");return}setMessage("Reservation moved");
 }
 const reservationCount=items.filter(item=>propertyIds.has(item.property_id)).length,airbnbCount=blocks.length;
 return <section style={{marginTop:28}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"end",flexWrap:"wrap"}}><div><h2 style={{marginBottom:5}}>Unified property calendar</h2><p style={{margin:0,color:"#b7aa8b",fontSize:13}}>Reservations and Airbnb iCal blocks now share one live calendar. VIVIT reservations remain movable; Airbnb blocks are read-only provider truth.</p><div style={{fontSize:12,color:"#d9c98f",marginTop:6}}>{reservationCount} reservations · {airbnbCount} Airbnb blocks</div></div><span style={{fontSize:12,color:"#d9c98f"}}>{message}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:14}}>{properties.map(property=><div key={property.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{const id=e.dataTransfer.getData("text/reservation-id");if(id)void move(id,property.id)}} style={{minHeight:160,padding:14,border:"1px solid #4a3a1c",borderRadius:16,background:"rgba(212,175,55,.035)"}}><strong>{property.name}</strong><div style={{display:"grid",gap:8,marginTop:12}}>{blocks.filter(block=>block.property_id===property.id).map(block=><article key={`airbnb-${block.id}`} style={{padding:10,borderRadius:12,border:"1px solid rgba(214,173,91,.7)",background:"rgba(214,173,91,.08)"}}><div style={{fontSize:10,fontWeight:900,letterSpacing:".12em",color:"#d6ad5b"}}>AIRBNB · READ ONLY</div><b style={{display:"block",fontSize:13,marginTop:4}}>{block.summary||"Unavailable"}</b><div style={{fontSize:11,color:"#b7aa8b",marginTop:4}}>{block.starts_on} → {block.ends_on}</div></article>)}{items.filter(item=>item.property_id===property.id).map(item=><article key={`reservation-${item.id}`} draggable onDragStart={e=>e.dataTransfer.setData("text/reservation-id",item.id)} style={{padding:10,borderRadius:12,border:"1px solid #66542c",cursor:"grab",background:"rgba(255,255,255,.035)"}}><div style={{fontSize:10,fontWeight:900,letterSpacing:".12em",color:"#9cc9ff"}}>VIVIT RESERVATION</div><b style={{display:"block",fontSize:13,marginTop:4}}>{item.guest_name||"Guest"}</b><div style={{fontSize:11,color:"#b7aa8b",marginTop:4}}>{item.check_in} → {item.check_out} · {item.status}</div></article>)}</div></div>)}</div></section>;
}
