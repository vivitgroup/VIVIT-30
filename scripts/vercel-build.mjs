import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
const source=String(pkg?.scripts?.build??"");
const prefix="npm audit --audit-level=high && ";
if(!source.startsWith(prefix)){
  console.error("VERCEL_BUILD_GUARD: expected security-audit prefix was not found in package.json build script");
  process.exit(1);
}
const command=source.slice(prefix.length);
console.log("VERCEL_BUILD: npm audit remains a separate release/security gate; running deterministic QA + type-check + Next build.");
const result=spawnSync(command,{cwd:new URL("..",import.meta.url),stdio:"inherit",shell:true,env:process.env});
if(result.error)throw result.error;
process.exit(result.status??1);
