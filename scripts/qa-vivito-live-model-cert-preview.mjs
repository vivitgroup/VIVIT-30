import {spawnSync} from "node:child_process";

const branch=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
const isHardeningPreview=branch==="audit/vivito-200-operating-agent";
const isProductionMain=process.env.VERCEL_ENV==="production"&&branch==="main";
const shouldCertify=isHardeningPreview||isProductionMain;

if(!shouldCertify){
  console.log(`VIVITO_LIVE_CERT_SKIPPED: not a production-main or hardening-preview build (${branch||"non-Vercel CI"}).`);
  process.exit(0);
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
