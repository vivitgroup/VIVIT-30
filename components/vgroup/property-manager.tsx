"use client";
import Image from "next/image";
import Link from "next/link";
import {useMemo,useState} from "react";

type Owner={id:string;full_name:string};
type Property={id:string;owner_id:string|null;owner_name:string|null;name:string;property_type:string;city:string|null;country:string;bedrooms:number;bathrooms:number;max_guests:number;status:string;image_count:number};
type Props={owners:Owner[];initialProperties:Property[]};

export function PropertyManager({owners,initialProperties}:Props){
  const [properties,setProperties]=useState(initialProperties);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [files,setFiles]=useState<File[]>([]);
  const previews=useMemo(()=>files.map(file=>({file,url:URL.createObjectURL(file)})),[files]);

  async function createProperty(formData:FormData){
    setBusy(true);setMessage("");
    try{
      const payload={
        name:String(formData.get("name")??""),ownerId:String(formData.get("ownerId")??"")||null,
        propertyType:String(formData.get("propertyType")??"apartment"),city:String(formData.get("city")??"")||null,
        country:String(formData.get("country")??"EG"),bedrooms:Number(formData.get("bedrooms")??0),bathrooms:Number(formData.get("bathrooms")??0),maxGuests:Number(formData.get("maxGuests")??1),
      };
      const response=await fetch("/api/vgroup/hospitality/properties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message??data.error??"Could not create property");
      const propertyId=String(data.property.id);
      for(let index=0;index<files.length;index++){
        const upload=new FormData();upload.set("file",files[index]);upload.set("isCover",index===0?"true":"false");upload.set("sortOrder",String(index));
        const uploaded=await fetch(`/api/vgroup/hospitality/properties/${propertyId}/images`,{method:"POST",body:upload});
        if(!uploaded.ok){const detail=await uploaded.json().catch(()=>({}));throw new Error(detail.error?.message??detail.error??`Property created, image ${index+1} upload failed`)}
      }
      const refreshed=await fetch("/api/vgroup/hospitality/properties",{cache:"no-store"});
      const fresh=await refreshed.json();if(refreshed.ok)setProperties(fresh.properties);
      setFiles([]);setMessage("Property saved successfully.");
    }catch(error){setMessage(error instanceof Error?error.message:"Property save failed")}finally{setBusy(false)}
  }

  async function uploadExistingImages(property:Property,newFiles:File[]){
    if(!newFiles.length)return;
    setBusy(true);setMessage("");
    try{
      for(let index=0;index<newFiles.length;index++){
        const upload=new FormData();upload.set("file",newFiles[index]);upload.set("isCover",property.image_count===0&&index===0?"true":"false");upload.set("sortOrder",String(property.image_count+index));
        const response=await fetch(`/api/vgroup/hospitality/properties/${property.id}/images`,{method:"POST",body:upload});
        const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error?.message??data.error??`Image ${index+1} upload failed`);
      }
      setProperties(current=>current.map(item=>item.id===property.id?{...item,image_count:item.image_count+newFiles.length}:item));
      setMessage(`${newFiles.length} image${newFiles.length===1?"":"s"} added to ${property.name}.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Gallery upload failed")}finally{setBusy(false)}
  }

  async function changeOwner(propertyId:string,ownerId:string){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/vgroup/hospitality/properties/${propertyId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ownerId:ownerId||null,reason:"Property manager update"})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message??data.error??"Owner update failed");
      const owner=owners.find(item=>item.id===ownerId);
      setProperties(current=>current.map(item=>item.id===propertyId?{...item,owner_id:ownerId||null,owner_name:owner?.full_name??null}:item));
      setMessage("Owner updated.");
    }catch(error){setMessage(error instanceof Error?error.message:"Owner update failed")}finally{setBusy(false)}
  }

  async function archiveProperty(property:Property){
    if(!confirm(`Archive ${property.name}? Historical bookings and expenses will be kept.`))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/vgroup/hospitality/properties/${property.id}/lifecycle`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"archive"})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error?.message??data.error??"Property archive failed");
      setProperties(current=>current.filter(item=>item.id!==property.id));
      setMessage(`${property.name} moved to archive. Historical bookings and expenses were preserved.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Property archive failed")}finally{setBusy(false)}
  }

  return <div style={{display:"grid",gap:22}}>
    <form action={createProperty} style={{padding:22,border:"1px solid #e5e7eb",borderRadius:24,background:"#ffffff",display:"grid",gap:14,boxShadow:"0 10px 30px rgba(15,23,42,.05)"}}>
      <div><h2 style={{margin:"0 0 6px",fontSize:24,color:"#111827"}}>Add property</h2><p style={{margin:0,color:"#6b7280"}}>Add the basic details and photos. Owner can be assigned now or later.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        <input required minLength={2} name="name" placeholder="Property name" style={field}/>
        <select name="ownerId" defaultValue="" style={field}><option value="">No owner yet</option>{owners.map(owner=><option key={owner.id} value={owner.id}>{owner.full_name}</option>)}</select>
        <select name="propertyType" defaultValue="apartment" style={field}><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="studio">Studio</option><option value="chalet">Chalet</option><option value="hotel_unit">Hotel unit</option><option value="other">Other</option></select>
        <input name="city" placeholder="City" style={field}/><input name="country" defaultValue="EG" placeholder="Country" style={field}/>
        <input name="bedrooms" type="number" min="0" defaultValue="1" placeholder="Bedrooms" style={field}/><input name="bathrooms" type="number" min="0" step="0.5" defaultValue="1" placeholder="Bathrooms" style={field}/><input name="maxGuests" type="number" min="1" defaultValue="2" placeholder="Max guests" style={field}/>
      </div>
      <label style={{border:"1px dashed #cbd5e1",borderRadius:18,padding:18,cursor:"pointer",background:"#f8fafc",color:"#111827"}}><strong>Cover + Gallery</strong><div style={{fontSize:13,color:"#64748b",marginTop:5}}>JPG / PNG / WEBP, up to 20MB each. First image becomes the cover.</div><input hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>setFiles(Array.from(event.target.files??[]))}/></label>
      {previews.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10}}>{previews.map(({file,url},index)=><div key={`${file.name}-${index}`} style={{position:"relative",height:90}}><Image unoptimized fill src={url} alt="Property preview" sizes="110px" style={{objectFit:"cover",borderRadius:14}}/>{index===0&&<span style={{position:"absolute",left:7,top:7,fontSize:10,fontWeight:900,background:"#111827",color:"#fff",padding:"4px 7px",borderRadius:999}}>COVER</span>}</div>)}</div>}
      <button disabled={busy} style={button}>{busy?"Saving…":"Save property"}</button>
    </form>
    {message&&<div style={{padding:"12px 16px",borderRadius:14,background:"#f8fafc",color:"#111827",border:"1px solid #e2e8f0"}}>{message}</div>}
    <section style={{display:"grid",gap:12}}><h2 style={{margin:0,color:"#111827"}}>Properties</h2>{properties.length===0?<p style={{color:"#64748b"}}>No active properties.</p>:properties.map(property=><article key={property.id} style={{padding:18,border:"1px solid #e5e7eb",borderRadius:20,background:"#fff",display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(210px,300px)",gap:16,alignItems:"center",boxShadow:"0 8px 24px rgba(15,23,42,.04)"}}><div><strong style={{fontSize:19,color:"#111827"}}>{property.name}</strong><div style={{color:"#64748b",fontSize:13,marginTop:5}}>{property.property_type} · {property.city??"No city"} · {property.bedrooms} BR · {property.image_count} images</div><div style={{fontSize:13,marginTop:7,color:"#475569"}}>{property.owner_name?`Owner: ${property.owner_name}`:"Owner: unassigned"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><Link href={`/group/hospitality/properties/${property.id}`} style={{...smallButton,textDecoration:"none"}}>Open</Link><Link href={`/group/hospitality/finance?propertyId=${property.id}`} style={{...smallButton,textDecoration:"none",background:"#111827",color:"#fff",borderColor:"#111827"}}>+ Add expense</Link><label style={{...smallButton,cursor:busy?"not-allowed":"pointer",opacity:busy?0.6:1}}>Add images<input hidden disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{const selected=Array.from(event.target.files??[]);event.currentTarget.value="";void uploadExistingImages(property,selected)}}/></label><button type="button" disabled={busy} onClick={()=>void archiveProperty(property)} style={{...smallButton,cursor:"pointer",background:"#fff",color:"#b42318",borderColor:"#fecaca"}}>Archive</button></div></div><select disabled={busy} value={property.owner_id??""} onChange={event=>changeOwner(property.id,event.target.value)} style={field}><option value="">No owner</option>{owners.map(owner=><option key={owner.id} value={owner.id}>{owner.full_name}</option>)}</select></article>)}</section>
  </div>;
}

const field:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"12px 13px",borderRadius:12,border:"1px solid #d1d5db",background:"#ffffff",color:"#111827",outline:"none"};
const button:React.CSSProperties={border:0,borderRadius:14,padding:"13px 18px",background:"#111827",color:"#ffffff",fontWeight:900,cursor:"pointer"};
const smallButton:React.CSSProperties={display:"inline-block",border:"1px solid #d1d5db",borderRadius:11,padding:"8px 10px",color:"#111827",fontSize:12,fontWeight:900,background:"#ffffff"};