import assert from "node:assert/strict";
import {generateViaGroqFreeMesh,discoverGroqFreeModels,resetGroqFreeHealth,GROQ_FREE_MODEL_IDS} from "../lib/vivito/groq-free-mesh-v1";
import {configuredVivitoProviders,generateVivito} from "../lib/vivito/providers";

const originalKey=process.env.GROQ_API_KEY,originalFetch=globalThis.fetch;let phase:"pin"|"failover"="pin",capturedModel="";
async function main(){
 process.env.GROQ_API_KEY="test-groq-key";delete process.env.OPENROUTER_API_KEY;delete process.env.AI_GATEWAY_API_KEY;delete process.env.VERCEL_OIDC_TOKEN;resetGroqFreeHealth();
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.endsWith("/models"))return new Response(JSON.stringify({data:[{id:GROQ_FREE_MODEL_IDS[0]},{id:GROQ_FREE_MODEL_IDS[1]},{id:"paid/other"}]}),{status:200,headers:{"Content-Type":"application/json"}});const body=JSON.parse(String(init?.body||"{}")) as {model?:string};capturedModel=String(body.model||"");if(phase==="failover"&&capturedModel===GROQ_FREE_MODEL_IDS[0])return new Response(JSON.stringify({error:{message:"rate limit reached"}}),{status:429,headers:{"Content-Type":"application/json"}});return new Response(JSON.stringify({model:capturedModel,choices:[{message:{content:"GROQ_OK"}}]}),{status:200,headers:{"Content-Type":"application/json"}})}) as typeof fetch;
 const catalog=await discoverGroqFreeModels(true);assert.deepEqual(catalog,[...GROQ_FREE_MODEL_IDS]);
 assert.ok(configuredVivitoProviders().includes("groq-free"));
 const pinned=await generateViaGroqFreeMesh("q","s",{modelId:GROQ_FREE_MODEL_IDS[1],maxTokens:16});assert.equal(pinned.modelId,GROQ_FREE_MODEL_IDS[1]);assert.equal(capturedModel,GROQ_FREE_MODEL_IDS[1]);
 await assert.rejects(()=>generateViaGroqFreeMesh("q","s",{modelId:"paid/other"}),/not-free-plan-approved/);
 const viaRouter=await generateVivito("q","You are VIVITO — VIVIT Operating Intelligence",{modelId:GROQ_FREE_MODEL_IDS[1],modelProvider:"groq-free",maxTokens:16});assert.equal(viaRouter.provider,"groq-free");assert.equal(viaRouter.modelId,GROQ_FREE_MODEL_IDS[1]);
 phase="failover";resetGroqFreeHealth();const fallback=await generateViaGroqFreeMesh("q","s",{maxTokens:16});assert.equal(fallback.modelId,GROQ_FREE_MODEL_IDS[1]);assert.ok(fallback.errors.some(x=>x.includes("provider-rate-limited")));
 assert.equal(JSON.stringify({model:capturedModel}).includes("test-groq-key"),false);
 console.log("PASS  Groq free-plan catalog, exact pinning, provider override and rate-limit failover");
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{if(originalKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=originalKey;globalThis.fetch=originalFetch});
