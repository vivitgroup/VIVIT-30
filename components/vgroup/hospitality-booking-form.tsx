"use client";
import {FormEvent,useMemo,useState} from "react";

type PropertyOption={id:string;name:string;maxGuests:number};

export function HospitalityBookingForm({properties,defaultPropertyId}:{properties:PropertyOption[];defaultPropertyId?:string}){
  const [propertyId,setPropertyId]=useState(defaultPropertyId||properties[0]?.id||"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const selected=useMemo(()=>properties.find(p=>p.id===propertyId),[properties,propertyId]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget);
    const payload={
      propertyId,
      guestName:String(form.get("guestName")||""),
      guestEmail:String(form.get("guestEmail")||""),
      guestPhone:String(form.get("guestPhone")||""),
      checkIn:String(form.get("checkIn")||""),
      checkOut:String(form.get("checkOut")||""),
      guests:Number(form.get("guests")||1),
      grossAmount:Number(form.get("grossAmount")||0),
      currency:"EGP",
      source:"direct"
    };
    try{
      const res=await fetch("/api/vgroup/hospitality/reservations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const body=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(body.error||`Request failed (${res.status})`);
      setMessage("Booking created successfully");
      window.location.reload();
    }catch(err){setMessage(err instanceof Error?err.message:"Could not create booking")}finally{setBusy(false)}
  }

  return <form onSubmit={submit} style={{padding:20,border:"1px solid #E4E7EC",borderRadius:20,background:"#fff",display:"grid",gap:16,marginBottom:22}}>
    <div><h2 style={{margin:"0 0 4px",fontSize:22,color:"#101828"}}>New booking</h2><p style={{margin:0,color:"#667085",fontSize:13}}>Enter the stay details only. VIVIT commission is calculated automatically at 15% of total revenue.</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Property<select value={propertyId} onChange={e=>{setPropertyId(e.target.value);setMessage("")}} required style={{padding:"12px",borderRadius:12,border:"1px solid #D0D5DD",background:"#fff",color:"#101828"}}>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Guest name<input name="guestName" required style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Guest email<input name="guestEmail" type="email" style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Guest phone<input name="guestPhone" style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Check-in<input name="checkIn" type="date" required style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Check-out<input name="checkOut" type="date" required style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Guests<input name="guests" type="number" min={1} max={selected?.maxGuests||99} defaultValue={1} required style={input}/></label>
      <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#344054"}}>Total revenue (EGP)<input name="grossAmount" type="number" min={0} step="0.01" required style={input}/></label>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{fontSize:12,fontWeight:800,color:"#475467"}}>VIVIT commission: 15% · calculated automatically</div>
      <button disabled={busy||!selected} style={{padding:"12px 18px",borderRadius:999,border:0,background:"#101828",color:"#fff",fontWeight:900,cursor:"pointer",opacity:busy||!selected?.55:1}}>{busy?"Creating…":"Create booking"}</button>
    </div>
    {message?<div role="status" style={{fontSize:12,fontWeight:800,color:message.includes("successfully")?"#027A48":"#B42318"}}>{message}</div>:null}
  </form>
}

const input={padding:"12px",borderRadius:12,border:"1px solid #D0D5DD",background:"#fff",color:"#101828"} as const;
