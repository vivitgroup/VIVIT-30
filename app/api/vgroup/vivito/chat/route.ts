import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {generateVivito} from "@/lib/vivito/providers";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})) as {question?:unknown;workspace?:unknown};
  const question=String(body.question||"").trim();
  if(!question)return NextResponse.json({error:"Question is required"},{status:400});
  const requestedWorkspace=String(body.workspace||"group").toLowerCase();
  const allowed=new Set(["group","marketing","tech","hospitality"]);
  const workspace=allowed.has(requestedWorkspace)?requestedWorkspace:"group";
  const memberships=session.memberships.map(m=>({businessUnit:m.businessUnit,role:m.role,permissionCount:m.permissions.length}));
  const system=`You are VIVITO — VIVIT Operating Intelligence for Vivit Group. You are a real AI assistant, not an execution form. Answer the user's question directly and clearly. Respect the authenticated user's role and workspace boundaries. Never claim you executed a mutation unless a governed execution endpoint confirms it. Current selected workspace: ${workspace}.`;
  const prompt=`USER REQUEST: ${question}\n\nAUTHORIZED GROUP CONTEXT:\nUser: ${session.fullName} <${session.email}>\nSelected workspace: ${workspace}\nMemberships: ${JSON.stringify(memberships)}\n\nAnswer using the same language as the user unless asked otherwise.`;
  try{
    const result=await generateVivito(prompt,system,{task:"general",maxTokens:1800,timeoutMs:25000});
    return NextResponse.json({answer:result.text,modelId:result.modelId||null,provider:result.provider},{headers:{"Cache-Control":"no-store"}});
  }catch(error:unknown){
    console.error("VIVITO group chat failed",{error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"VIVITO is temporarily unavailable. Please retry."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
