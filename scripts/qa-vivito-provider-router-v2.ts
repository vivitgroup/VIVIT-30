import assert from "node:assert/strict";
import {configuredVivitoProviders,generateVivito,vivitoFreeOnlyMode} from "../lib/vivito/providers";
import {resetGatewayMeshHealth} from "../lib/vivito/gateway-intelligent-mesh-v3";
import {resetGroqFreeHealth} from "../lib/vivito/groq-free-mesh-v1";
import {resetOpenRouterFreeHealth} from "../lib/vivito/openrouter-free-mesh-v1";

const originalFetch=globalThis.fetch;
const originalEnv={
  AI_GATEWAY_API_KEY:process.env.AI_GATEWAY_API_KEY,
  VERCEL_OIDC_TOKEN:process.env.VERCEL_OIDC_TOKEN,
  OPENROUTER_API_KEY:process.env.OPENROUTER_API_KEY,
  GROQ_API_KEY:process.env.GROQ_API_KEY,
  GEMINI_API_KEY:process.env.GEMINI_API_KEY,
  ANTHROPIC_API_KEY:process.env.ANTHROPIC_API_KEY,
  MOONSHOT_API_KEY:process.env.MOONSHOT_API_KEY,
  VIVITO_ALLOW_PAID_PROVIDERS:process.env.VIVITO_ALLOW_PAID_PROVIDERS,
};
let passed=0;
const check=async(name:string,fn:()=>void|Promise<void>)=>{await fn();passed++;console.log(`PASS  ${name}`)};

function restoreEnv(){
  for(const [key,value] of Object.entries(originalEnv)){
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
}

async function main(){
  process.env.AI_GATEWAY_API_KEY="router-test-gateway";
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.OPENROUTER_API_KEY;
  process.env.GROQ_API_KEY="router-test-groq";
  process.env.GEMINI_API_KEY="router-test-gemini";
  process.env.ANTHROPIC_API_KEY="router-test-claude";
  process.env.MOONSHOT_API_KEY="router-test-moonshot";
  delete process.env.VIVITO_ALLOW_PAID_PROVIDERS;
  resetGatewayMeshHealth();resetGroqFreeHealth();resetOpenRouterFreeHealth();

  await check("free-only mode is fail-closed by default",()=>assert.equal(vivitoFreeOnlyMode(),true));
  await check("paid providers stay excluded in free-only mode",()=>{
    const providers=configuredVivitoProviders();
    assert.ok(providers.includes("gateway"));
    assert.ok(providers.includes("groq-free"));
    assert.equal(providers.includes("gemini"),false);
    assert.equal(providers.includes("claude"),false);
    assert.equal(providers.includes("mesh"),false);
  });

  const gatewayCatalog=[{id:"vendor/free-router-model",type:"language",modalities:{input:["text"],output:["text"]},pricing:{input:"0",output:"0"},owned_by:"vendor",released:1780000000,context_window:128000,tags:["reasoning"]}];
  const groqCatalog=["openai/gpt-oss-120b","openai/gpt-oss-20b","qwen/qwen3.6-27b","qwen/qwen3.8-27b"].map(id=>({id}));
  let gatewayChatCalls=0,groqChatCalls=0;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    if(url==="https://ai-gateway.vercel.sh/v1/models")return new Response(JSON.stringify({data:gatewayCatalog}),{status:200,headers:{"Content-Type":"application/json"}});
    if(url==="https://ai-gateway.vercel.sh/v1/chat/completions"){
      gatewayChatCalls++;
      return new Response(JSON.stringify({error:{message:"free tier daily quota exhausted"}}),{status:429,headers:{"Content-Type":"application/json"}});
    }
    if(url==="https://api.groq.com/openai/v1/models")return new Response(JSON.stringify({data:groqCatalog}),{status:200,headers:{"Content-Type":"application/json"}});
    if(url==="https://api.groq.com/openai/v1/chat/completions"){
      groqChatCalls++;
      const body=JSON.parse(String(init?.body||"{}")) as {model?:string};
      return new Response(JSON.stringify({model:body.model,choices:[{message:{content:"cross-provider fallback ok"}}]}),{status:200,headers:{"Content-Type":"application/json"}});
    }
    throw new Error(`unexpected-network-call:${url}`);
  }) as typeof fetch;

  await check("gateway quota failure automatically falls through to a healthy free provider",async()=>{
    const result=await generateVivito("USER REQUEST: router fallback test","router contract test",{task:"reasoning",timeoutMs:3000});
    assert.equal(result.provider,"groq-free");
    assert.equal(result.text,"cross-provider fallback ok");
    assert.ok(result.attempted.includes("gateway"));
    assert.ok(result.attempted.includes("groq-free"));
    assert.ok(result.errors.some(error=>error.startsWith("gateway:")));
    assert.equal(groqChatCalls,1);
  });

  const firstGatewayCalls=gatewayChatCalls;
  await check("provider cooldown prevents immediate hammering of a quota-failed gateway",async()=>{
    const result=await generateVivito("USER REQUEST: second router fallback test","router contract test",{task:"general",timeoutMs:3000});
    assert.equal(result.provider,"groq-free");
    assert.equal(gatewayChatCalls,firstGatewayCalls);
  });

  await check("exact Groq model pinning bypasses unrelated providers",async()=>{
    const beforeGateway=gatewayChatCalls;
    const result=await generateVivito("USER REQUEST: pinned router test","router contract test",{task:"coding",modelProvider:"groq-free",modelId:"openai/gpt-oss-20b",timeoutMs:3000});
    assert.equal(result.provider,"groq-free");
    assert.equal(result.modelId,"openai/gpt-oss-20b");
    assert.deepEqual(result.attempted,["groq-free"]);
    assert.equal(gatewayChatCalls,beforeGateway);
  });

  await check("unapproved Groq model pin fails closed without cross-provider fallback",async()=>{
    const beforeGateway=gatewayChatCalls,beforeGroq=groqChatCalls;
    await assert.rejects(()=>generateVivito("q","s",{modelProvider:"groq-free",modelId:"not/a-free-approved-model",timeoutMs:3000}),/all-providers-failed:groq-free:provider-failure/);
    assert.equal(gatewayChatCalls,beforeGateway);
    assert.equal(groqChatCalls,beforeGroq);
  });

  console.log(`\n${passed}/6 VIVITO cross-provider routing contracts passed.`);
  assert.equal(passed,6);
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
  globalThis.fetch=originalFetch;
  restoreEnv();
  resetGatewayMeshHealth();resetGroqFreeHealth();resetOpenRouterFreeHealth();
});
