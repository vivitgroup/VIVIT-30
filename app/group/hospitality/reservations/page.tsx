import Link from "next/link";
import {notFound} from "next/navigation";
import {WorkspacePage} from "@/components/vgroup/workspace-page";
import {JsonMutationForm} from "@/components/vgroup/json-mutation-form";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ReservationRow={id:string;property_name:string;guest_name:string;check_in:string|Date;check_out:string|Date;status:string;net_owner_amount:number|string|null};
export default async function Page({searchParams}:{searchParams:Promise<{propertyId?:string}>}){
 await requireBusinessUnitAccess("hospitality");
 const {propertyId:rawPropertyId}=await searchParams;
 if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
 const propertyId=rawPropertyId||null;
 const sql=getVGroupSql();
 let propertyName:string|null=null;
 if(propertyId){const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;if(!property)notFound();propertyName=property.name}
 const rows=propertyId
  ?await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null and r.property_id=${propertyId}::uuid order by r.check_in desc limit 40`
  :await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null order by r.check_in desc limit 40`;
 return <><WorkspacePage tone="hospitality" eyebrow="HOSPITALITY OPERATIONS" title={propertyName?`${propertyName} · Reservations & Calendar`:"Reservations & Calendar"} description={propertyName?`Property context is locked to ${propertyName}. Reservations created or reviewed here stay inside this apartment.`:"Central reservation workspace with channel-aware booking integrity and no-overlap protection."} sections={[{title:"Calendar",body:"Unified stay timeline across properties"},{title:"Reservations",body:"Pending, confirmed, checked-in, checked-out and cancelled stays"},{title:"Channel Sync",body:"Airbnb / Booking abstraction, external IDs and sync-failure handling"},{title:"Booking Integrity",body:"Database-level prevention of double booking and invalid date ranges"}]}/><section style={{maxWidth:1180,margin:"-40px auto 60px",padding:"0 20px",color:"#f7f1e3"}}>{propertyId&&propertyName?<div style={{marginBottom:14,padding:"12px 14px",border:"1px solid #6b5528",borderRadius:14,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b>PROPERTY CONTEXT · {propertyName}</b><Link href={`/group/hospitality/properties/${propertyId}`} style={{color:"#d6ad5b"}}>← Property dashboard</Link></div>:null}<JsonMutationForm tone="hospitality" endpoint="/api/vgroup/hospitality/reservations" title="Create reservation" submitLabel="Create booking" fields={[{name:"propertyId",label:"Property ID",required:true,defaultValue:propertyId||undefined,readOnly:Boolean(propertyId)},{name:"guestName",label:"Guest name",required:true},{name:"guestEmail",label:"Guest email",type:"email"},{name:"checkIn",label:"Check-in",type:"date",required:true},{name:"checkOut",label:"Check-out",type:"date",required:true},{name:"guests",label:"Guests",type:"number",required:true},{name:"grossAmount",label:"Gross amount",type:"number",required:true},{name:"platformFee",label:"Platform fee",type:"number"},{name:"companyCommission",label:"Company commission",type:"number"}]}/><div style={{marginTop:20,display:"grid",gap:10}}>{Array.from(rows).map(r=><article key={r.id} style={{padding:15,border:"1px solid #4a3a1c",borderRadius:14,display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}><div><b>{r.guest_name}</b><div style={{fontSize:12,color:"#b7aa8b"}}>{r.property_name} · {String(r.check_in)} → {String(r.check_out)}</div></div><div style={{fontSize:12,fontWeight:900}}>{r.status} · Net {Number(r.net_owner_amount||0).toFixed(2)}</div></article>)}</div></section></>
}
