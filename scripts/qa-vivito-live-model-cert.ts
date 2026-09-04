import assert from "node:assert/strict";
import {discoverVerifiedFreeGatewayModels,generateViaGatewayIntelligentMesh,resetGatewayMeshHealth} from "../lib/vivito/gateway-intelligent-mesh-v3";
import {discoverOpenRouterFreeModels,generateViaOpenRouterFreeMesh,resetOpenRouterFreeHealth} from "../lib/vivito/openrouter-free-mesh-v1";

const MIN_CERTIFIED=20;
const MAX_GATEWAY_CANDIDATES=12;
const MAX_OPENROUTER_CANDIDATES=24;
const gatewayCredential=()=>String(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||"").trim();
const openRouterCredential=()=>String(process.env.OPENROUTER_API_KEY||"").trim();

type Provider="gateway"|"openrouter-free";
type Certified={provider:Provider;modelId:string;latencyMs:number};
type Failed={provider:Provider;modelId:string;error:string};

async function main(){
  const gatewayToken=gatewayCredential();
  const openRouterToken=openRouterCredential();
  if(!gatewayToken)throw new Error("AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required for live model certification");
  if(!openRouterToken)throw new Error("OPENROUTER_API_KEY is required for multi-provider live model certification");

  const [gatewayCatalog,openRouterModels]=await Promise.all([
    discoverVerifiedFreeGatewayModels(true),
    discoverOpenRouterFreeModels(true),
  ]);
  assert.equal(gatewayCatalog.source,"live","live Vercel AI Gateway catalog is required");

  const gatewayCandidates=gatewayCatalog.models.slice(0,MAX_GATEWAY_CANDIDATES).map(model=>({provider:"gateway" as const,modelId:model.id}));
  const openRouterCandidates=openRouterModels.slice(0,MAX_OPENROUTER_CANDIDATES).map(model=>({provider:"openrouter-free" as const,modelId:model.id}));
  const distinctCatalogModels=new Set([...gatewayCandidates,...openRouterCandidates].map(item=>item.modelId));
  assert.ok(distinctCatalogModels.size>=MIN_CERTIFIED,`need at least ${MIN_CERTIFIED} distinct verified zero-cost text models across Gateway + OpenRouter; found ${distinctCatalogModels.size}`);

  const certified:Certified[]=[];
  const failed:Failed[]=[];
  const certifiedIds=new Set<string>();
  resetGatewayMeshHealth();
  resetOpenRouterFreeHealth();

  for(const candidate of [...gatewayCandidates,...openRouterCandidates]){
    if(certified.length>=MIN_CERTIFIED)break;
    if(certifiedIds.has(candidate.modelId))continue;
    const started=Date.now();
    try{
      const out=candidate.provider==="gateway"
        ?await generateViaGatewayIntelligentMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",gatewayToken,{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000})
        :await generateViaOpenRouterFreeMesh("Reply with exactly: VIVITO_MODEL_OK","You are a health probe. Return only the requested token.",{task:"general",modelId:candidate.modelId,maxTokens:16,timeoutMs:15000});
      assert.equal(out.modelId,candidate.modelId,"manual model pin must be honored");
      assert.ok(out.text.trim().length>0,"model returned an empty response");
      certifiedIds.add(candidate.modelId);
      certified.push({provider:candidate.provider,modelId:candidate.modelId,latencyMs:Date.now()-started});
      console.log(`LIVE_PASS ${candidate.provider} ${candidate.modelId} ${Date.now()-started}ms`);
    }catch(error:unknown){
      const message=error instanceof Error?error.message:String(error);
      failed.push({provider:candidate.provider,modelId:candidate.modelId,error:message.slice(0,180)});
      console.log(`LIVE_FAIL ${candidate.provider} ${candidate.modelId} ${message.slice(0,180)}`);
    }
  }

  const gatewayPasses=certified.filter(item=>item.provider==="gateway").length;
  const openRouterPasses=certified.filter(item=>item.provider==="openrouter-free").length;
  console.log(JSON.stringify({
    gatewayCatalogModels:gatewayCatalog.models.length,
    openRouterCatalogModels:openRouterModels.length,
    distinctCandidateModels:distinctCatalogModels.size,
    certified:certified.length,
    providerPasses:{gateway:gatewayPasses,"openrouter-free":openRouterPasses},
    failed,
  },null,2));
  assert.ok(gatewayPasses>0,"live certification requires at least one callable Vercel Gateway model");
  assert.ok(openRouterPasses>0,"live certification requires at least one callable OpenRouter free model");
  assert.ok(certified.length>=MIN_CERTIFIED,`live certification requires >=${MIN_CERTIFIED} distinct callable models across Gateway + OpenRouter; certified ${certified.length}`);
  console.log(`\nLIVE_CERTIFIED ${certified.length} distinct models callable across Gateway + OpenRouter with exact pinned routes.`);
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exit(1)});
