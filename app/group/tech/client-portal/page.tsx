import Link from "next/link";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {TechClientPortalPanel} from "@/components/vgroup/tech-client-portal-panel";

export default async function Page(){
  await requireBusinessUnitAccess("tech");
  return <main style={{minHeight:"100vh",background:"#070b12",color:"#eef7ff",padding:"28px 20px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}>
    <Link href="/group/tech" style={{color:"#42adf5",textDecoration:"none",fontWeight:800}}>← Vivit Technology</Link>
    <div style={{margin:"38px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#42adf5"}}>TECH CLIENT DELIVERY</div><h1 style={{fontSize:"clamp(34px,5vw,60px)",letterSpacing:"-.045em",margin:"9px 0 12px"}}>Client Portal</h1><p style={{maxWidth:760,color:"#9eb3c8",lineHeight:1.7}}>Live client-isolated project progress, phases, approved scope, updates and commercial position.</p></div>
    <TechClientPortalPanel/>
  </section></main>;
}
