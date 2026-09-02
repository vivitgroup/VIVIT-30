"use client";
import {useState} from "react";

type Property={id:string;name:string};
type Reservation={id:string;property_id:string;guest_name:string;check_in:string;check_out:string;status:string};

export default function HospitalityCalendar({properties,reservations}:{properties:Property[];reservations:Reservation[]}){
 const [items,setItems]=useState(reservations); const [message,setMessage]=useState("");
 async function move(reservationId:string,propertyId:string){
  const previous=items; setItems(current=>current.map(item=>item.id===reservationId?{...item,property_id:propertyId}:item)); setMessage("Saving…");
  const response=await fetch("/api/vgroup/hospitality/operating-system",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"move_reservation",reservationId,propertyId})});
  if(!response.ok){setItems(previous);const payload=await response.json().catch(()=>null);setMessage(payload?.error?.message||"Move rejected");return} setMessage("Reservation moved");
 }
 return <section style={{marginTop:28}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"end",flexWrap:"wrap"}}><div><h2 style={{marginBottom:5}}>Multi-property calendar</h2><p style={{margin:0,color:"#b7aa8b",fontSize:13}}>Drag a reservation to another property. The server re-validates business-unit scope and the database overlap guard can reject unsafe moves.</p></div><span style={{fontSize:12,color:"#d9c98f"}}>{message}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:14}}>{properties.map(property=><div key={property.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{const id=e.dataTransfer.getData("text/reservation-id");if(id)void move(id,property.id)}} style={{minHeight:160,padding:14,border:"1px solid #4a3a1c",borderRadius:16,background:"rgba(212,175,55,.035)"}}><strong>{property.name}</strong><div style={{display:"grid",gap:8,marginTop:12}}>{items.filter(item=>item.property_id===property.id).map(item=><article key={item.id} draggable onDragStart={e=>e.dataTransfer.setData("text/reservation-id",item.id)} style={{padding:10,borderRadius:12,border:"1px solid #66542c",cursor:"grab",background:"rgba(255,255,255,.035)"}}><b style={{fontSize:13}}>{item.guest_name||"Guest"}</b><div style={{fontSize:11,color:"#b7aa8b",marginTop:4}}>{item.check_in} → {item.check_out} · {item.status}</div></article>)}</div></div>)}</div></section>;
}
