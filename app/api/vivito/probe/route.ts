import {NextResponse} from "next/server";
import {generateViaGatewayIntelligentMesh} from "@/lib/vivito/gateway-intelligent-mesh-v3";

export const dynamic="force-dynamic";

export async function GET(){
  const token=String(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||"").trim();
  if(!token)return NextResponse.json({ok:false,error:"gateway-token-missing"},{status:503,headers:{"Cache-Control":"no-store"}});
  try{
    const result=await generateViaGatewayIntelligentMesh("Reply with exactly: VIVITO_OK","You are a connectivity probe. Follow the user instruction exactly.",token,{task:"general",maxTokens:16,timeoutMs:12000});
    return NextResponse.json({ok:true,modelId:result.modelId,text:result.text.slice(0,64)},{headers:{"Cache-Control":"no-store"}});
  }catch(error:unknown){
    const status=error&&typeof error==="object"&&"status" in error?Number((error as {status?:unknown}).status)||500:500;
    const message=error instanceof Error?error.message:"gateway-probe-failed";
    console.error("VIVITO gateway probe failed",{status,message:message.slice(0,240)});
    return NextResponse.json({ok:false,status,error:message.slice(0,240)},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
