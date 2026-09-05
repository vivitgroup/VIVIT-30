import Link from "next/link";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {PropertyManager} from "@/components/vgroup/property-manager";

export const dynamic="force-dynamic";
export default async function PropertiesPage(){
  await requireBusinessPermission("hospitality","properties:view");
  const sql=getVGroupSql();
  const owners=await sql`select id::text,full_name from hospitality.owners where archived_at is null order by full_name`;
  const properties=await sql`select p.id::text,p.owner_id::text,o.full_name owner_name,p.name,p.property_type,p.city,p.country,p.bedrooms,p.bathrooms,p.max_guests,p.status,
    coalesce((select count(*)::int from hospitality.property_images i where i.property_id=p.id and i.archived_at is null),0) image_count
    from hospitality.properties p left join hospitality.owners o on o.id=p.owner_id where p.archived_at is null order by p.created_at desc limit 250`;
  return <main style={{minHeight:"100vh",background:"#f8fafc",color:"#111827",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group/hospitality" style={{color:"#334155",textDecoration:"none",fontWeight:800}}>← Hospitality</Link><div style={{margin:"32px 0 24px"}}><div style={{fontSize:12,letterSpacing:".14em",fontWeight:900,color:"#64748b"}}>PROPERTIES</div><h1 style={{fontSize:"clamp(34px,5vw,56px)",letterSpacing:"-.05em",margin:"8px 0",color:"#0f172a"}}>Properties</h1><p style={{color:"#64748b",maxWidth:680,lineHeight:1.6,margin:0}}>Add a property, upload photos, assign an owner, record an expense, or open its dashboard from one place.</p></div><PropertyManager owners={Array.from(owners) as Array<{id:string;full_name:string}>} initialProperties={Array.from(properties) as never}/></section></main>;
}