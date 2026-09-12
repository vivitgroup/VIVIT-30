import {FOUR_GATES,scenarios,assertFourGateMatrix} from "../tests/vivito-four-gate-matrix.mjs";

const summary=assertFourGateMatrix();

const requiredCategories=["marketing","media-buying","erp","finance","sales","cross-module","actions","context","rbac"];
for(const category of requiredCategories){
  if(!scenarios.some(s=>s.category===category))throw new Error(`missing required category: ${category}`);
}

for(const scenario of scenarios){
  if(!Array.isArray(scenario.followUps)||scenario.followUps.length<1)throw new Error(`${scenario.id} must include at least one context follow-up`);
  if(!scenario.prompt||scenario.prompt.length<8)throw new Error(`${scenario.id} prompt is too weak`);
}

console.log(`VIVITO FOUR-GATE CONTRACT PASS: ${summary.scenarios} scenarios × ${summary.gates} mandatory gates = ${summary.totalMandatoryChecks} required checks.`);
console.log(`Every scenario requires simultaneously: ${FOUR_GATES.join(" + ")}.`);
