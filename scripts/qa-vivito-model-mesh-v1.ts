import assert from "node:assert/strict";
import {generateViaVivitoMesh,loadVivitoModelMesh,rankVivitoMeshModels,resetVivitoMeshHealth,vivitoMeshHealth,vivitoMeshSummary} from "../lib/vivito/model-mesh-v1";
import {VIVITO_DEFAULT_MODEL_POOL_META} from "../lib/vivito/model-mesh-pool-v1";
import {discoverVerifiedFreeGatewayModels,gatewayMeshSummary,gatewayModelOrder,generateViaGatewayIntelligentMesh,resetGatewayMeshHealth} from "../lib/vivito/gateway-intelligent-mesh-v3";

const originalMesh=process.env.VIVITO_MODEL_MESH_JSON;
const originalDefaultPool=process.env.VIVITO_DEFAULT_MODEL_POOL;
const originalA=process.env.MESH_KEY_A,originalB=process.env.MESH_KEY_B,originalC=process.env.MESH_KEY_C,originalMoonshot=process.env.MOONSHOT_API_KEY;
const originalFetch=globalThis.fetch;let passed=0;
function check(name:string,fn:()=>void|Promise<void>){return Promise.resolve().then(fn).then(()=>{passed++;console.log(`PASS  ${name}`)})}

