import assert from "node:assert/strict";
import {discoverOpenRouterFreeModels,generateViaOpenRouterFreeMesh,resetOpenRouterFreeHealth} from "../lib/vivito/openrouter-free-mesh-v1";
import {discoverGroqFreeModels,generateViaGroqFreeMesh,resetGroqFreeHealth} from "../lib/vivito/groq-free-mesh-v1";

const MIN_CERTIFIED=20,MAX_OPENROUTER_CANDIDATES=24;
const openRouterCredential=()=>String(process.env.OPENROUTER_API_KEY||"").trim();
const groqCredential=()=>String(process.env.GROQ_API_KEY||"").trim();
type Provider="openrouter-free"|"groq-free";
type Certified={provider:Provider;modelId:string;latencyMs:number};
type Failed={provider:Provider;modelId:string;error:string};

async function main(){
 const openRouterToken=openRouterCredential(),groqToken=groqCredential();
 if(!openRouterToken)throw new Error("OPENROUTER_API_KEY is required for live model certification");
 if(!groqToken)throw new Error("GROQ_API_KEY is required for multi-provider free-model certification");
 const [openRouterModels,groqModels]=await Promise.all([discoverOpenRouterFreeModels(true),discoverGroqFreeModels(true,groqToken)]);
 const candidates=[...openRouterModels.slice(0,MAX_OPENROUTER_CANDIDATES).map(model=>({provider:"openrouter-free" as const,modelId:model.id})),...groqModels.map(modelId=>({provider:"groq-free" as const,modelId}))];
 const distinct=[...new Map(candidates.map(item=>[item.modelId,item])).values()];
 assert.ok(distinct.length>=MIN_CERTIFIED,`need at least ${MIN_CERTIFIED} distinct live free-tier text models across OpenRouter + Groq; found ${distinct.length}`);
 const certified:Certified[]=[],failed:Failed[]=[];resetOpenRouterFreeHealth();resetGroqFreeHealth();
 for(const candidate of distinct){if(certified.length>=MIN_CERTIFIED)break;const started=Date.now();try{const out=candidate.provider==="openrouter-free"?await generateViaOpenRouterFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000,apiKey:openRouterToken}):await generateViaGroqFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000,apiKey:groqToken});assert.equal(out.modelId,candidate.modelId,"manual model pin must be honored");assert.ok(out.text.trim().length>0,"model returned an empty response");certified.push({provider:candidate.provider,modelId:candidate.modelId,latencyMs:Date.now()-started});console.log(`LIVE_PASS ${candidate.provider} ${candidate.modelId} ${Date.now()-started}ms`)}catch(error:unknown){const message=error instanceof Error?error.message:String(error);failed.push({...candidate,error:message.slice(0,180)});console.log(`LIVE_FAIL ${candidate.provider} ${candidate.modelId} ${message.slice(0,180)}`)}}
 const orPasses=certified.filter(x=>x.provider==="openrouter-free").length,groqPasses=certified.filter(x=>x.provider==="groq-free").length;
 console.log(JSON.stringify({openRouterCatalogModels:openRouterModels.length,groqCatalogModels:groqModels.length,distinctCandidateModels:distinct.length,certified:certified.length,providerPasses:{"openrouter-free":orPasses,"groq-free":groqPasses},failed},null,2));
 assert.ok(orPasses>0,"live certification requires at least one callable OpenRouter free model");assert.ok(groqPasses>0,"live certification requires at least one callable Groq Free Plan model");assert.ok(certified.length>=MIN_CERTIFIED,`live certification requires >=${MIN_CERTIFIED} distinct callable models across OpenRouter + Groq; certified ${certified.length}`);
 console.log(`\nLIVE_CERTIFIED ${certified.length} distinct models callable across OpenRouter + Groq with exact pinned routes.`)
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exit(1)});
