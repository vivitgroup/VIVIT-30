import {NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {generateViaGatewayIntelligentMesh} from "@/lib/vivito/gateway-intelligent-mesh-v3";

export const dynamic="force-dynamic";

const privateNoStore={"Cache-Control":"private, no-store"};

export async function GET(){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401,headers:privateNoStore});
  const isSuperAdmin=session.memberships.some(claim=>String(claim.role)==="GROUP_SUPER_ADMIN");
  if(!isSuperAdmin)return NextResponse.json({error:"Forbidden"},{status:403,headers:privateNoStore});

  const token=String(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||"").trim();
  if(!token)return NextResponse.json({ok:false,error:"gateway-token-missing"},{status:503,headers:privateNoStore});
  try{
    const result=await generateViaGatewayIntelligentMesh("Reply with exactly: VIVITO_OK","You are a connectivity probe. Follow the user instruction exactly.",token,{task:"general",maxTokens:16,timeoutMs:12000});
    return NextResponse.json({ok:true,modelId:result.modelId,text:result.text.slice(0,64)},{headers:privateNoStore});
  }catch(error:unknown){
    const status=error&&typeof error==="object"&&"status" in error?Number((error as {status?:unknown}).status)||500:500;
    const message=error instanceof Error?error.message:"gateway-probe-failed";
    console.error("VIVITO gateway probe failed",{status,message:message.slice(0,240)});
    return NextResponse.json({ok:false,status,error:"gateway-probe-failed"},{status:502,headers:privateNoStore});
  }
}
