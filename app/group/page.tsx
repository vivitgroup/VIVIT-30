import Link from "next/link";
import {redirect} from "next/navigation";
import {getVGroupBusinessUnits} from "@/lib/vgroup/db";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {requireVGroupSession} from "@/lib/vgroup/session";

type UnitCard = {
  code: "marketing" | "hospitality" | "tech";
  title: string;
  subtitle: string;
  href: string;
  accent: string;
  disabled?: boolean;
};

const unitCards: UnitCard[] = [
  {code:"marketing",title:"Vivit Marketing",subtitle:"Existing ERP · final integration stage",href:"#",accent:"#C52A31",disabled:true},
  {code:"hospitality",title:"Vivit Hospitality",subtitle:"Properties · reservations · owners · finance",href:"/group/hospitality",accent:"#B28A3B"},
  {code:"tech",title:"Vivit Technology",subtitle:"Projects · client portal · billing · SaaS",href:"/group/tech",accent:"#2EA8FF"},
];

export const dynamic = "force-dynamic";

export default async function GroupHome(){
  const session=await requireVGroupSession();
  const liveCodes=new Set((await getVGroupBusinessUnits()).map(unit=>unit.code));
  const accessible=unitCards.filter(unit=>unit.disabled||canAccessBusinessUnit(session,unit.code));
  const enabled=accessible.filter(unit=>!unit.disabled);
  if(enabled.length===1)redirect(enabled[0].href);

  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 15% 10%,rgba(46,168,255,.12),transparent 32%),radial-gradient(circle at 88% 12%,rgba(178,138,59,.14),transparent 30%),#080b10",color:"#f8fafc",padding:"40px 24px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{maxWidth:1180,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:24,alignItems:"center",marginBottom:56,flexWrap:"wrap"}}>
        <div><div style={{fontSize:12,letterSpacing:".18em",textTransform:"uppercase",color:"#94a3b8",fontWeight:800}}>Vivit Group ERP</div><h1 style={{fontSize:"clamp(38px,6vw,72px)",letterSpacing:"-.055em",lineHeight:.95,margin:"12px 0 14px"}}>One group.<br/>Three operating systems.</h1><p style={{color:"#a8b2c1",maxWidth:660,lineHeight:1.7}}>Welcome, <b style={{color:'#fff'}}>{session.fullName}</b>. Your business-unit access is derived from live role and permission assignments.</p></div>
        <form action="/api/vgroup/auth/logout" method="post"><button style={{padding:"12px 16px",border:"1px solid #243041",borderRadius:999,background:"rgba(15,23,42,.72)",fontSize:12,fontWeight:800,color:"#9fb0c6",cursor:'pointer'}}>SIGN OUT</button></form>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:18}}>
        {accessible.map(unit=>{
          const live=liveCodes.has(unit.code);
          const content=<div style={{minHeight:310,padding:26,borderRadius:28,border:"1px solid #202b3b",background:"linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.025))",boxShadow:"0 30px 80px rgba(0,0,0,.25)",display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",width:180,height:180,borderRadius:"50%",right:-60,top:-55,background:unit.accent,opacity:.12,filter:"blur(12px)"}}/>
            <div><div style={{width:52,height:52,borderRadius:16,display:"grid",placeItems:"center",fontWeight:900,border:`1px solid ${unit.accent}66`,background:`${unit.accent}18`,color:unit.accent}}>{unit.code.slice(0,1).toUpperCase()}</div><h2 style={{fontSize:27,letterSpacing:"-.035em",margin:"24px 0 10px"}}>{unit.title}</h2><p style={{color:"#9aa8bb",lineHeight:1.6,margin:0}}>{unit.subtitle}</p></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><span style={{fontSize:11,fontWeight:900,letterSpacing:".1em",color:unit.disabled?"#64748b":live?"#68d391":"#fbbf24"}}>{unit.disabled?"FINAL INTEGRATION":live?"ACCESS GRANTED":"UNAVAILABLE"}</span><span style={{fontSize:22,color:unit.accent}}>↗</span></div>
          </div>;
          return unit.disabled?<div key={unit.code} style={{opacity:.72}}>{content}</div>:<Link key={unit.code} href={unit.href} style={{textDecoration:"none",color:"inherit"}}>{content}</Link>
        })}
      </div>
    </section>
  </main>
}
