import Link from "next/link";
import {redirect} from "next/navigation";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getVGroupRuntimeConfig} from "@/lib/vgroup/env";

export const dynamic="force-dynamic";

type PropertyCard={
  id:string;
  name:string;
  city:string|null;
  country:string;
  bedrooms:number;
  max_guests:number;
  status:string;
  object_path:string|null;
  airbnb_connected:number;
};

type TodayStats={arrivals:number;departures:number;in_house:number;open_tasks:number};

async function signedCover(objectPath:string|null){
  if(!objectPath)return null;
  const config=getVGroupRuntimeConfig();
  const response=await fetch(`${config.supabaseUrl}/storage/v1/object/sign/vgroup-hospitality/${objectPath}`,{
    method:"POST",
    headers:{Authorization:`Bearer ${config.serviceKey}`,apikey:config.serviceKey,"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn:900}),
    cache:"no-store"
  });
  if(!response.ok)return null;
  const body=await response.json() as {signedURL?:string;signedUrl?:string};
  const value=body.signedURL??body.signedUrl;
  return value?`${config.supabaseUrl}/storage/v1${value}`:null;
}

export default async function HospitalityEntry(){
  const session=await requireBusinessUnitAccess("hospitality");
  const isOwner=session.memberships.some(item=>item.businessUnit==="hospitality"&&item.role==="OWNER");
  if(isOwner)redirect("/group/hospitality/owner-portal");

  const canProperties=hasPermission(session,"hospitality","properties:view");
  if(!canProperties){
    if(hasPermission(session,"hospitality","finance:view"))redirect("/group/hospitality/finance");
    redirect("/");
  }

  const sql=getVGroupSql();
  const [stats]=await sql<TodayStats[]>`select
    (select count(*)::int from hospitality.reservations where archived_at is null and status in ('confirmed','checked_in') and check_in=current_date) arrivals,
    (select count(*)::int from hospitality.reservations where archived_at is null and status='checked_in' and check_out=current_date) departures,
    (select count(*)::int from hospitality.reservations where archived_at is null and status='checked_in' and check_in<=current_date and check_out>current_date) in_house,
    (select count(*)::int from hospitality.housekeeping_tasks where status not in ('passed','cancelled')) open_tasks`;

  const rows=await sql<PropertyCard[]>`select p.id::text,p.name,p.city,p.country,p.bedrooms,p.max_guests,p.status,
    (select i.object_path from hospitality.property_images i where i.property_id=p.id and i.archived_at is null order by i.is_cover desc,i.sort_order,i.created_at limit 1) object_path,
    (select count(*)::int from hospitality.channel_connections c where c.property_id=p.id and c.channel='airbnb' and lower(coalesce(c.status,''))='connected') airbnb_connected
    from hospitality.properties p
    where p.archived_at is null
    order by p.name`;

  const properties=await Promise.all(Array.from(rows).map(async property=>({...property,cover:await signedCover(property.object_path)})));
  const today=stats??{arrivals:0,departures:0,in_house:0,open_tasks:0};

  const actions=[
    {label:"Calendar",href:"/group/hospitality/calendar"},
    {label:"Bookings",href:"/group/hospitality/reservations"},
    {label:"Properties",href:"/group/hospitality/properties"},
    {label:"Money",href:"/group/hospitality/finance"},
  ];

  return <main style={{minHeight:"100vh",padding:"28px 22px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{maxWidth:1240,margin:"0 auto"}}>
      <Link href="/" style={{textDecoration:"none",fontWeight:900}}>← VIVIT Group</Link>

      <div style={{margin:"34px 0 22px"}}>
        <div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#D6AD5B"}}>VIVIT HOSPITALITY</div>
        <h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",lineHeight:1,margin:"8px 0"}}>Today</h1>
        <p style={{color:"#C7B894",margin:0}}>Everything you need for today, in one place.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[
          ["Arrivals",today.arrivals],
          ["Departures",today.departures],
          ["In house",today.in_house],
          ["Open tasks",today.open_tasks],
        ].map(([label,value])=><article key={String(label)} style={{padding:"16px 18px",borderRadius:18,border:"1px solid rgba(214,173,91,.25)"}}><div style={{fontSize:12,color:"#C7B894"}}>{label}</div><strong style={{fontSize:30}}>{value}</strong></article>)}
      </div>

      <nav style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:30}}>
        {actions.map(action=><Link key={action.label} href={action.href} style={{textDecoration:"none",textAlign:"center",padding:"14px 12px",borderRadius:16,border:"1px solid rgba(214,173,91,.35)",fontWeight:900}}>{action.label}</Link>)}
      </nav>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
        <h2 style={{fontSize:22,margin:0}}>Properties</h2>
        <Link href="/group/hospitality/properties" style={{fontSize:13,fontWeight:900,textDecoration:"none",color:"#D6AD5B"}}>Manage →</Link>
      </div>

      {properties.length===0?
        <article style={{padding:28,borderRadius:24,border:"1px solid rgba(214,173,91,.3)"}}><h2 style={{marginTop:0}}>No properties yet</h2><Link href="/group/hospitality/properties" style={{fontWeight:900}}>Add property →</Link></article>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>{properties.map(property=><Link key={property.id} href={`/group/hospitality/properties/${property.id}`} style={{textDecoration:"none",color:"inherit"}}><article style={{overflow:"hidden",borderRadius:24,border:"1px solid rgba(214,173,91,.25)"}}>
          <div style={{height:170,background:property.cover?`linear-gradient(180deg,transparent,rgba(12,27,42,.72)),url(${property.cover}) center/cover no-repeat`:`linear-gradient(145deg,#183246,#0C1B2A)`}}/>
          <div style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}><div><h3 style={{fontSize:21,margin:0}}>{property.name}</h3><div style={{color:"#C7B894",fontSize:13,marginTop:4}}>{property.city??property.country}</div></div><span style={{fontSize:11,fontWeight:900,color:property.airbnb_connected?"#86efac":"#fbbf24"}}>{property.airbnb_connected?"Connected":"Needs setup"}</span></div>
            <div style={{marginTop:12,fontSize:13,color:"#E7D6AE"}}>{property.bedrooms} BR · Up to {property.max_guests} guests</div>
          </div>
        </article></Link>)}</div>}
    </section>
  </main>;
}
