import Link from "next/link";

const workspaces=[
  {key:"group",title:"Vivit Group",subtitle:"Executive control · consolidated decisions · cross-company view",href:"/group/enter/group",accent:"#63b3ff"},
  {key:"marketing",title:"Vivit Marketing",subtitle:"Clients · campaigns · creative · media · finance",href:"/login?workspace=marketing",accent:"#ef4b55"},
  {key:"tech",title:"Vivit Technology",subtitle:"Projects · delivery · support · SaaS · billing",href:"/group/enter/tech",accent:"#56c8ff"},
  {key:"hospitality",title:"Vivit Hospitality",subtitle:"Properties · reservations · owners · operations",href:"/group/enter/hospitality",accent:"#d6ad62"},
] as const;

export default function RootPage(){
  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 10% 0%,rgba(72,163,255,.12),transparent 28%),radial-gradient(circle at 90% 10%,rgba(214,173,98,.10),transparent 26%),#070a0f",color:"#f8fafc",fontFamily:"Inter,system-ui,sans-serif",padding:"42px 20px"}}>
    <section style={{maxWidth:1220,margin:"0 auto"}}>
      <div style={{marginBottom:36}}><div style={{fontSize:12,fontWeight:900,letterSpacing:".22em",color:"#9fb1c7"}}>VIVIT OPERATING SYSTEM</div><h1 style={{fontSize:"clamp(42px,7vw,78px)",lineHeight:1,letterSpacing:"-.055em",margin:"14px 0 16px"}}>Where are you<br/>working today?</h1><p style={{maxWidth:720,color:"#9ba8b8",lineHeight:1.7,fontSize:17}}>Choose your workspace first. An existing authorized VIVIT session is reused only when its role is valid for that workspace; otherwise you will be asked to sign in.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>{workspaces.map(item=><Link key={item.key} href={item.href} style={{textDecoration:"none",color:"inherit"}}><article style={{minHeight:300,borderRadius:28,padding:24,border:`1px solid ${item.accent}55`,background:`linear-gradient(150deg,${item.accent}20,rgba(255,255,255,.035) 52%,rgba(255,255,255,.015))`,display:"flex",flexDirection:"column",justifyContent:"space-between",boxShadow:"0 24px 70px rgba(0,0,0,.28)"}}><div><div style={{width:58,height:58,borderRadius:18,border:`1px solid ${item.accent}88`,display:"grid",placeItems:"center",fontWeight:950,color:item.accent}}>{item.key==="group"?"VG":item.key==="marketing"?"M":item.key==="tech"?"T":"H"}</div><h2 style={{fontSize:28,letterSpacing:"-.035em",margin:"24px 0 10px"}}>{item.title}</h2><p style={{color:"#9ba8b8",lineHeight:1.6,margin:0}}>{item.subtitle}</p></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontWeight:900,letterSpacing:".08em"}}><span>CHOOSE WORKSPACE</span><span style={{fontSize:24,color:item.accent}}>→</span></div></article></Link>)}</div>
    </section>
  </main>;
}
