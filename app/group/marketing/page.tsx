import Link from "next/link";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {createMarketingHandoff,getMarketingIntegrationState} from "@/lib/vgroup/marketing-integration";
import {MarketingHandoffForm} from "@/components/vgroup/marketing-handoff-form";
import {VivitoLauncher} from "@/components/vgroup/vivito-launcher";

export const dynamic="force-dynamic";

export default async function MarketingIntegrationPage(){
  const session=await requireBusinessUnitAccess("marketing");
  const state=getMarketingIntegrationState();
  const handoff=state.enabled&&state.certified?createMarketingHandoff(session):null;
  return <main style={{minHeight:"100vh",background:"linear-gradient(145deg,#10090b,#1a0d11)",color:"#fff7f7",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{maxWidth:900,margin:"0 auto"}}>
      <Link href="/group" style={{color:"#ff7d84",textDecoration:"none",fontWeight:800}}>← Vivit Group</Link>
      <div style={{margin:"48px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#e75a63"}}>VIVIT MARKETING</div><h1 style={{fontSize:"clamp(36px,6vw,64px)",letterSpacing:"-.05em",margin:"10px 0"}}>Integration Gate</h1><p style={{color:"#caa9ad",lineHeight:1.7,maxWidth:720}}>The existing Marketing ERP remains isolated until the final controlled cutover. Access is issued only through a short-lived, single-use handoff and Marketing keeps authority over its own user status, role and workspace.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
        <article style={{padding:22,borderRadius:20,border:"1px solid #4b272c",background:"rgba(231,90,99,.08)"}}><div style={{fontSize:11,color:"#ba858b",fontWeight:900,letterSpacing:".1em"}}>CUTOVER</div><strong style={{display:"block",fontSize:24,marginTop:8}}>{state.enabled?"ENABLED":"LOCKED"}</strong></article>
        <article style={{padding:22,borderRadius:20,border:"1px solid #4b272c",background:"rgba(231,90,99,.08)"}}><div style={{fontSize:11,color:"#ba858b",fontWeight:900,letterSpacing:".1em"}}>CANDIDATE</div><strong style={{display:"block",fontSize:16,marginTop:8,wordBreak:"break-all"}}>{state.candidateSha.slice(0,12)}</strong></article>
        <article style={{padding:22,borderRadius:20,border:"1px solid #4b272c",background:"rgba(231,90,99,.08)"}}><div style={{fontSize:11,color:"#ba858b",fontWeight:900,letterSpacing:".1em"}}>CERTIFICATION</div><strong style={{display:"block",fontSize:24,marginTop:8}}>{state.certified?"MATCH":"REVIEW"}</strong></article>
      </div>
      {handoff?<MarketingHandoffForm endpoint={handoff.endpoint} assertion={handoff.assertion}/>:<div style={{marginTop:20,padding:22,borderRadius:20,border:"1px solid #403036",background:"rgba(255,255,255,.035)",color:"#c7b4b7",lineHeight:1.7}}>Marketing handoff remains fail-closed until the receiving bridge, dedicated secret, endpoint and explicit cutover flag are certified.</div>}
      <div style={{marginTop:14,fontSize:12,color:"#927a7e",lineHeight:1.6}}>Vivito is visible here in pre-integration mode, but Marketing task execution remains fail-closed. This integration does not mutate Marketing data, storage, OAuth, hosting, or deployment. Production mutation remains a separate explicitly approved cutover action.</div>
    </section><VivitoLauncher workspace="marketing"/>
  </main>;
}
