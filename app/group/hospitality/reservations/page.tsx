import Link from "next/link";
import {notFound} from "next/navigation";
import {HospitalityBookingForm} from "@/components/vgroup/hospitality-booking-form";
import {ReservationStatusActions} from "@/components/vgroup/reservation-status-actions";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ReservationRow={id:string;property_name:string;guest_name:string;check_in:string|Date;check_out:string|Date;status:string;net_owner_amount:number|string|null};
type PropertyOption={id:string;name:string;max_guests:number};

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
    ?await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null and r.property_id=${propertyId}::uuid order by r.check_in desc limit 60`
    :await sql<ReservationRow[]>`select r.id::text,p.name property_name,r.guest_name,r.check_in,r.check_out,r.status,r.net_owner_amount from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null order by r.check_in desc limit 80`;
  const properties=await sql<PropertyOption[]>`select id::text,name,max_guests from hospitality.properties where archived_at is null and status='active' order by name`;
  const formProperties=Array.from(properties).map(p=>({id:p.id,name:p.name,maxGuests:Number(p.max_guests||1)}));
  const today=new Date().toISOString().slice(0,10);
  const upcoming=Array.from(rows).filter(r=>String(r.check_out).slice(0,10)>=today&&!["cancelled","no_show"].includes(r.status));
  const arriving=upcoming.filter(r=>String(r.check_in).slice(0,10)===today).length;
  const leaving=upcoming.filter(r=>String(r.check_out).slice(0,10)===today).length;

  return <main style={{minHeight:"100vh",background:"#fff",color:"#101828",padding:"28px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}>
    <Link href="/group/hospitality" style={{fontWeight:900,textDecoration:"none",color:"#344054"}}>← Today</Link>
    <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"end",flexWrap:"wrap",margin:"28px 0 22px"}}><div><div style={{fontSize:12,fontWeight:900,color:"#667085",letterSpacing:".12em"}}>BOOKINGS</div><h1 style={{fontSize:"clamp(34px,5vw,58px)",letterSpacing:"-.05em",margin:"6px 0"}}>{propertyName||"Bookings"}</h1><p style={{margin:0,color:"#667085"}}>Create a stay, see what is coming next, and update the guest status.</p></div><Link href="/group/hospitality/calendar" style={{padding:"11px 15px",border:"1px solid #D0D5DD",borderRadius:14,textDecoration:"none",fontWeight:900,color:"#344054"}}>Open calendar</Link></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginBottom:22}}>{[["Arriving today",arriving],["Leaving today",leaving],["Upcoming stays",upcoming.length]].map(([label,value])=><article key={String(label)} style={{padding:16,border:"1px solid #E4E7EC",borderRadius:16,background:"#F9FAFB"}}><div style={{fontSize:12,color:"#667085",fontWeight:800}}>{label}</div><strong style={{display:"block",fontSize:26,marginTop:5}}>{value}</strong></article>)}</div>
    {canCreate?<HospitalityBookingForm properties={formProperties} defaultPropertyId={propertyId||undefined}/>:null}
    <section><h2 style={{fontSize:22,margin:"0 0 12px"}}>Upcoming & recent bookings</h2><div style={{display:"grid",gap:10}}>{Array.from(rows).map(r=><article key={r.id} style={{padding:16,border:"1px solid #E4E7EC",borderRadius:16,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:14,alignItems:"center",background:"#fff"}}><div><b style={{fontSize:16}}>{r.guest_name}</b><div style={{fontSize:13,color:"#667085",marginTop:4}}>{r.property_name} · {String(r.check_in).slice(0,10)} → {String(r.check_out).slice(0,10)}</div><div style={{fontSize:12,fontWeight:900,marginTop:6,color:"#475467"}}>{r.status.replaceAll("_"," ")}</div></div>{canUpdate?<ReservationStatusActions reservationId={r.id} status={r.status}/>:null}</article>)}{rows.length===0?<p style={{color:"#667085"}}>No bookings yet.</p>:null}</div></section>
  </section></main>;
}
