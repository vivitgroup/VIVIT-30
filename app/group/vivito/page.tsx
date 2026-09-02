import Link from "next/link";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {VivitoControlPanel} from "@/components/vgroup/vivito-control-panel";

export const dynamic="force-dynamic";
export default async function VivitoPage({searchParams}:{searchParams:Promise<{workspace?:string}>}){
 const session=await requireVGroupSession();const {workspace}=await searchParams;const allowed=new Set(["group","marketing","hospitality","tech"]);const initialWorkspace=workspace&&allowed.has(workspace)?workspace:undefined;
 return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 88% 4%,rgba(73,189,255,.14),transparent 28%),#070a0f",color:"#f7fbff",padding:"30px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1050,margin:"0 auto"}}><Link href="/group" style={{color:"#8bd3ff",textDecoration:"none",fontWeight:900}}>← Vivit Group</Link><div style={{margin:"38px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",color:"#8bd3ff",fontWeight:950}}>VIVITO · CROSS-WORKSPACE EXECUTION</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"8px 0"}}>One assistant. Four workspaces.</h1><p style={{color:"#a8b4c5",lineHeight:1.7,maxWidth:820}}>Signed in as <b>{session.fullName}</b>. Vivito inherits the user&apos;s actual permissions, uses an allowlisted capability registry, records every task, blocks duplicate mutations and pauses sensitive actions for approval. Marketing remains execution-locked until integration.</p></div><VivitoControlPanel initialWorkspace={initialWorkspace}/></section></main>
}
