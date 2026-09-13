import {NextResponse} from "next/server";
import {generateVivito} from "@/lib/vivito/providers";

export const dynamic="force-dynamic";

export async function GET(){
  if(process.env.VERCEL_ENV!=="preview")return NextResponse.json({error:"Not found"},{status:404});
  try{
    const result=await generateVivito(
      "Reply with exactly: VIVITO_PROVIDER_SMOKE_OK",
      "You are a provider connectivity smoke test. Follow the user instruction exactly.",
      {preferred:["gateway"],task:"reasoning",maxTokens:40,timeoutMs:15000},
    );
    const ok=result.provider!=="local"&&result.text.includes("VIVITO_PROVIDER_SMOKE_OK");
    return NextResponse.json({ok,provider:result.provider,modelId:result.modelId||null,attempted:result.attempted,errors:result.errors},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
  }catch(error:unknown){
    const message=String(error instanceof Error?error.message:"provider-smoke-failed").replace(/[\r\n\t]+/g," ").slice(0,500);
    return NextResponse.json({ok:false,error:message},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
