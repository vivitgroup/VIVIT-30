import {NextResponse} from "next/server";
import {generateVivito} from "@/lib/vivito/providers";
import {generateViaGatewayIntelligentMesh} from "@/lib/vivito/gateway-intelligent-mesh-v3";

export const dynamic="force-dynamic";
const clean=(value:unknown)=>String(value||"").replace(/[\r\n\t]+/g," ").replace(/[A-Za-z0-9_-]{32,}/g,"[redacted]").slice(0,500);

export async function GET(){
  if(process.env.VERCEL_ENV!=="preview")return NextResponse.json({error:"Not found"},{status:404});
  const apiKey=String(process.env.AI_GATEWAY_API_KEY||"").trim(),oidc=String(process.env.VERCEL_OIDC_TOKEN||"").trim();
  const credentials=[apiKey?{name:"api-key",token:apiKey}:null,oidc?{name:"oidc",token:oidc}:null].filter((x):x is {name:string;token:string}=>Boolean(x));
  const direct:Array<Record<string,unknown>>=[];
  for(const credential of credentials){
    try{
      const result=await generateViaGatewayIntelligentMesh(
        "Reply with exactly: VIVITO_GATEWAY_DIRECT_OK",
        "You are a provider connectivity smoke test. Follow the instruction exactly.",
        credential.token,
        {task:"reasoning",maxTokens:40,timeoutMs:12000},
      );
      direct.push({credential:credential.name,ok:result.text.includes("VIVITO_GATEWAY_DIRECT_OK"),modelId:result.modelId});
      if(result.text.includes("VIVITO_GATEWAY_DIRECT_OK"))return NextResponse.json({ok:true,mode:"direct-gateway",direct,credentialSources:credentials.map(x=>x.name)},{headers:{"Cache-Control":"no-store"}});
    }catch(error:unknown){direct.push({credential:credential.name,ok:false,error:clean(error instanceof Error?error.message:error)});}
  }
  try{
    const result=await generateVivito(
      "Reply with exactly: VIVITO_PROVIDER_SMOKE_OK",
      "You are a provider connectivity smoke test. Follow the user instruction exactly.",
      {preferred:["gateway"],task:"reasoning",maxTokens:40,timeoutMs:15000},
    );
    const ok=result.provider!=="local"&&result.text.includes("VIVITO_PROVIDER_SMOKE_OK");
    return NextResponse.json({ok,mode:"provider-router",provider:result.provider,modelId:result.modelId||null,attempted:result.attempted,errors:result.errors,direct,credentialSources:credentials.map(x=>x.name)},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
  }catch(error:unknown){
    return NextResponse.json({ok:false,mode:"provider-router",error:clean(error instanceof Error?error.message:"provider-smoke-failed"),direct,credentialSources:credentials.map(x=>x.name)},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
