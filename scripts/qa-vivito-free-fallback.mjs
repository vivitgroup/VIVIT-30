import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const gateway=read("lib/vivito/gateway-intelligent-mesh-v3.ts");
const providers=read("lib/vivito/providers.ts");
const route=read("app/api/assistant/route.ts");
const playbook=read("lib/vivito/playbook.ts");
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${needle}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: forbidden ${needle}`)};

for(const model of [
  "inclusionai/ling-3.0-flash-fin-free",
  "inclusionai/ling-3.0-flash-fin",
  "poolside/laguna-s-2.1-free",
])requireText("gateway",gateway,model);
requireText("gateway",gateway,"AI_GATEWAY_MODELS_URL");
requireText("gateway",gateway,"zeroPrice(pricing.input)&&zeroPrice(pricing.output)");
requireText("gateway",gateway,"gateway-returned-model-outside-free-pool");
requireText("gateway",gateway,"EXPLICIT_FREE_MODEL_FALLBACK");
forbidText("gateway",gateway,"Array.from({length:10}");

requireText("providers",providers,"VIVITO_ALLOW_PAID_PROVIDERS");
requireText("providers",providers,"vivitoFreeOnlyMode()");
requireText("providers",providers,"transparentAdvisorFailure");
requireText("providers",providers,"generateLocalActionPlanV2");
for(const legacy of ["generateLocalAdvisorV2","generateLocalCaseAdvisorV4","generateLocalVivito"])forbidText("providers",providers,legacy);

forbidText("assistant route",route,'mode:"erp-fallback"');
forbidText("assistant route",route,"Live media snapshot:");
requireText("assistant route",route,'mode:"provider-unavailable"');
requireText("playbook",playbook,"never replace it with a generic dashboard");
requireText("playbook",playbook,"Never disguise a model/provider failure as a substantive business answer");

if(failures.length){
  console.error("VIVITO free/fallback audit failed:");
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log("VIVITO free/fallback audit passed");
