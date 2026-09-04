import assert from "node:assert/strict";
import {discoverVerifiedFreeGatewayModels,generateViaGatewayIntelligentMesh,resetGatewayMeshHealth} from "../lib/vivito/gateway-intelligent-mesh-v3";

const MIN_CERTIFIED=20;
const MAX_CANDIDATES=24;
const token=String(process.env.AI_GATEWAY_API_KEY||"").trim();
if(!token)throw new Error("AI_GATEWAY_API_KEY is required for live model certification");

const catalog=await discoverVerifiedFreeGatewayModels(true);
assert.equal(catalog.source,"live","live Vercel AI Gateway catalog is required");
assert.ok(catalog.models.length>=MIN_CERTIFIED,`need at least ${MIN_CERTIFIED} verified zero-cost text models; found ${catalog.models.length}`);

const candidates=catalog.models.slice(0,MAX_CANDIDATES);
const certified:{modelId:string;latencyMs:number}[]=[];
const failed:{modelId:string;error:string}[]=[];
resetGatewayMeshHealth();

for(const model of candidates){
  const started=Date.now();
  try{
    const out=await generateViaGatewayIntelligentMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",token,{task:"general",modelId:model.id,maxTokens:16,timeoutMs:15000});
    assert.equal(out.modelId,model.id,"manual model pin must be honored");
    assert.ok(out.text.trim().length>0,"model returned an empty response");
    certified.push({modelId:model.id,latencyMs:Date.now()-started});
    console.log(`LIVE_PASS ${model.id} ${Date.now()-started}ms`);
  }catch(error:unknown){
    const message=error instanceof Error?error.message:String(error);
    failed.push({modelId:model.id,error:message.slice(0,180)});
    console.log(`LIVE_FAIL ${model.id} ${message.slice(0,180)}`);
  }
}

console.log(JSON.stringify({catalogModels:catalog.models.length,candidates:candidates.length,certified:certified.length,failed},null,2));
assert.ok(certified.length>=MIN_CERTIFIED,`live certification requires >=${MIN_CERTIFIED} callable models; certified ${certified.length}`);
console.log(`\nLIVE_CERTIFIED ${certified.length}/${candidates.length} models callable through exact pinned routes.`);
