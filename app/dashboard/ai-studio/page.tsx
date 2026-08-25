export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {CopilotWorkspace} from "@/components/copilot/CopilotWorkspace";
export default async function AIStudioPage(){const session=await auth();if(!session?.user)redirect("/login");const role=String((session.user as any).role||"CLIENT");return <div style={{display:"grid",gap:16,padding:"20px clamp(14px,2vw,26px)",maxWidth:1400,margin:"0 auto"}}><div><div style={{fontSize:11,fontWeight:900,color:"#7c3aed",letterSpacing:1}}>ASK · ADVISE · ACT</div><h1 className="page-title" style={{marginTop:4}}>VIVIT Copilot</h1><p className="page-subtitle">Your role-aware operating brain: live ERP answers, proactive recommendations, prepared actions, client memory and senior marketing support.</p></div><CopilotWorkspace role={role}/></div>}
