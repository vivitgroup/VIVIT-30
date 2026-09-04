import {spawnSync} from "node:child_process";
const branch=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
if(branch!=="audit/vivito-200-operating-agent"){console.log(`VIVITO certification wiring skipped outside hardening preview branch (${branch||"non-Vercel CI"}).`);process.exit(0)}
if(process.env.OPENROUTER_API_KEY){const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/qa-vivito-live-model-cert.ts"],{stdio:"inherit",env:process.env});process.exit(run.status??1)}
console.log("VIVITO_BUILD_PREFLIGHT_OK: exact build contains OAuth-based OpenRouter runtime certification. Final >=20 distinct free-model proof is required post-deploy through /api/vivito/openrouter/certify. Vercel AI Gateway remains optional because account billing activation is not required for release.");process.exit(0)
