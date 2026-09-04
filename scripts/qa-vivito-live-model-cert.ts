import assert from "node:assert/strict";
import {discoverOpenRouterFreeModels,generateViaOpenRouterFreeMesh,resetOpenRouterFreeHealth} from "../lib/vivito/openrouter-free-mesh-v1";
import {discoverGroqFreeModels,generateViaGroqFreeMesh,resetGroqFreeHealth} from "../lib/vivito/groq-free-mesh-v1";

const MIN_CERTIFIED=20,MAX_OPENROUTER_CANDIDATES=24;
const openRouterCredential=()=>String(process.env.OPENROUTER_API_KEY||"").trim();
const groqCredential=()=>String(process.env.GROQ_API_KEY||"").trim();
type Provider="openrouter-free"|"groq-free";
type Candidate={provider:Provider;modelId:string;identity:string};
type Certified=Candidate&{latencyMs:number};
type Failed=Candidate&{error:string};
const canonicalModelIdentity=(id:string)=>String(id||"").trim().toLowerCase().replace(/:free$/i,"");

async function main(){
 const openRouterToken=openRouterCredential(),groqToken=groqCredential();
 if(!openRouterToken)throw new Error("OPENROUTER_API_KEY is required for live model certification");
 if(!groqToken)throw new Error("GROQ_API_KEY is required for multi-provider free-model certification");
 const [openRouterModels,groqModels]=await Promise.all([discoverOpenRouterFreeModels(true),discoverGroqFreeModels(true,groqToken)]);
 const candidates:Candidate[]=[...openRouterModels.slice(0,MAX_OPENROUTER_CANDIDATES).map(model=>({provider:"openrouter-free" as const,modelId:model.id,identity:canonicalModelIdentity(model.id)})),...groqModels.map(modelId=>({provider:"groq-free" as const,modelId,identity:canonicalModelIdentity(modelId)}))];
 const catalogIdentities=new Set(candidates.map(item=>item.identity));
 assert.ok(catalogIdentities.size>=MIN_CERTIFIED,`need at least ${MIN_CERTIFIED} distinct underlying live free-tier text models across OpenRouter + Groq; found ${catalogIdentities.size}`);
 const certified:Certified[]=[],certifiedIdentities=new Set<string>(),failed:Failed[]=[];resetOpenRouterFreeHealth();resetGroqFreeHealth();
 for(const candidate of candidates){if(certifiedIdentities.size>=MIN_CERTIFIED)break;const started=Date.now();try{const out=candidate.provider==="openrouter-free"?await generateViaOpenRouterFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000,apiKey:openRouterToken}):await generateViaGroqFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000,apiKey:groqToken});assert.equal(out.modelId,candidate.modelId,"manual model pin must be honored");assert.ok(out.text.trim().length>0,"model returned an empty response");if(!certifiedIdentities.has(candidate.identity)){certifiedIdentities.add(candidate.identity);certified.push({...candidate,latencyMs:Date.now()-started});console.log(`LIVE_PASS ${candidate.provider} ${candidate.modelId} => ${candidate.identity} ${Date.now()-started}ms`)}else console.log(`LIVE_ROUTE_ONLY ${candidate.provider} ${candidate.modelId} duplicates ${candidate.identity}`)}catch(error:unknown){const message=error instanceof Error?error.message:String(error);failed.push({...candidate,error:message.slice(0,180)});console.log(`LIVE_FAIL ${candidate.provider} ${candidate.modelId} ${message.slice(0,180)}`)}}
 const orPasses=certified.filter(x=>x.provider==="openrouter-free").length,groqPasses=certified.filter(x=>x.provider==="groq-free").length;
 console.log(JSON.stringify({openRouterCatalogModels:openRouterModels.length,groqCatalogModels:groqModels.length,distinctUnderlyingCandidateModels:catalogIdentities.size,certified:certifiedIdentities.size,providerPasses:{"openrouter-free":orPasses,"groq-free":groqPasses},failed},null,2));
 assert.ok(orPasses>0,"live certification requires at least one callable OpenRouter free model");assert.ok(groqPasses>0,"live certification requires at least one distinct callable Groq Free Plan model");assert.ok(certifiedIdentities.size>=MIN_CERTIFIED,`live certification requires >=${MIN_CERTIFIED} distinct underlying callable models across OpenRouter + Groq; certified ${certifiedIdentities.size}`);
 console.log(`\nLIVE_CERTIFIED ${certifiedIdentities.size} distinct underlying models callable across OpenRouter + Groq with exact pinned routes.`)
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exit(1)});
