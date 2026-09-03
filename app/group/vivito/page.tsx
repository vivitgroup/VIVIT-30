import Link from "next/link";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {GroupVivitoChat} from "@/components/vgroup/group-vivito-chat";

export const dynamic="force-dynamic";
export default async function VivitoPage({searchParams}:{searchParams:Promise<{workspace?:string}>}){
 const session=await requireVGroupSession();const {workspace}=await searchParams;const allowed=new Set(["group","marketing","hospitality","tech"]);const initialWorkspace=workspace&&allowed.has(workspace)?workspace:"group";
 return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 88% 4%,rgba(73,189,255,.14),transparent 28%),#070a0f",color:"#f7fbff",padding:"30px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1050,margin:"0 auto"}}><Link href="/group" style={{color:"#8bd3ff",textDecoration:"none",fontWeight:900}}>← Vivit Group</Link><div style={{margin:"38px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",color:"#8bd3ff",fontWeight:950}}>VIVITO · OPERATING INTELLIGENCE</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"8px 0"}}>One assistant. Four workspaces.</h1><p style={{color:"#a8b4c5",lineHeight:1.7,maxWidth:820}}>Signed in as <b>{session.fullName}</b>. This is VIVITO&apos;s real AI conversation surface. It answers with live model inference and your authenticated workspace scope. Governed execution is separate and never replaces the assistant chat.</p></div><GroupVivitoChat initialWorkspace={initialWorkspace}/><div style={{marginTop:18,padding:16,border:'1px solid #202b3a',borderRadius:16,color:'#7f91a7',fontSize:12}}>Execution controls remain governed and permission-scoped. VIVITO will not claim a write was completed unless the execution runtime confirms it.</div></section></main>;
}
