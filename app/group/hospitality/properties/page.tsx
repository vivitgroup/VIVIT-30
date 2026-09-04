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
  return <main style={{minHeight:"100vh",background:"linear-gradient(145deg,#0b0a08,#17130c)",color:"#f8f4ea",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group/hospitality" style={{color:"#cdb277",textDecoration:"none",fontWeight:800}}>← Hospitality</Link><div style={{margin:"36px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#b89a58"}}>PROPERTY OPERATIONS</div><h1 style={{fontSize:"clamp(34px,5vw,58px)",letterSpacing:"-.05em",margin:"8px 0"}}>Properties & Units</h1><p style={{color:"#b9ad94",maxWidth:760,lineHeight:1.7}}>Create a unit with or without an owner, attach ownership later with history, and upload its cover/gallery directly from the device.</p></div><PropertyManager owners={Array.from(owners) as Array<{id:string;full_name:string}>} initialProperties={Array.from(properties) as never}/></section></main>;
}
