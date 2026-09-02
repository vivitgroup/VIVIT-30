import Link from "next/link";
import {requireVGroupSession} from "@/lib/vgroup/session";

const names:Record<string,string>={group:"Vivit Group",marketing:"Vivit Marketing",tech:"Vivit Technology",hospitality:"Vivit Hospitality",unknown:"Workspace"};

export const dynamic="force-dynamic";

export default async function WorkspaceAccess({searchParams}:{searchParams:Promise<{workspace?:string;reason?:string;requested?:string}>}){
  const session=await requireVGroupSession();
  const query=await searchParams;
  const workspace=query.workspace&&names[query.workspace]?query.workspace:"unknown";
  const reason=query.reason==="unavailable"?"This workspace is not available in the Group shell yet.":query.reason==="invalid"?"This workspace is not recognized.":"Your current role does not grant access to this workspace.";
  const requested=query.requested==="1";
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"radial-gradient(circle at 50% 0%,rgba(46,168,255,.12),transparent 34%),#070a0f",color:"#f8fafc",padding:24,fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{width:"min(680px,100%)",padding:32,borderRadius:30,border:"1px solid #223047",background:"linear-gradient(155deg,rgba(255,255,255,.07),rgba(255,255,255,.025))",boxShadow:"0 35px 90px rgba(0,0,0,.4)"}}>
      <div style={{fontSize:12,fontWeight:900,letterSpacing:".16em",color:"#93c5fd"}}>WORKSPACE ACCESS</div>
      <h1 style={{fontSize:"clamp(34px,6vw,56px)",letterSpacing:"-.05em",margin:"14px 0 12px"}}>{names[workspace]}</h1>
      <p style={{color:"#a8b2c1",lineHeight:1.7}}>{reason}</p>
      <p style={{color:"#718096",fontSize:13}}>Signed in as {session.email}</p>
      {requested?<div style={{marginTop:22,padding:16,borderRadius:18,border:"1px solid rgba(134,239,172,.3)",background:"rgba(22,163,74,.1)",color:"#bbf7d0",fontWeight:800}}>Access request submitted for review.</div>:workspace!=="unknown"&&query.reason!=="unavailable"?<form action="/api/vgroup/access-requests" method="post" style={{marginTop:22}}><input type="hidden" name="workspace" value={workspace}/><button style={{width:"100%",padding:"14px 18px",border:0,borderRadius:16,background:"#e2e8f0",color:"#0f172a",fontWeight:900,cursor:"pointer"}}>REQUEST ACCESS</button></form>:null}
      <Link href="/group" style={{display:"block",marginTop:14,padding:"13px 18px",borderRadius:16,border:"1px solid #2a3a52",textAlign:"center",textDecoration:"none",color:"#cbd5e1",fontWeight:800}}>BACK TO WORKSPACE SELECTION</Link>
    </section>
  </main>;
}
