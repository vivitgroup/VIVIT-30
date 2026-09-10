import fs from "node:fs";
import vm from "node:vm";

function assert(condition,message){if(!condition){console.error(`❌ ${message}`);process.exitCode=1}else console.log(`✅ ${message}`)}

const language=fs.readFileSync("lib/vivito/language.ts","utf8");
const providers=fs.readFileSync("lib/vivito/providers.ts","utf8");
const playbook=fs.readFileSync("lib/vivito/playbook.ts","utf8");
const assistant=fs.readFileSync("app/api/assistant/route.ts","utf8");

const normalize=language.match(/export function normalizeVivitoText\(input:string\)\{([\s\S]*?)\n\}/)?.[0]
  ?.replace("export function ","function ");
assert(Boolean(normalize),"Language normalization function exists");
if(normalize){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(`${normalize};this.normalizeVivitoText=normalizeVivitoText`,sandbox);
 const n=sandbox.normalizeVivitoText;
 assert(n("3ayz a3rf el campaigns") === "عايز اعرف ال campaigns","Arabizi common phrase normalizes to Arabic intent");
 assert(n("حلل ال campaign بتاعت TNG") === "حلل ال campaign بتاعت tng","Mixed Arabic-English normalizes deterministically");
 assert(n("عاوز الكامبينز") === "عايز الكامبينز","Egyptian spelling variants normalize");
 assert(n("مش عاوز campaign") === "مش عايز campaign","Negative Egyptian phrasing preserves negation");
}

assert(/Egyptian colloquial Arabic/.test(playbook),"Playbook explicitly supports Egyptian Arabic");
assert(/Franco\/Arabizi/.test(playbook),"Playbook explicitly supports Arabizi");
assert(/answer in natural Egyptian Arabic/i.test(language),"Language layer asks for natural Egyptian Arabic");
assert(/Do not translate brand names/i.test(language),"Language layer preserves brand names");
assert(/isCapabilityQuestion/.test(providers),"Provider layer detects capability questions");
assert(/أقدر أضيف عميل جديد حسب صلاحيتك/.test(providers),"Local advisor can answer Arabic capability questions");
assert(/أقدر أجهز فاتورة حسب صلاحيتك/.test(providers),"Local advisor can answer Arabic invoice capability questions");
assert(/isGeneralAdvisorSystem/.test(providers)&&/transparentAdvisorFailure/.test(providers),"Provider fallback is restricted to general advisor conversations");
assert(/vivito-live-erp-v5/.test(providers),"General advisor outage preserves the user request instead of generic ERP boilerplate");
assert(/mode:\"provider-unavailable\"/.test(assistant)&&/تعذر على VIVITO إكمال الرد على طلبك الحالي/.test(assistant),"Assistant has explicit provider-unavailable response instead of canned business fallback");
assert(!/configure an external AI provider/i.test(assistant),"User-facing advisor failure does not ask operators to configure infrastructure");

if(process.exitCode){console.error("\nVIVITO language QA FAILED");process.exit(process.exitCode)}
console.log("\nVIVITO language QA passed");
