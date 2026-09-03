import Link from "next/link";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {AirbnbSyncButton} from "@/components/vgroup/airbnb-sync-button";
import {AirbnbSyncAllButton} from "@/components/vgroup/airbnb-sync-all-button";

export const dynamic="force-dynamic";
type Channel={id:string;property_id:string;property_name:string;external_listing_id:string;status:string;last_sync_at:string|null;last_error:string|null};
type Block={id:string;property_id:string;property_name:string;external_uid:string;summary:string;starts_on:string;ends_on:string;source:string};
const fmt=(value:string)=>new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));

export default async function HospitalityCalendarPage(){
  await requireBusinessUnitAccess("hospitality");
  const sql=getVGroupSql();
  const channels=await sql<Channel[]>`
    select c.id::text,c.property_id::text,p.name property_name,c.external_listing_id,c.status,c.last_sync_at::text,c.last_error
    from hospitality.channel_connections c
    join hospitality.properties p on p.id=c.property_id and p.archived_at is null
    join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active'
    where c.channel='airbnb' order by p.name,c.created_at`;
  const blocks=await sql<Block[]>`
    select b.id::text,b.property_id::text,p.name property_name,b.external_uid,b.summary,b.starts_on::text,b.ends_on::text,b.source
    from hospitality.calendar_blocks b
    join hospitality.properties p on p.id=b.property_id and p.archived_at is null
    join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active'
    where b.archived_at is null and b.ends_on>=current_date
    order by b.starts_on,p.name limit 300`;
  const connected=channels.filter(c=>c.status==="connected").length;
  return <main style={{minHeight:"100vh",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1240,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"start"}}><div><Link href="/group/hospitality" style={{fontWeight:900,textDecoration:"none"}}>← Hospitality</Link><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#D6AD5B",marginTop:30}}>HOSPITALITY CALENDAR</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"8px 0"}}>Airbnb availability calendar</h1><p style={{color:"#C7B894",lineHeight:1.7,maxWidth:800}}>Real Airbnb iCal synchronization across all connected VIVIT Hospitality properties. No fake availability and no manual copy of reservations.</p></div><AirbnbSyncAllButton/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"26px 0"}}>{[["Airbnb listings",channels.length],["Connected",connected],["Upcoming blocks",blocks.length]].map(([label,value])=><article key={String(label)} style={{padding:18,borderRadius:18,border:"1px solid rgba(214,173,91,.28)"}}><div style={{fontSize:11,color:"#C7B894",fontWeight:900,textTransform:"uppercase"}}>{label}</div><strong style={{display:"block",fontSize:27,marginTop:8}}>{value}</strong></article>)}</div>
    <article style={{padding:22,borderRadius:24,border:"1px solid rgba(214,173,91,.28)",marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}><h2 style={{marginTop:0}}>Airbnb connections</h2><span style={{fontSize:12,color:"#C7B894"}}>Calendar integration: Airbnb iCal</span></div>{channels.length===0?<p style={{color:"#C7B894"}}>No Airbnb calendar feeds are configured.</p>:<div style={{display:"grid",gap:12}}>{channels.map(channel=><div key={channel.id} style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",padding:"14px 0",borderBottom:"1px solid rgba(214,173,91,.12)"}}><div><strong>{channel.property_name}</strong><div style={{fontSize:12,color:"#C7B894",marginTop:5}}><a href={`https://www.airbnb.com/h/${channel.external_listing_id}`} target="_blank" rel="noreferrer">airbnb.com/h/{channel.external_listing_id}</a> · {channel.status}{channel.last_sync_at?` · Last sync ${channel.last_sync_at}`:" · Never synced"}</div>{channel.last_error&&<div style={{fontSize:12,color:"#FFB8B8",marginTop:5}}>{channel.last_error}</div>}</div><AirbnbSyncButton channelId={channel.id}/></div>)}</div>}</article>
    <article style={{padding:22,borderRadius:24,border:"1px solid rgba(214,173,91,.28)"}}><h2 style={{marginTop:0}}>Upcoming availability blocks</h2>{blocks.length===0?<p style={{color:"#C7B894"}}>No upcoming Airbnb blocks yet. Use Sync all Airbnb calendars.</p>:<div style={{display:"grid",gap:10}}>{blocks.map(block=><div key={block.id} style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) minmax(180px,2fr) minmax(190px,1fr)",gap:12,padding:"13px 0",borderBottom:"1px solid rgba(214,173,91,.12)",alignItems:"center"}}><strong>{block.property_name}</strong><span>{block.summary||"Unavailable"}</span><span style={{color:"#C7B894"}}>{fmt(block.starts_on)} → {fmt(block.ends_on)}</span></div>)}</div>}</article>
  </section></main>;
}
