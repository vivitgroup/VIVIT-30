import Link from "next/link";
import {notFound} from "next/navigation";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {OwnerPortalPanel} from "@/components/vgroup/owner-portal-panel";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getHospitalityOwnerScope,ownerCanAccessProperty} from "@/lib/vgroup/hospitality-owner-scope";
const uuid=/^[0-9a-f-]{36}$/i;
export default async function Page({searchParams}:{searchParams:Promise<{propertyId?:string}>}){
  const session=await requireBusinessUnitAccess("hospitality");
  const {propertyId:rawPropertyId}=await searchParams;
  if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
  const propertyId=rawPropertyId||"";
  let propertyName="";
  if(propertyId){
    const ownerScope=await getHospitalityOwnerScope(session);
    if(!ownerCanAccessProperty(ownerScope,propertyId))notFound();
    const sql=getVGroupSql();
    const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;
    if(!property)notFound();
    propertyName=property.name;
  }
  return <main style={{minHeight:"100vh",background:"#0c0b09",color:"#f7f1e3",padding:"28px 20px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group/hospitality/owner-portal" style={{color:"#d6ad5b",textDecoration:"none",fontWeight:800}}>← Owner portfolio</Link><div style={{margin:"38px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#d6ad5b"}}>VIVIT HOSPITALITY</div><h1 style={{fontSize:"clamp(34px,5vw,60px)",letterSpacing:"-.045em",margin:"9px 0 12px"}}>Owner Portal</h1><p style={{maxWidth:760,color:"#b7aa8b",lineHeight:1.7}}>{propertyId?`Property context: ${propertyName}. Reservations, invoices and work orders are restricted to this property; portfolio statements are hidden because they are owner-wide.`:"Owner-scoped live portfolio, reservations, invoices, maintenance and monthly statements. OWNER accounts are restricted to their own linked owner record."}</p></div><OwnerPortalPanel propertyId={propertyId||undefined}/></section></main>
}
