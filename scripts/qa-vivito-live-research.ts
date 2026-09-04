import {researchExternalEvidence} from "../lib/vivito/research-client";

async function main(){
  delete process.env.VIVITO_RESEARCH_ENDPOINT;
  delete process.env.VIVITO_RESEARCH_ALLOWED_HOSTS;
  delete process.env.VIVITO_RESEARCH_BEARER_TOKEN;

  const query="OpenAI latest product updates";
  const result=await researchExternalEvidence(query,{limit:3,timeoutMs:12000});
  if(!result.ok)throw new Error(`Live research failed: ${result.errorCode||"UNKNOWN"}`);
  if(!result.evidence.length)throw new Error("Live research returned no evidence");
  const valid=result.evidence.every(item=>Boolean(item.source&&item.snippet));
  if(!valid)throw new Error("Live research returned malformed evidence");
  console.log(`LIVE_RESEARCH_CERTIFIED provider=exa-mcp evidence=${result.evidence.length} latencyMs=${result.latencyMs}`);
}

main().catch(error=>{console.error(error);process.exit(1)});