async function main(){
  process.env.VIVITO_DEFAULT_MODEL_POOL="0";process.env.MESH_KEY_A="test-a";process.env.MESH_KEY_B="test-b";delete process.env.MESH_KEY_C;
  process.env.VIVITO_MODEL_MESH_JSON=JSON.stringify([
    {id:"reasoner",provider:"openrouter",model:"qwen/reasoner",baseUrl:"https://mesh-a.example/v1/",apiKeyEnv:"MESH_KEY_A",quality:96,cost:38,latency:45,tasks:["reasoning","finance"],maxTokens:6000},
    {id:"fast",provider:"groq",model:"llama/fast",baseUrl:"https://mesh-b.example/v1",apiKeyEnv:"MESH_KEY_B",quality:82,cost:12,latency:8,tasks:["general","creative","arabic"],maxTokens:4000},
    {id:"missing",provider:"missing",model:"missing/model",baseUrl:"https://mesh-c.example/v1",apiKeyEnv:"MESH_KEY_C",quality:100,cost:0,latency:0},
    {id:"reasoner",provider:"duplicate",model:"duplicate",baseUrl:"https://duplicate.example/v1",apiKeyEnv:"MESH_KEY_A"},
    {id:"disabled",provider:"x",model:"x",baseUrl:"https://x.example/v1",apiKeyEnv:"MESH_KEY_A",enabled:false}
  ]);resetVivitoMeshHealth();
  await check("registry parses, normalizes and deduplicates model IDs",()=>{const all=loadVivitoModelMesh();assert.equal(all.length,4);assert.equal(all.find(x=>x.id==="reasoner")?.provider,"duplicate")});
  await check("unconfigured models are excluded from candidates",()=>assert.equal(rankVivitoMeshModels("general").some(x=>x.id==="missing"),false));
  await check("disabled models are excluded from candidates",()=>assert.equal(rankVivitoMeshModels("general").some(x=>x.id==="disabled"),false));
  await check("task-aware scoring favors specialist reasoning model",()=>assert.equal(rankVivitoMeshModels("reasoning")[0]?.id,"reasoner"));
  await check("general routing favors fast low-cost model",()=>assert.equal(rankVivitoMeshModels("general")[0]?.id,"fast"));
  let phase:"quota"|"auth"="quota";
  globalThis.fetch=(async (input:RequestInfo|URL)=>{const url=String(input);if(url.includes("duplicate.example")||url.includes("mesh-a.example")){if(phase==="quota")return new Response(JSON.stringify({error:{message:"free tier daily quota exhausted"}}),{status:429,headers:{"Content-Type":"application/json"}});return new Response(JSON.stringify({error:{message:"invalid api key"}}),{status:401,headers:{"Content-Type":"application/json"}})}if(url.includes("mesh-b.example"))return new Response(JSON.stringify({choices:[{message:{content:"mesh fallback answer"}}]}),{status:200,headers:{"Content-Type":"application/json"}});return new Response("{}",{status:500})}) as typeof fetch;
  await check("quota exhaustion fails over to the next healthy model",async()=>{const out=await generateViaVivitoMesh("q","s",{task:"reasoning"});assert.equal(out.modelId,"fast");assert.equal(out.text,"mesh fallback answer");assert.ok(out.errors.some(x=>x.includes("provider-quota-exhausted")))});
  await check("quota-exhausted model enters cooldown health state",()=>{const h=vivitoMeshHealth("reasoner");assert.equal(h.health,"QUOTA_EXHAUSTED");assert.ok(h.cooldownRemainingMs>0)});
  await check("cooling model is removed from immediate routing",()=>assert.equal(rankVivitoMeshModels("reasoning")[0]?.id,"fast"));
  await check("health reset restores eligible specialist model",()=>{resetVivitoMeshHealth();assert.equal(rankVivitoMeshModels("reasoning")[0]?.id,"reasoner")});
  phase="auth";
  await check("authentication failure also fails over safely",async()=>{const out=await generateViaVivitoMesh("q","s",{task:"reasoning"});assert.equal(out.modelId,"fast");assert.ok(out.errors.some(x=>x.includes("provider-auth-failure")))});
  await check("auth-failed model is hard excluded from routing",()=>{assert.equal(vivitoMeshHealth("reasoner").health,"AUTH_FAILURE");assert.equal(rankVivitoMeshModels("reasoning").some(x=>x.id==="reasoner"),false)});
  await check("mesh summary exposes configured providers and safe health ledger",()=>{const s=vivitoMeshSummary();assert.equal(s.configured,2);assert.equal(s.providers,2);assert.equal(s.models.includes("missing"),false)});
  delete process.env.VIVITO_MODEL_MESH_JSON;process.env.VIVITO_DEFAULT_MODEL_POOL="1";resetVivitoMeshHealth();
  await check("legacy direct pool still contains at least twenty real routes",()=>{const all=loadVivitoModelMesh();assert.ok(all.length>=20);assert.equal(all.length,VIVITO_DEFAULT_MODEL_POOL_META.modelCount)});
  await check("legacy direct pool spans at least seven providers",()=>assert.ok(VIVITO_DEFAULT_MODEL_POOL_META.providers.length>=7));
  await check("legacy pool includes major model families",()=>{const ids=loadVivitoModelMesh().map(x=>x.id).join(" ");for(const family of ["kimi","qwen","deepseek","llama","mistral"])assert.match(ids,new RegExp(family))});
  process.env.MOONSHOT_API_KEY="test-moonshot";
  await check("adding provider key activates matching direct model",()=>assert.ok(rankVivitoMeshModels("arabic").some(x=>x.id==="kimi-direct-k2.6")));
  await check("pool summary never contains provider secret",()=>assert.equal(JSON.stringify(vivitoMeshSummary()).includes("test-moonshot"),false));

  const freeCatalog=Array.from({length:23},(_,i)=>({id:`vendor/model-${i+1}${i===0?"-free":""}`,type:"language",modalities:{input:["text"],output:["text"]},pricing:{input:"0",output:"0"},owned_by:"vendor",released:1780000000+i,context_window:128000,tags:i%2?["reasoning"]:["tool-use"]}));
  freeCatalog.push({id:"vendor/paid",type:"language",modalities:{input:["text"],output:["text"]},pricing:{input:"0.1",output:"0"}});
  freeCatalog.push({id:"vendor/missing-price",type:"language",modalities:{input:["text"],output:["text"]},pricing:{}});
  freeCatalog.push({id:"vendor/image",type:"language",modalities:{input:["image"],output:["text"]},pricing:{input:"0",output:"0"}});
  let capturedBody:Record<string,unknown>|null=null;
  globalThis.fetch=(async (input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.includes("/v1/models"))return new Response(JSON.stringify({data:freeCatalog}),{status:200,headers:{"Content-Type":"application/json"}});capturedBody=JSON.parse(String(init?.body||"{}")) as Record<string,unknown>;const requested=String(capturedBody.model||"");return new Response(JSON.stringify({model:requested,choices:[{message:{content:"atomic gateway answer"}}]}),{status:200,headers:{"Content-Type":"application/json"}})}) as typeof fetch;
  resetGatewayMeshHealth();
  await check("live gateway catalog certifies more than twenty zero-cost text models",async()=>{const catalog=await discoverVerifiedFreeGatewayModels(true);assert.equal(catalog.source,"live");assert.equal(catalog.models.length,23);assert.equal(catalog.models.some(x=>x.id==="vendor/paid"),false);assert.equal(catalog.models.some(x=>x.id==="vendor/missing-price"),false)});
  await check("gateway task router exposes up to twenty-four verified free models",async()=>{const models=await gatewayModelOrder("reasoning",24);assert.equal(models.length,23);assert.equal(new Set(models).size,23)});
  await check("gateway responses are atomic and restricted to verified free pool",async()=>{const out=await generateViaGatewayIntelligentMesh("q","s","test-token",{task:"general"});assert.equal(out.text,"atomic gateway answer");assert.equal(out.eligibleFreeModels,23);assert.equal(capturedBody?.stream,false);assert.ok(freeCatalog.some(x=>x.id===capturedBody?.model))});
  await check("manual gateway model pinning is exact and cost-safe",async()=>{const pinned="vendor/model-7";const out=await generateViaGatewayIntelligentMesh("q","s","test-token",{task:"reasoning",modelId:pinned});assert.equal(out.modelId,pinned);assert.equal(capturedBody?.model,pinned);assert.equal(Array.isArray(capturedBody?.models),false);await assert.rejects(()=>generateViaGatewayIntelligentMesh("q","s","test-token",{modelId:"vendor/paid"}),/not-verified-free/)});
  await check("gateway request never contains provider token",()=>assert.equal(JSON.stringify(capturedBody).includes("test-token"),false));
  globalThis.fetch=(async (input:RequestInfo|URL)=>String(input).includes("/v1/models")?new Response(JSON.stringify({data:freeCatalog}),{status:200,headers:{"Content-Type":"application/json"}}):new Response(JSON.stringify({error:{message:"daily quota exhausted"}}),{status:429,headers:{"Content-Type":"application/json"}})) as typeof fetch;
  resetGatewayMeshHealth();
  await check("gateway quota exhaustion enters model cooldown",async()=>{await assert.rejects(()=>generateViaGatewayIntelligentMesh("q","s","test-token",{task:"finance",modelId:"vendor/model-2"}));const summary=await gatewayMeshSummary("finance");assert.ok(Object.values(summary.health).some(h=>h.cooldownRemainingMs>0));resetGatewayMeshHealth()});
  console.log(`\n${passed}/23 VIVITO Model Mesh V1 + dynamic free gateway checks passed.`);if(passed!==23)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{if(originalMesh===undefined)delete process.env.VIVITO_MODEL_MESH_JSON;else process.env.VIVITO_MODEL_MESH_JSON=originalMesh;if(originalDefaultPool===undefined)delete process.env.VIVITO_DEFAULT_MODEL_POOL;else process.env.VIVITO_DEFAULT_MODEL_POOL=originalDefaultPool;if(originalA===undefined)delete process.env.MESH_KEY_A;else process.env.MESH_KEY_A=originalA;if(originalB===undefined)delete process.env.MESH_KEY_B;else process.env.MESH_KEY_B=originalB;if(originalC===undefined)delete process.env.MESH_KEY_C;else process.env.MESH_KEY_C=originalC;if(originalMoonshot===undefined)delete process.env.MOONSHOT_API_KEY;else process.env.MOONSHOT_API_KEY=originalMoonshot;globalThis.fetch=originalFetch});