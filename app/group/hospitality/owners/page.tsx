import Link from "next/link";
import {OwnersManager} from "@/components/vgroup/owners-manager";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
export default async function OwnersPage(){
  const session=await requireBusinessPermission("hospitality","owners:view");
  const canCreate=hasPermission(session,"hospitality","owners:create");
  const canUpdate=hasPermission(session,"hospitality","owners:update");
  const sql=getVGroupSql();
  const owners=await sql<{id:string;full_name:string;email:string|null;phone:string|null;status:string;properties:number}[]>`select o.id::text,o.full_name,o.email,o.phone,o.status,count(p.id)::int properties from hospitality.owners o left join hospitality.properties p on p.owner_id=o.id and p.archived_at is null where o.archived_at is null group by o.id order by o.created_at desc limit 250`;
  return <main style={{minHeight:"100vh",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group/hospitality" style={{fontWeight:900,textDecoration:"none"}}>← Hospitality</Link><div style={{margin:"34px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#D6AD5B"}}>HOSPITALITY OWNERS</div><h1 style={{fontSize:"clamp(36px,6vw,64px)",letterSpacing:"-.055em",margin:"8px 0"}}>Owners</h1><p style={{color:"#C7B894",lineHeight:1.7,maxWidth:760}}>Create, maintain, suspend and reactivate owner records. User-account mapping stays protected and is not editable from this workspace.</p></div><OwnersManager initialOwners={Array.from(owners)} canCreate={canCreate} canUpdate={canUpdate}/></section></main>;
}
