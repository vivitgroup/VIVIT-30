import {spawnSync} from "node:child_process";

const branch=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
if(branch!=="audit/vivito-200-operating-agent"){
  console.log(`VIVITO live model certification skipped outside hardening preview branch (${branch||"non-Vercel CI"}).`);
  process.exit(0);
}
if(!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN){
  console.error("VIVITO live model certification requires Vercel OIDC or AI_GATEWAY_API_KEY on the hardening preview.");
  process.exit(1);
}
const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-live-model-cert.ts"],{stdio:"inherit",env:process.env});
process.exit(run.status??1);
