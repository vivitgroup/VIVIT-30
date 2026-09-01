"use client";
import Image from "next/image";
import {useState,type ChangeEvent} from "react";

type Profile={companyName?:string;logo?:string;facebookUrl?:string;instagramUrl?:string;website?:string;whatsapp?:string};
const message=(e:unknown)=>e instanceof Error?e.message:"Could not update client photo";

export function ClientProfilePhotoButton({clientId}:{clientId:string}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[profile,setProfile]=useState<Profile>({}),[error,setError]=useState("");

  async function show(){
    setError("");setBusy(true);
    try{
      const r=await fetch(`/api/clients/${clientId}/logo`,{cache:"no-store"}),d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not load client profile");
      setProfile(d.profile||{});setOpen(true);
    }catch(e){setError(message(e))}finally{setBusy(false)}
  }

  function choose(e:ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];if(!f)return;
    if(!["image/jpeg","image/png","image/webp"].includes(f.type)){setError("Choose a JPG, PNG or WebP image.");return}
    if(f.size>5*1024*1024){setError("Client photo must be under 5 MB.");return}
    setError("");
    const img=new window.Image(),url=URL.createObjectURL(f);
    img.onload=()=>{
      const canvas=document.createElement("canvas"),size=480;canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext("2d");if(!ctx){URL.revokeObjectURL(url);setError("Could not process this image.");return}
      ctx.fillStyle="#fff";ctx.fillRect(0,0,size,size);
      const scale=Math.min((size-40)/img.width,(size-40)/img.height),w=img.width*scale,h=img.height*scale;
      ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);URL.revokeObjectURL(url);
      setProfile(v=>({...v,logo:canvas.toDataURL("image/jpeg",.88)}));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);setError("Could not read this image.")};img.src=url;
  }

  async function save(){
    if(!profile.logo){setError("Choose a client photo first.");return}
    setBusy(true);setError("");
    try{
      const r=await fetch(`/api/clients/${clientId}/logo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)}),d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not save client photo");
      setProfile(d.profile||profile);setOpen(false);location.reload();
    }catch(e){setError(message(e))}finally{setBusy(false)}
  }

  return <>
    <button type="button" onClick={show} disabled={busy} className="btn btn-primary btn-sm" style={{display:"inline-flex",alignItems:"center",gap:7}}>
      <span aria-hidden="true">▣</span>{busy?"Loading…":"Upload client photo"}
    </button>
    {error&&!open&&<span role="alert" style={{fontSize:11,color:"var(--red)"}}>{error}</span>}
    {open&&<div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(15,23,42,.55)",backdropFilter:"blur(7px)",display:"grid",placeItems:"center",padding:18}} onClick={()=>!busy&&setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="client-photo-title" onClick={e=>e.stopPropagation()} style={{width:"min(430px,96vw)",background:"var(--card-bg)",border:"1px solid var(--card-border)",borderRadius:20,padding:20,boxShadow:"0 30px 80px rgba(15,23,42,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}><div><h3 id="client-photo-title" style={{margin:0}}>Client profile photo</h3><p style={{margin:"5px 0 0",fontSize:11.5,color:"var(--text-muted)"}}>Upload a clear square logo or profile image for {profile.companyName||"this client"}.</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={()=>setOpen(false)} disabled={busy} aria-label="Close">×</button></div>
        <div style={{display:"grid",placeItems:"center",margin:"18px 0"}}>{profile.logo?<Image unoptimized src={profile.logo} alt="Client profile preview" width={132} height={132} style={{width:132,height:132,objectFit:"contain",borderRadius:24,border:"1px solid var(--card-border)",background:"#fff",padding:6}}/>:<div style={{width:132,height:132,borderRadius:24,border:"1px dashed var(--card-border)",display:"grid",placeItems:"center",fontSize:34,fontWeight:900}}>{(profile.companyName||"CL").slice(0,2).toUpperCase()}</div>}</div>
        <label className="form-label">CHOOSE IMAGE<input type="file" className="form-input" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy}/></label>
        <p style={{fontSize:10.5,color:"var(--text-muted)",marginTop:6}}>JPG, PNG or WebP · maximum 5 MB. The image is optimized automatically.</p>
        {error&&<p role="alert" style={{fontSize:12,color:"var(--red)",marginTop:10}}>{error}</p>}
        <div style={{display:"flex",gap:8,marginTop:16}}><button type="button" onClick={save} disabled={busy||!profile.logo} className="btn btn-primary" style={{flex:1}}>{busy?"Saving…":"Save client photo"}</button><button type="button" onClick={()=>setOpen(false)} disabled={busy} className="btn btn-secondary">Cancel</button></div>
      </div>
    </div>}
  </>;
}
