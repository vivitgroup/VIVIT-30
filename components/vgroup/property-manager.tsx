"use client";
import Image from "next/image";
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
      setFiles([]);setMessage("Property saved. Owner can stay unassigned or be linked later; gallery uploaded.");
    }catch(error){setMessage(error instanceof Error?error.message:"Property save failed")}finally{setBusy(false)}
  }

  async function changeOwner(propertyId:string,ownerId:string){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/vgroup/hospitality/properties/${propertyId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ownerId:ownerId||null,reason:"Property manager update"})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message??data.error??"Owner update failed");
      const owner=owners.find(item=>item.id===ownerId);
      setProperties(current=>current.map(item=>item.id===propertyId?{...item,owner_id:ownerId||null,owner_name:owner?.full_name??null}:item));
      setMessage("Ownership updated and added to the audit history.");
    }catch(error){setMessage(error instanceof Error?error.message:"Owner update failed")}finally{setBusy(false)}
  }

  return <div style={{display:"grid",gap:22}}>
    <form action={createProperty} style={{padding:22,border:"1px solid #3a3222",borderRadius:24,background:"rgba(205,178,119,.07)",display:"grid",gap:14}}>
      <div><h2 style={{margin:"0 0 6px",fontSize:24}}>Add property / unit</h2><p style={{margin:0,color:"#b7aa91"}}>Owner is optional. Upload the cover and gallery directly from your device here.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        <input required minLength={2} name="name" placeholder="Property name" style={field}/>
        <select name="ownerId" defaultValue="" style={field}><option value="">No owner yet</option>{owners.map(owner=><option key={owner.id} value={owner.id}>{owner.full_name}</option>)}</select>
        <select name="propertyType" defaultValue="apartment" style={field}><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="studio">Studio</option><option value="chalet">Chalet</option><option value="hotel_unit">Hotel unit</option><option value="other">Other</option></select>
        <input name="city" placeholder="City" style={field}/><input name="country" defaultValue="EG" placeholder="Country" style={field}/>
        <input name="bedrooms" type="number" min="0" defaultValue="1" placeholder="Bedrooms" style={field}/><input name="bathrooms" type="number" min="0" step="0.5" defaultValue="1" placeholder="Bathrooms" style={field}/><input name="maxGuests" type="number" min="1" defaultValue="2" placeholder="Max guests" style={field}/>
      </div>
      <label style={{border:"1px dashed #7d6841",borderRadius:18,padding:18,cursor:"pointer",background:"rgba(0,0,0,.18)"}}><strong>Cover + Gallery</strong><div style={{fontSize:13,color:"#b7aa91",marginTop:5}}>JPG / PNG / WEBP, up to 20MB each. First image becomes the cover.</div><input hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>setFiles(Array.from(event.target.files??[]))}/></label>
      {previews.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10}}>{previews.map(({file,url},index)=><div key={`${file.name}-${index}`} style={{position:"relative",height:90}}><Image unoptimized fill src={url} alt="Property preview" sizes="110px" style={{objectFit:"cover",borderRadius:14}}/>{index===0&&<span style={{position:"absolute",left:7,top:7,fontSize:10,fontWeight:900,background:"#d9be7d",color:"#17130c",padding:"4px 7px",borderRadius:999}}>COVER</span>}</div>)}</div>}
      <button disabled={busy} style={button}>{busy?"Saving…":"Save property"}</button>
    </form>
    {message&&<div style={{padding:"12px 16px",borderRadius:14,background:"rgba(205,178,119,.1)",border:"1px solid #4a3d25"}}>{message}</div>}
    <section style={{display:"grid",gap:12}}><h2 style={{margin:0}}>Properties</h2>{properties.length===0?<p style={{color:"#b7aa91"}}>No properties yet.</p>:properties.map(property=><article key={property.id} style={{padding:18,border:"1px solid #322b1f",borderRadius:20,background:"rgba(255,255,255,.025)",display:"grid",gridTemplateColumns:"1fr minmax(180px,260px)",gap:16,alignItems:"center"}}><div><strong style={{fontSize:19}}>{property.name}</strong><div style={{color:"#aa9b80",fontSize:13,marginTop:5}}>{property.property_type} · {property.city??"No city"} · {property.bedrooms} BR · {property.image_count} images</div><div style={{fontSize:13,marginTop:7,color:property.owner_name?"#d8c697":"#9f9480"}}>{property.owner_name?`Owner: ${property.owner_name}`:"Owner: unassigned"}</div></div><select disabled={busy} value={property.owner_id??""} onChange={event=>changeOwner(property.id,event.target.value)} style={field}><option value="">No owner</option>{owners.map(owner=><option key={owner.id} value={owner.id}>{owner.full_name}</option>)}</select></article>)}</section>
  </div>;
}

const field:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"12px 13px",borderRadius:12,border:"1px solid #4a3d25",background:"#13110d",color:"#f8f4ea",outline:"none"};
const button:React.CSSProperties={border:0,borderRadius:14,padding:"13px 18px",background:"#d9be7d",color:"#17130c",fontWeight:900,cursor:"pointer"};
