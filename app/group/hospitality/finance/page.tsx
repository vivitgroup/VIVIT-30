export const dynamic="force-dynamic";

import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {HospitalityFinancePanel} from "@/components/vgroup/hospitality-finance-panel";
import {getVGroupSql} from "@/lib/vgroup/db";
const uuid=/^[0-9a-f-]{36}$/i;
export default async function Page({searchParams}:{searchParams:Promise<{propertyId?:string}>}){
  const session=await requireBusinessPermission("hospitality","finance:view");
  const isOwner=session.memberships.some(item=>item.businessUnit==="hospitality"&&item.role==="OWNER");
  if(isOwner)redirect("/group/hospitality/owner-portal");
  const {propertyId:rawPropertyId}=await searchParams;
  if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
  const propertyId=rawPropertyId||"";
  let propertyName="";
  if(propertyId){
    const sql=getVGroupSql();
    const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;
    if(!property)notFound();
    propertyName=property.name;
  }
  return <main style={{minHeight:"100vh",background:"#0c0b09",color:"#f7f1e3",padding:"28px 20px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href={propertyId?`/group/hospitality/properties/${propertyId}`:"/group/hospitality"} style={{color:"#d6ad5b",textDecoration:"none",fontWeight:800}}>← {propertyId?"Property dashboard":"Hospitality"}</Link><div style={{margin:"38px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#d6ad5b"}}>HOSPITALITY FINANCE</div><h1 style={{fontSize:"clamp(34px,5vw,60px)",letterSpacing:"-.045em",margin:"9px 0 12px"}}>Finance & Statements</h1><p style={{maxWidth:760,color:"#b7aa8b",lineHeight:1.7}}>{propertyId?`Property context: ${propertyName}. Expenses, refunds, deposits and reservation finance are restricted to this property. Owner-level statements stay hidden here because they are portfolio-level documents.`:"Ledger-led control for statements, deposits, refunds and payout readiness with approval/reconciliation separation."}</p></div><HospitalityFinancePanel propertyId={propertyId||undefined}/></section></main>
}
