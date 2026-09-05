import Link from "next/link";
import {notFound} from "next/navigation";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";
import {AirbnbSyncButton} from "@/components/vgroup/airbnb-sync-button";
import {AirbnbSyncAllButton} from "@/components/vgroup/airbnb-sync-all-button";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Channel={id:string;property_id:string;property_name:string;external_listing_id:string;status:string;last_sync_at:string|null;last_error:string|null;has_feed:boolean};
type Block={id:string;property_id:string;property_name:string;external_uid:string;summary:string;starts_on:string;ends_on:string;source:string};
const fmt=(value:string)=>new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));

export default async function HospitalityCalendarPage({searchParams}:{searchParams:Promise<{propertyId?:string}>}){
  const session=await requireBusinessPermission("hospitality","reservations:view");
  const canSync=hasPermission(session,"hospitality","reservations:create");
  const {propertyId:rawPropertyId}=await searchParams;
  if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
  const propertyId=rawPropertyId||"";
  const sql=getVGroupSql();
  let propertyName="";
  if(propertyId){const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;if(!property)notFound();propertyName=property.name}
  const channels=propertyId
    ?await sql<Channel[]>`select c.id::text,c.property_id::text,p.name property_name,c.external_listing_id,c.status,c.last_sync_at::text,c.last_error,(c.token_ref is not null and btrim(c.token_ref)<>'') has_feed from hospitality.channel_connections c join hospitality.properties p on p.id=c.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where c.channel='airbnb' and c.property_id=${propertyId}::uuid order by p.name,c.created_at`
    :await sql<Channel[]>`select c.id::text,c.property_id::text,p.name property_name,c.external_listing_id,c.status,c.last_sync_at::text,c.last_error,(c.token_ref is not null and btrim(c.token_ref)<>'') has_feed from hospitality.channel_connections c join hospitality.properties p on p.id=c.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where c.channel='airbnb' order by p.name,c.created_at`;
  const blocks=propertyId
    ?await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.external_uid,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where b.archived_at is null and b.ends_on>=current_date and b.property_id=${propertyId}::uuid order by b.starts_on,p.name limit 300`
    :await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.external_uid,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where b.archived_at is null and b.ends_on>=current_date order by b.starts_on,p.name limit 300`;
  const connected=Array.from(channels).filter(c=>c.status==="connected").length;
  const backHref=propertyId?`/group/hospitality/properties/${propertyId}`:"/group/hospitality";
  const syncable=Array.from(channels).filter(channel=>channel.status!=="disabled"&&channel.has_feed);
  return <main style={{minHeight:"100vh",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1240,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"start"}}><div><Link href={backHref} style={{fontWeight:900,textDecoration:"none"}}>← {propertyId?`${propertyName} dashboard`:"Hospitality"}</Link><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#A9791E",marginTop:30}}>HOSPITALITY CALENDAR</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"8px 0"}}>{propertyId?`${propertyName} · Airbnb calendar`:"Airbnb availability calendar"}</h1><p style={{color:"#746650",lineHeight:1.7,maxWidth:800}}>{propertyId?`Property context is locked to ${propertyName}. Only this apartment's Airbnb connection and availability blocks are shown.`:"Real Airbnb iCal synchronization across all connected VIVIT Hospitality properties. No fake availability and no manual copy of reservations."}</p></div>{canSync?(propertyId?syncable.map(channel=><AirbnbSyncButton key={channel.id} channelId={channel.id}/>):<AirbnbSyncAllButton/>):null}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"26px 0"}}>{[["Airbnb listings",Array.from(channels).length],["Connected",connected],["Upcoming blocks",Array.from(blocks).length]].map(([label,value])=><article key={String(label)} style={{padding:18,borderRadius:18,border:"1px solid rgba(201,154,61,.24)"}}><div style={{fontSize:11,color:"#746650",fontWeight:900,textTransform:"uppercase"}}>{label}</div><strong style={{display:"block",fontSize:27,marginTop:8}}>{value}</strong></article>)}</div>
    <article style={{padding:22,borderRadius:24,border:"1px solid rgba(201,154,61,.24)",marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}><h2 style={{marginTop:0}}>Airbnb connections</h2><span style={{fontSize:12,color:"#746650"}}>Calendar integration: Airbnb iCal</span></div>{Array.from(channels).length===0?<p style={{color:"#746650"}}>No Airbnb calendar feed is configured for this context.</p>:<div style={{display:"grid",gap:12}}>{Array.from(channels).map(channel=><div key={channel.id} style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",padding:"14px 0",borderBottom:"1px solid rgba(201,154,61,.14)"}}><div><strong>{channel.property_name}</strong><div style={{fontSize:12,color:"#746650",marginTop:5}}><a href={`https://www.airbnb.com/h/${channel.external_listing_id}`} target="_blank" rel="noreferrer">airbnb.com/h/{channel.external_listing_id}</a> · {channel.status}{channel.last_sync_at?` · Last sync ${channel.last_sync_at}`:" · Never synced"}</div>{channel.last_error&&<div style={{fontSize:12,color:"#B42318",marginTop:5}}>{channel.last_error}</div>}</div>{canSync&&channel.status!=="disabled"&&channel.has_feed?<AirbnbSyncButton channelId={channel.id}/>:null}</div>)}</div>}</article>
    <article style={{padding:22,borderRadius:24,border:"1px solid rgba(201,154,61,.24)"}}><h2 style={{marginTop:0}}>Upcoming availability blocks</h2>{Array.from(blocks).length===0?<p style={{color:"#746650"}}>No upcoming Airbnb blocks yet.</p>:<div style={{display:"grid",gap:10}}>{Array.from(blocks).map(block=><div key={block.id} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,padding:"13px 0",borderBottom:"1px solid rgba(201,154,61,.14)",alignItems:"center"}}><strong>{block.property_name}</strong><span>{block.summary||"Unavailable"}</span><span style={{color:"#746650"}}>{fmt(block.starts_on)} → {fmt(block.ends_on)}</span></div>)}</div>}</article>
  </section></main>;
}
