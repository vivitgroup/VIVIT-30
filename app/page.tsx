import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/permissions";
import { Role } from "@/lib/types";

export default async function LandingPage(){
  const session=await auth();
  if(session?.user)redirect(homeFor((session.user as any).role as Role));
  const features=[
    ["🎯","CRM & Sales","Pipeline, leads, clients and follow-ups in one place."],
    ["📣","Media Buying","Budgets, ROAS and campaign performance across platforms."],
    ["🎨","Creative Workflow","Briefs, production, review and client approvals."],
    ["💰","Finance","Invoices, expenses, payroll and financial visibility."],
    ["👥","Team & Access","Role-based permissions with Super Admin approval."],
    ["📊","Live Reporting","Clear dashboards and decisions backed by real data."],
  ];
  return <main style={{minHeight:"100vh",background:"#F8F5ED",color:"#211F1E",fontFamily:"Inter,system-ui,sans-serif"}}>
    <nav style={{height:82,padding:"0 clamp(20px,6vw,80px)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderBottom:"1px solid #EAE2D4",position:"sticky",top:0,zIndex:20}}>
      <Image src="/vivit-logo.png" alt="VIVIT Marketing" width={154} height={68} style={{objectFit:"contain"}} priority/>
      <div style={{display:"flex",gap:10}}><Link href="/login" style={outline}>Sign in</Link><Link href="/signup" style={primary}>Request access</Link></div>
    </nav>
    <section className="brand-landing-hero" style={{minHeight:"calc(100vh - 82px)",display:"grid",gridTemplateColumns:"1.05fr .95fr",alignItems:"center",padding:"70px clamp(24px,7vw,100px)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"#244D87",right:-260,top:-220,opacity:.95}}/><div style={{position:"absolute",width:210,height:210,borderRadius:"50%",background:"#F4B223",right:"12%",bottom:-90}}/>
      <div style={{position:"relative",zIndex:2,maxWidth:700}}><p style={{fontSize:13,fontWeight:900,letterSpacing:2.2,color:"#C52A31"}}>VIVIT ENTERPRISE PLATFORM</p><h1 style={{fontSize:"clamp(48px,7vw,92px)",lineHeight:.98,letterSpacing:"-.05em",margin:"18px 0 24px",fontWeight:950}}>Same purpose.<br/><span style={{color:"#C52A31"}}>Smarter work.</span></h1><p style={{fontSize:"clamp(17px,2vw,21px)",lineHeight:1.75,color:"#655E57",maxWidth:610}}>One connected workspace for VIVIT’s clients, campaigns, creative production, sales, finance and team — with the right access for every role.</p><div style={{display:"flex",gap:12,marginTop:34,flexWrap:"wrap"}}><Link href="/signup" style={{...primary,padding:"15px 24px",fontSize:15}}>Create an access request →</Link><Link href="/login" style={{...outline,padding:"15px 24px",fontSize:15}}>Sign in</Link></div><p style={{fontSize:12,color:"#8A8178",marginTop:16}}>New accounts require Super Admin approval before first login.</p></div>
      <div style={{position:"relative",zIndex:2,minHeight:500,display:"grid",placeItems:"center"}}><div style={{width:"min(430px,88%)",aspectRatio:".78",borderRadius:"220px 220px 28px 28px",background:"linear-gradient(155deg,#7C171F,#C52A31)",boxShadow:"0 45px 100px #5B121D55",display:"grid",placeItems:"center",transform:"rotate(5deg)",border:"10px solid #fff7"}}><div style={{background:"white",padding:"24px 28px",borderRadius:22,transform:"rotate(-5deg)",boxShadow:"0 25px 70px #0004"}}><Image src="/vivit-logo.png" alt="VIVIT" width={260} height={190} style={{objectFit:"contain"}}/></div></div></div>
    </section>
    <section style={{padding:"80px clamp(24px,7vw,100px)",background:"#201F20",color:"white"}}><div style={{maxWidth:1200,margin:"0 auto"}}><p style={{color:"#F4B223",fontWeight:900,letterSpacing:2,fontSize:12}}>BUILT FOR HOW VIVIT WORKS</p><h2 style={{fontSize:"clamp(32px,5vw,54px)",margin:"12px 0 36px"}}>Everything your team needs.<br/>Nothing in the way.</h2><div className="brand-feature-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(220px,1fr))",gap:14}}>{features.map(([icon,title,desc])=><div key={title} style={{padding:25,borderRadius:18,background:"#2A292A",border:"1px solid #ffffff15"}}><span style={{fontSize:28}}>{icon}</span><h3 style={{margin:"14px 0 8px",fontSize:17}}>{title}</h3><p style={{margin:0,color:"#C9C3BD",fontSize:13,lineHeight:1.7}}>{desc}</p></div>)}</div></div></section>
    <footer style={{padding:"26px clamp(24px,7vw,100px)",display:"flex",justifyContent:"space-between",background:"white",fontSize:12,color:"#70685F"}}><span>© 2026 VIVIT Marketing</span><span>Marketing brings it to the world.</span></footer>
  </main>;
}
const primary={display:"inline-block",padding:"11px 18px",borderRadius:10,background:"linear-gradient(105deg,#A51F27,#C52A31 62%,#F4B223)",color:"white",textDecoration:"none",fontWeight:850} as const;
const outline={display:"inline-block",padding:"10px 18px",borderRadius:10,border:"1px solid #D8CFC1",color:"#272321",textDecoration:"none",fontWeight:800,background:"white"} as const;
