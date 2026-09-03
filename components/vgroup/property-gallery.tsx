import Link from "next/link";
import {notFound} from "next/navigation";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getVGroupRuntimeConfig} from "@/lib/vgroup/env";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ImageRow={id:string;object_path:string;file_name:string;caption:string|null;alt_text:string|null;is_cover:boolean;sort_order:number};

async function signedUrl(objectPath:string){
  const config=getVGroupRuntimeConfig();
  const response=await fetch(`${config.supabaseUrl}/storage/v1/object/sign/vgroup-hospitality/${objectPath}`,{method:"POST",headers:{Authorization:`Bearer ${config.serviceKey}`,apikey:config.serviceKey,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:900}),cache:"no-store"});
  if(!response.ok)return null;
  const body=await response.json() as {signedURL?:string;signedUrl?:string};
  const value=body.signedURL??body.signedUrl;
  return value?`${config.supabaseUrl}/storage/v1${value}`:null;
}

export default async function PropertyGallery({propertyId}:{propertyId:string}){
  await requireBusinessUnitAccess("hospitality");
  if(!uuid.test(propertyId))notFound();
  const sql=getVGroupSql();
  const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;if(!property)notFound();
  const images=await sql<ImageRow[]>`select id::text,object_path,file_name,caption,alt_text,is_cover,sort_order from hospitality.property_images where property_id=${propertyId}::uuid and archived_at is null order by is_cover desc,sort_order,created_at`;
  const [channel]=await sql<{status:string;external_listing_id:string}[]>`select status,external_listing_id from hospitality.channel_connections where property_id=${propertyId}::uuid and channel='airbnb' order by created_at limit 1`;
  const rendered=await Promise.all(Array.from(images).map(async image=>({...image,url:await signedUrl(image.object_path)})));
  return <section style={{maxWidth:1240,margin:"20px auto 0",padding:"0 22px",fontFamily:"Inter,system-ui,sans-serif"}}><article style={{padding:18,borderRadius:22,border:"1px solid rgba(214,173,91,.28)",background:"rgba(214,173,91,.035)"}}><div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"baseline",flexWrap:"wrap"}}><div><div style={{fontSize:11,fontWeight:900,letterSpacing:".14em",color:"#D6AD5B"}}>PROPERTY GALLERY · {property.name.toUpperCase()}</div><h2 style={{margin:"6px 0 0"}}>Apartment images</h2></div><Link href="/group/hospitality/properties" style={{fontWeight:900,textDecoration:"none",color:"#D6AD5B"}}>Manage images →</Link></div>{rendered.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginTop:14}}>{rendered.map(image=><figure key={image.id} style={{margin:0}}><div style={{height:150,borderRadius:16,background:image.url?`url(${image.url}) center/cover no-repeat`:`linear-gradient(145deg,#183246,#0C1B2A)`,border:"1px solid rgba(214,173,91,.2)"}}/><figcaption style={{fontSize:11,color:"#C7B894",marginTop:5}}>{image.is_cover?"Cover · ":""}{image.caption||image.alt_text||image.file_name}</figcaption></figure>)}</div>:<div style={{marginTop:12,padding:"14px 0",color:"#C7B894",lineHeight:1.7}}><strong style={{color:"#F7E3AA"}}>No property images are stored yet.</strong><div>{channel?`Airbnb calendar is ${channel.status}, but the current Airbnb connection is iCal availability sync; iCal does not carry listing photos. Upload images here or connect an approved Airbnb API integration for photo metadata.`:"Add the apartment cover/gallery once and every Hospitality surface will read from the same property_images source."}</div></div>}</article></section>;
}
