import fs from "node:fs";

const providers=fs.readFileSync("lib/vivito/providers.ts","utf8");

const checks=[
  ["advisor fallback is opt-in only",/allowDeterministicAdvisorFallback\(\).*VIVITO_ALLOW_DETERMINISTIC_ADVISOR_FALLBACK/s.test(providers)],
  ["no unconditional deterministic advisor fallback when providers are absent",!/if\(isGeneralAdvisorSystem\(system\)\)return transparentAdvisorFailure/.test(providers)],
  ["no unconditional deterministic advisor fallback after provider failures",!/if\(isGeneralAdvisorSystem\(system\)\)return transparentAdvisorFailure/.test(providers)],
  ["explicit API gateway key is tried before OIDC",providers.indexOf("process.env.AI_GATEWAY_API_KEY")<providers.indexOf("process.env.VERCEL_OIDC_TOKEN")],
  ["client alias resolver exists",providers.includes("function clientAliases")],
  ["current question resolves client before history",/currentMatches[\s\S]*if\(currentMatches\.length===1\)return currentMatches\[0\][\s\S]*const recent=\[\.\.\.history\]\.reverse\(\)/.test(providers)],
];

for(const [label,ok] of checks){
  if(!ok)throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}

console.log(`${checks.length}/${checks.length} VIVITO four-gate provider integrity checks passed.`);
