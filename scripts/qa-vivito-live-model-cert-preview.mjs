import {spawnSync} from "node:child_process";
const branch=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
if(branch!=="audit/vivito-200-operating-agent"){console.log(`VIVITO live model certification skipped outside hardening preview branch (${branch||"non-Vercel CI"}).`);process.exit(0)}
if(!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN){console.error("VIVITO preview preflight requires Vercel OIDC or AI_GATEWAY_API_KEY.");process.exit(1)}
if(process.env.OPENROUTER_API_KEY){const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-live-model-cert.ts"],{stdio:"inherit",env:process.env});process.exit(run.status??1)}
const preflight=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-gateway-live-preflight.ts"],{stdio:"inherit",env:process.env});if((preflight.status??1)!==0)process.exit(preflight.status??1);console.log("VIVITO_BUILD_PREFLIGHT_OK: Gateway is callable. Final >=20 distinct-model proof is required post-deploy through /api/vivito/openrouter/certify after OpenRouter OAuth.");process.exit(0)
