import Link from "next/link";
import {notFound} from "next/navigation";
import {WorkspacePage} from "@/components/vgroup/workspace-page";
import {JsonMutationForm} from "@/components/vgroup/json-mutation-form";
import {ReservationStatusActions} from "@/components/vgroup/reservation-status-actions";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ReservationRow={id:string;property_name:string;guest_name:string;check_in:string|Date;check_out:string|Date;status:string;net_owner_amount:number|string|null};
type BlockRow={id:string;property_name:string;summary:string;starts_on:string|Date;ends_on:string|Date;source:string};

export default async function Page({searchParams}:{searchParams:Promise<{propertyId?:string}>}){
  const session=await requireBusinessPermission("hospitality","reservations:view");
  const canCreate=hasPermission(session,"hospitality","reservations:create");
  const canUpdate=hasPermission(session,"hospitality","reservations:update");
  const {propertyId:rawPropertyId}=await searchParams;
  if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
  const propertyId=rawPropertyId||null;
  const sql=getVGroupSql();
  let propertyName:string|null=null;
  if(propertyId){const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;if(!property)notFound();propertyName=property.name}
  const rows=propertyId
    ?await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null and r.property_id=${propertyId}::uuid order by r.check_in desc limit 40`
    :await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null order by r.check_in desc limit 40`;
  const blocks=propertyId
    ?await sql<BlockRow[]>`select b.id::text,p.name property_name,b.summary,b.starts_on,b.ends_on,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and b.ends_on>=current_date and b.property_id=${propertyId}::uuid order by b.starts_on limit 80`
    :await sql<BlockRow[]>`select b.id::text,p.name property_name,b.summary,b.starts_on,b.ends_on,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and b.ends_on>=current_date order by b.starts_on limit 120`;
  return <>
    <WorkspacePage tone="hospitality" eyebrow="HOSPITALITY OPERATIONS" title={propertyName?`${propertyName} · Reservations & Calendar`:"Reservations & Calendar"} description={propertyName?`Property context is locked to ${propertyName}. VIVIT reservations and Airbnb iCal availability are shown together without inventing guest or finance data from iCal.`:"Central reservation workspace with channel-aware availability, booking integrity and no-overlap protection."} sections={[{title:"Calendar",body:`${blocks.length} live Airbnb/channel availability blocks`},{title:"Reservations",body:`${rows.length} VIVIT reservation records in this view`},{title:"Channel Sync",body:"Airbnb iCal availability stays separate from trusted reservation records"},{title:"Booking Integrity",body:"Reservation create, move and activation all reject synced channel conflicts"}]}/>
    <section style={{maxWidth:1180,margin:"-40px auto 60px",padding:"0 20px",color:"#101828"}}>
      {propertyId&&propertyName?<div style={{marginBottom:14,padding:"12px 14px",border:"1px solid #E4E7EC",borderRadius:14,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",background:"#fff"}}><b>PROPERTY CONTEXT · {propertyName}</b><Link href={`/group/hospitality/properties/${propertyId}`} style={{color:"#344054"}}>← Property dashboard</Link></div>:null}
      <article style={{padding:16,border:"1px solid #E4E7EC",borderRadius:16,marginBottom:18,background:"#F9FAFB"}}><div style={{fontSize:11,letterSpacing:".12em",fontWeight:900,color:"#667085"}}>LIVE AVAILABILITY SOURCE</div><strong style={{display:"block",marginTop:5,color:"#101828"}}>{blocks.length} upcoming Airbnb/channel block{blocks.length===1?"":"s"}</strong><p style={{fontSize:12,color:"#667085",lineHeight:1.6,marginBottom:0}}>These dates affect availability everywhere in Hospitality. They are not converted into guest reservations because Airbnb iCal does not contain trusted guest identity or booking finance.</p></article>
      {canCreate?<JsonMutationForm tone="hospitality" endpoint="/api/vgroup/hospitality/reservations" title="Create reservation" submitLabel="Create booking" fields={[{name:"propertyId",label:"Property ID",required:true,defaultValue:propertyId||undefined,readOnly:Boolean(propertyId)},{name:"guestName",label:"Guest name",required:true},{name:"guestEmail",label:"Guest email",type:"email"},{name:"checkIn",label:"Check-in",type:"date",required:true},{name:"checkOut",label:"Check-out",type:"date",required:true},{name:"guests",label:"Guests",type:"number",required:true},{name:"grossAmount",label:"Gross amount",type:"number",required:true},{name:"platformFee",label:"Platform fee",type:"number"},{name:"companyCommission",label:"Company commission",type:"number"}]}/>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:18,marginTop:20}}>
        <section><h2 style={{color:"#101828"}}>VIVIT reservations</h2><div style={{display:"grid",gap:10}}>{Array.from(rows).map(r=><article key={r.id} style={{padding:15,border:"1px solid #E4E7EC",borderRadius:14,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:14,alignItems:"center",background:"#fff"}}><div><b>{r.guest_name}</b><div style={{fontSize:12,color:"#667085"}}>{r.property_name} · {String(r.check_in)} → {String(r.check_out)}</div><div style={{fontSize:12,fontWeight:900,marginTop:4,color:"#344054"}}>{r.status} · Net {Number(r.net_owner_amount||0).toFixed(2)}</div></div>{canUpdate?<ReservationStatusActions reservationId={r.id} status={r.status}/>:null}</article>)}{rows.length===0?<p style={{color:"#667085"}}>No VIVIT reservation records yet.</p>:null}</div></section>
        <section><h2 style={{color:"#101828"}}>Airbnb / channel availability</h2><div style={{display:"grid",gap:10}}>{Array.from(blocks).map(b=><article key={b.id} style={{padding:15,border:"1px solid #E4E7EC",borderRadius:14,background:"#F9FAFB"}}><b>{b.property_name}</b><div style={{fontSize:12,color:"#667085",marginTop:5}}>{b.summary||"Unavailable"} · {String(b.starts_on)} → {String(b.ends_on)} · {b.source}</div></article>)}{blocks.length===0?<p style={{color:"#667085"}}>No upcoming channel availability blocks.</p>:null}</div></section>
      </div>
    </section>
  </>;
}
