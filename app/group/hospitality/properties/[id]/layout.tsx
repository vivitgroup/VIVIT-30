import {notFound} from "next/navigation";
import PropertyGallery from "@/components/vgroup/property-gallery";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PropertyLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  await requireBusinessUnitAccess("hospitality");
  const {id}=await params;
  if(!uuid.test(id))notFound();
  const sql=getVGroupSql();
  const [state]=await sql<{name:string;airbnb_connected:number;airbnb_blocks:number;reservations:number;images:number}[]>`
    select p.name,
      (select count(*)::int from hospitality.channel_connections c where c.property_id=p.id and c.channel='airbnb' and c.status='connected') airbnb_connected,
      (select count(*)::int from hospitality.calendar_blocks b where b.property_id=p.id and b.archived_at is null and b.ends_on>=current_date) airbnb_blocks,
      (select count(*)::int from hospitality.reservations r where r.property_id=p.id and r.archived_at is null and r.status not in ('cancelled','no_show')) reservations,
      (select count(*)::int from hospitality.property_images i where i.property_id=p.id and i.archived_at is null) images
    from hospitality.properties p where p.id=${id}::uuid and p.archived_at is null limit 1`;
  if(!state)notFound();
  const metrics:[[string,string|number],[string,string|number],[string,string|number],[string,string|number]]=[
    ["Airbnb",state.airbnb_connected?"Connected":"Not connected"],
    ["Upcoming Airbnb blocks",state.airbnb_blocks],
    ["VIVIT reservations",state.reservations],
    ["Property images",state.images],
  ];
  return <><section style={{maxWidth:1240,margin:"22px auto 0",padding:"0 22px",fontFamily:"Inter,system-ui,sans-serif"}}><div style={{padding:16,borderRadius:18,border:"1px solid rgba(214,173,91,.3)",background:"rgba(214,173,91,.045)"}}><div style={{fontSize:11,letterSpacing:".14em",fontWeight:900,color:"#D6AD5B"}}>LIVE PROPERTY SOURCE · {state.name.toUpperCase()}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:12}}>{metrics.map(([label,value])=><div key={label}><div style={{fontSize:11,opacity:.68,textTransform:"uppercase"}}>{label}</div><strong style={{display:"block",marginTop:3}}>{value}</strong></div>)}</div><p style={{fontSize:12,opacity:.68,lineHeight:1.55,margin:"12px 0 0"}}>Airbnb iCal availability is tracked separately from VIVIT reservations because iCal does not provide trusted guest or financial booking data. Every property surface must use these same live sources.</p></div></section><PropertyGallery propertyId={id}/>{children}</>;
}
