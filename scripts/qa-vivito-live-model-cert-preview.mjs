import {spawnSync} from "node:child_process";

const branch=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
const isHardeningPreview=branch==="audit/vivito-200-operating-agent";
const isFourGatePreview=branch==="test/vivito-four-gate-acceptance";
const isProductionMain=process.env.VERCEL_ENV==="production"&&branch==="main";
const shouldCertify=isHardeningPreview||isFourGatePreview||isProductionMain;
const hasServerScopedProvider=Boolean(
  String(process.env.OPENROUTER_API_KEY||"").trim()||
  String(process.env.GROQ_API_KEY||"").trim()||
  String(process.env.AI_GATEWAY_API_KEY||"").trim()
);

if(!shouldCertify){
  console.log(`VIVITO_LIVE_CERT_SKIPPED: not a production-main, hardening-preview, or four-gate preview build (${branch||"non-Vercel CI"}).`);
  process.exit(0);
}

if(isFourGatePreview){
  if(!hasServerScopedProvider){
    if(process.env.VIVITO_REQUIRE_LIVE_MODEL_CERT==="1"){
      console.error("VIVITO_FOUR_GATE_LIVE_BLOCKED: no server-scoped provider credential is available and VIVITO_REQUIRE_LIVE_MODEL_CERT=1.");
      process.exit(1);
    }
    console.log("VIVITO_FOUR_GATE_RUNTIME_CERT_REQUIRED: no server-scoped provider credential is available in this preview build. Vercel OIDC alone was observed to reach AI Gateway but the verified-free routes returned provider-auth failures. The build may continue for deterministic/type/security QA, but this candidate is NOT live-model certified; runtime OpenRouter OAuth or a server provider credential must pass all four gates before merge.");
    process.exit(0);
  }
  console.log("VIVITO_FOUR_GATE_LIVE_START: requiring one real model to pass reasoning + ERP grounding + context continuity + safe execution.");
  const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-four-gate-live-provider.ts"],{stdio:"inherit",env:process.env});
  process.exit(run.status??1);
}

if(process.env.OPENROUTER_API_KEY){
  console.log(`VIVITO_LIVE_CERT_START: running live-model certification for ${isProductionMain?"production main":"hardening preview"}.`);
  const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-live-model-cert.ts"],{stdio:"inherit",env:process.env});
  process.exit(run.status??1);
}

if(process.env.VIVITO_REQUIRE_LIVE_MODEL_CERT==="1"){
  console.error("VIVITO_LIVE_CERT_BLOCKED: OPENROUTER_API_KEY is required because VIVITO_REQUIRE_LIVE_MODEL_CERT=1.");
  process.exit(1);
}

console.log("VIVITO_LIVE_CERT_NOT_PROVEN: OPENROUTER_API_KEY is not available in this build environment. Deterministic Vivito QA still runs, but this build is not being reported as live-model certified. Post-deploy certification remains available through /api/vivito/openrouter/certify.");
process.exit(0);
