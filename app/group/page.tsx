import Link from "next/link";
import {getVGroupBusinessUnits} from "@/lib/vgroup/db";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {requireVGroupSession} from "@/lib/vgroup/session";

type UnitCard = {
  code: "group" | "marketing" | "hospitality" | "tech";
  title: string;
  subtitle: string;
  href: string;
  accent: string;
  disabled?: boolean;
};

const unitCards: UnitCard[] = [
  {code:"group",title:"Vivit Group",subtitle:"Board control · consolidated finance · approvals · risk · decisions",href:"/group/command-center",accent:"#4DBDFF"},
  {code:"marketing",title:"Vivit Marketing",subtitle:"Marketing ERP · clients · campaigns · finance",href:"/group/marketing",accent:"#D93333",disabled:true},
  {code:"tech",title:"Vivit Technology",subtitle:"Projects · delivery · support · billing · SaaS",href:"/group/tech",accent:"#2EA8FF"},
  {code:"hospitality",title:"Vivit Hospitality",subtitle:"Properties · reservations · owners · operations · finance",href:"/group/hospitality",accent:"#C99A43"},
];

export const dynamic = "force-dynamic";

export default async function GroupHome(){
  const session=await requireVGroupSession();
  const liveCodes=new Set((await getVGroupBusinessUnits()).map(unit=>unit.code));
  const isBoard=session.memberships.some(item=>item.role==="GROUP_SUPER_ADMIN");
  const accessible=unitCards.filter(unit=>unit.code==="group"?isBoard:unit.disabled||canAccessBusinessUnit(session,unit.code));

  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 12% 8%,rgba(46,168,255,.13),transparent 30%),radial-gradient(circle at 90% 12%,rgba(201,154,67,.12),transparent 28%),#070a0f",color:"#f8fafc",padding:"34px 22px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{maxWidth:1480,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:24,alignItems:"center",marginBottom:42,flexWrap:"wrap"}}>
        <div><div style={{fontSize:12,letterSpacing:".18em",textTransform:"uppercase",color:"#94a3b8",fontWeight:800}}>Vivit Group ERP</div><h1 style={{fontSize:"clamp(38px,5vw,68px)",letterSpacing:"-.055em",lineHeight:1,margin:"10px 0 12px"}}>Choose your workspace.</h1><p style={{color:"#a8b2c1",maxWidth:720,lineHeight:1.7}}>Welcome, <b style={{color:'#fff'}}>{session.fullName}</b>. Only workspaces allowed by your live role and permissions are available.</p></div>
        <form action="/api/vgroup/auth/logout" method="post"><button style={{padding:"12px 16px",border:"1px solid #243041",borderRadius:999,background:"rgba(15,23,42,.72)",fontSize:12,fontWeight:800,color:"#9fb0c6",cursor:'pointer'}}>SIGN OUT</button></form>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
        {accessible.map(unit=>{
          const live=unit.code==="group"||liveCodes.has(unit.code);
          const content=<div style={{minHeight:420,padding:24,borderRadius:30,border:`1px solid ${unit.accent}55`,background:`linear-gradient(155deg,${unit.accent}20,rgba(255,255,255,.035) 48%,rgba(255,255,255,.015))`,boxShadow:`0 35px 80px rgba(0,0,0,.35), inset 0 1px 0 ${unit.accent}44`,display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden",transform:"perspective(1000px) rotateX(1.5deg)",transformOrigin:"center bottom"}}>
            <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",right:-70,top:-70,background:unit.accent,opacity:.15,filter:"blur(18px)"}}/>
            <div><div style={{width:76,height:76,borderRadius:22,display:"grid",placeItems:"center",fontSize:28,fontWeight:950,border:`1px solid ${unit.accent}88`,background:`linear-gradient(145deg,${unit.accent}36,rgba(0,0,0,.22))`,color:"white",boxShadow:`0 18px 50px ${unit.accent}28`}}>{unit.code==="group"?"VG":unit.code==="marketing"?"M":unit.code==="tech"?"T":"H"}</div><h2 style={{fontSize:29,letterSpacing:"-.035em",margin:"28px 0 10px"}}>{unit.title}</h2><p style={{color:"#a7b1c0",lineHeight:1.65,margin:0}}>{unit.subtitle}</p></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><span style={{fontSize:11,fontWeight:900,letterSpacing:".1em",color:unit.disabled?"#64748b":live?"#86efac":"#fbbf24"}}>{unit.code==="group"?"BOARD ONLY":unit.disabled?"FINAL INTEGRATION":live?"ACCESS GRANTED":"UNAVAILABLE"}</span><span style={{fontSize:24,color:unit.accent}}>↗</span></div>
          </div>;
          return unit.disabled?<div key={unit.code} style={{opacity:.7}}>{content}</div>:<Link key={unit.code} href={unit.href} style={{textDecoration:"none",color:"inherit"}}>{content}</Link>
        })}
      </div>
      <style>{`@media (max-width:1100px){main section>div:nth-of-type(2){grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media (max-width:640px){main section>div:nth-of-type(2){grid-template-columns:1fr!important}}`}</style>
    </section>
  </main>
}
