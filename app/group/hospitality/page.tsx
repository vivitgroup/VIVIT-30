import Link from "next/link";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getVGroupRuntimeConfig} from "@/lib/vgroup/env";

export const dynamic="force-dynamic";
type PropertyCard={id:string;name:string;property_type:string;city:string|null;country:string;bedrooms:number;max_guests:number;status:string;owner_name:string|null;object_path:string|null;image_count:number;airbnb_connected:number;upcoming_blocks:number};

async function signedCover(objectPath:string|null){
  if(!objectPath)return null;
  const config=getVGroupRuntimeConfig();
  const response=await fetch(`${config.supabaseUrl}/storage/v1/object/sign/vgroup-hospitality/${objectPath}`,{method:"POST",headers:{Authorization:`Bearer ${config.serviceKey}`,apikey:config.serviceKey,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:900}),cache:"no-store"});
  if(!response.ok)return null;
  const body=await response.json() as {signedURL?:string;signedUrl?:string};
  const value=body.signedURL??body.signedUrl;
  return value?`${config.supabaseUrl}/storage/v1${value}`:null;
}

export default async function HospitalityEntry(){
  await requireBusinessUnitAccess("hospitality");
  const sql=getVGroupSql();
  const rows=await sql<PropertyCard[]>`select p.id::text,p.name,p.property_type,p.city,p.country,p.bedrooms,p.max_guests,p.status,o.full_name owner_name,
    (select i.object_path from hospitality.property_images i where i.property_id=p.id and i.archived_at is null order by i.is_cover desc,i.sort_order,i.created_at limit 1) object_path,
    (select count(*)::int from hospitality.property_images i where i.property_id=p.id and i.archived_at is null) image_count,
    (select count(*)::int from hospitality.channel_connections c where c.property_id=p.id and c.channel='airbnb' and lower(coalesce(c.status,''))='connected') airbnb_connected,
    (select count(*)::int from hospitality.calendar_blocks b where b.property_id=p.id and b.archived_at is null and b.ends_on>=current_date) upcoming_blocks
    from hospitality.properties p left join hospitality.owners o on o.id=p.owner_id where p.archived_at is null order by p.name`;
  const properties=await Promise.all(Array.from(rows).map(async property=>({...property,cover:await signedCover(property.object_path)})));
  return <main style={{minHeight:"100vh",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1240,margin:"0 auto"}}>
    <Link href="/group" style={{textDecoration:"none",fontWeight:900}}>← Vivit Group</Link>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:20,flexWrap:"wrap",margin:"38px 0 28px"}}><div><div style={{fontSize:12,letterSpacing:".20em",fontWeight:900,color:"#D6AD5B"}}>VIVIT HOSPITALITY</div><h1 style={{fontSize:"clamp(36px,6vw,70px)",letterSpacing:"-.06em",lineHeight:.95,margin:"10px 0"}}>Choose your property</h1><p style={{color:"#C7B894",maxWidth:760,lineHeight:1.75,margin:0}}>Every card now reads the same live property sources used by the internal dashboards: property images, Airbnb connection state and upcoming Airbnb calendar blocks.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href="/group/hospitality/calendar" style={{textDecoration:"none",border:"1px solid rgba(214,173,91,.35)",borderRadius:14,padding:"12px 16px",fontWeight:900}}>Calendar & Airbnb</Link><Link href="/group/hospitality/properties" style={{textDecoration:"none",border:"1px solid rgba(214,173,91,.35)",borderRadius:14,padding:"12px 16px",fontWeight:900}}>Manage properties</Link></div></div>
    {properties.length===0?<article style={{padding:34,borderRadius:28,border:"1px solid rgba(214,173,91,.3)"}}><h2 style={{marginTop:0}}>No apartments yet</h2><p style={{color:"#C7B894",lineHeight:1.7}}>Create the first property, upload its cover/gallery, then it will appear here as the Hospitality entry point.</p><Link href="/group/hospitality/properties" style={{fontWeight:900}}>Add first property →</Link></article>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:18}}>{properties.map(property=><Link key={property.id} href={`/group/hospitality/properties/${property.id}`} style={{textDecoration:"none",color:"inherit"}}><article style={{overflow:"hidden",borderRadius:28,border:"1px solid rgba(214,173,91,.28)",minHeight:390,display:"flex",flexDirection:"column"}}><div style={{height:190,background:property.cover?`linear-gradient(180deg,transparent,rgba(12,27,42,.78)),url(${property.cover}) center/cover no-repeat`:`radial-gradient(circle at 75% 20%,rgba(214,173,91,.28),transparent 28%),linear-gradient(145deg,#183246,#0C1B2A)`,position:"relative"}}><span style={{position:"absolute",left:16,top:16,borderRadius:999,padding:"7px 10px",background:"rgba(12,27,42,.82)",border:"1px solid rgba(214,173,91,.3)",fontSize:11,fontWeight:900,textTransform:"uppercase"}}>{property.status}</span><span style={{position:"absolute",right:16,top:16,borderRadius:999,padding:"7px 10px",background:"rgba(12,27,42,.82)",border:"1px solid rgba(214,173,91,.3)",fontSize:11,fontWeight:900,color:property.airbnb_connected?"#86efac":"#fbbf24"}}>{property.airbnb_connected?"AIRBNB CONNECTED":"AIRBNB NOT CONNECTED"}</span></div><div style={{padding:22,display:"grid",gap:10}}><div><h2 style={{fontSize:24,margin:0}}>{property.name}</h2><div style={{color:"#C7B894",marginTop:5}}>{property.city??"Location pending"} · {property.country}</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:12,color:"#E7D6AE"}}><span>{property.property_type}</span><span>•</span><span>{property.bedrooms} BR</span><span>•</span><span>Up to {property.max_guests} guests</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,fontSize:12,color:"#C7B894"}}><span>Photos <b style={{color:"#fff"}}>{property.image_count}</b></span><span>Upcoming Airbnb blocks <b style={{color:"#fff"}}>{property.upcoming_blocks}</b></span></div><div style={{fontSize:13,color:property.owner_name?"#EAD59E":"#AFA58F"}}>{property.owner_name?`Owner: ${property.owner_name}`:"Owner not assigned"}</div><strong style={{color:"#D6AD5B",marginTop:4}}>Open property dashboard →</strong></div></article></Link>)}</div>}
  </section></main>;
}
