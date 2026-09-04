import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const root=new URL("..",import.meta.url);
const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
const source=String(pkg?.scripts?.build??"");
const prefix="node scripts/qa-production-dependency-security.mjs && ";
if(!source.startsWith(prefix)){
  console.error("VERCEL_BUILD_GUARD: expected production OSV security prefix was not found in package.json build script");
  process.exit(1);
}
const cert=spawnSync(process.execPath,["scripts/qa-vivito-live-model-cert-preview.mjs"],{cwd:root,stdio:"inherit",env:process.env});
if(cert.error)throw cert.error;
if((cert.status??1)!==0)process.exit(cert.status??1);
const command=source.slice(prefix.length);
console.log("VERCEL_BUILD: live Vivito model certification is enforced on the hardening preview; production OSV dependency security remains a separate release/security gate; running deterministic QA + type-check + Next build.");
const result=spawnSync(command,{cwd:root,stdio:"inherit",shell:true,env:process.env});
if(result.error)throw result.error;
process.exit(result.status??1);
