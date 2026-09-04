import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {OPENROUTER_KEY_COOKIE,unsealOpenRouterSecret} from "@/lib/vivito/openrouter-oauth";
import {discoverOpenRouterFreeModels,generateViaOpenRouterFreeMesh,resetOpenRouterFreeHealth} from "@/lib/vivito/openrouter-free-mesh-v1";
import {discoverGroqFreeModels,generateViaGroqFreeMesh,resetGroqFreeHealth} from "@/lib/vivito/groq-free-mesh-v1";

export const dynamic="force-dynamic";export const maxDuration=60;
const MIN=20,MAX_OR=24,WORKERS=4;
type Candidate={provider:"openrouter-free"|"groq-free";modelId:string};
export async function POST(req:NextRequest){
  const session=await getVGroupSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const openRouterKey=unsealOpenRouterSecret(req.cookies.get(OPENROUTER_KEY_COOKIE)?.value||"");if(!openRouterKey)return NextResponse.json({error:"OpenRouter is not connected"},{status:409});
  const groqKey=String(process.env.GROQ_API_KEY||"").trim();if(!groqKey)return NextResponse.json({error:"Groq Free Plan is not configured"},{status:409});
  const [orModels,groqModels]=await Promise.all([discoverOpenRouterFreeModels(true),discoverGroqFreeModels(true,groqKey)]);
  const candidates:Candidate[]=[...orModels.slice(0,MAX_OR).map(model=>({provider:"openrouter-free" as const,modelId:model.id})),...groqModels.map(modelId=>({provider:"groq-free" as const,modelId}))];
  const distinct=[...new Map(candidates.map(c=>[c.modelId,c])).values()],certified:Candidate[]=[],failed:{provider:string;modelId:string;error:string}[]=[];
  resetOpenRouterFreeHealth();resetGroqFreeHealth();let cursor=0;
  async function worker(){while(cursor<distinct.length&&certified.length<MIN){const candidate=distinct[cursor++];try{const out=candidate.provider==="openrouter-free"?await generateViaOpenRouterFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:10000,apiKey:openRouterKey}):await generateViaGroqFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:10000,apiKey:groqKey});if(out.modelId===candidate.modelId&&out.text.trim())certified.push(candidate);else failed.push({...candidate,error:"pin-or-empty"})}catch(error:unknown){failed.push({...candidate,error:(error instanceof Error?error.message:String(error)).slice(0,120)})}}}
  await Promise.all(Array.from({length:WORKERS},()=>worker()));const ok=certified.length>=MIN&&certified.some(c=>c.provider==="openrouter-free")&&certified.some(c=>c.provider==="groq-free");
  return NextResponse.json({ok,catalogModels:distinct.length,providerCatalogs:{"openrouter-free":orModels.length,"groq-free":groqModels.length},certified:certified.length,certifiedModels:certified,failed:failed.slice(0,12),proof:"exact-pinned-multi-provider-free-runtime"},{status:ok?200:503,headers:{"Cache-Control":"no-store"}})
}
