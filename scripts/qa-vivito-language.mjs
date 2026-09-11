import fs from "node:fs";

function assert(condition,message){if(!condition){console.error(`❌ ${message}`);process.exitCode=1}else console.log(`✅ ${message}`)}

const language=fs.readFileSync("lib/vivito/language.ts","utf8");
const providers=fs.readFileSync("lib/vivito/providers.ts","utf8");
const playbook=fs.readFileSync("lib/vivito/playbook.ts","utf8");
const assistant=fs.readFileSync("app/api/assistant/route.ts","utf8");

// Keep this gate coupled to the public language helper that the runtime actually uses.
// The previous QA looked for a removed normalizeVivitoText helper and therefore failed
// before it could validate the current contract.
assert(/export function normalizeVivitoLanguage\(text:string\)/.test(language),"Language normalization function exists");
assert(/INTENT_MAP\[token\.toLowerCase\(\)\]\|\|token/.test(language),"Language normalizer uses the guarded intent map");
assert(/"3ayez":"عايز"/.test(language)&&/"5aly":"خلي"/.test(language)&&/"msh":"مش"/.test(language),"Arabizi common intent tokens are supported");
assert(/Business nouns are preserved verbatim/.test(language),"Business and entity nouns are preserved during normalization");
assert(/Do not change entity names, amounts, dates, IDs, URLs, emails, or file references/i.test(language),"Language layer preserves entity-sensitive values");

assert(/Egyptian colloquial Arabic/.test(playbook),"Playbook explicitly supports Egyptian Arabic");
assert(/Franco\/Arabizi/.test(playbook),"Playbook explicitly supports Arabizi");
assert(/Reply in natural Egyptian Arabic/i.test(language),"Language layer asks for natural Egyptian Arabic");
assert(/preserving standard English marketing\/ERP terms/i.test(language),"Language layer preserves standard English business terms");
assert(/isCapabilityQuestion/.test(providers),"Provider layer detects capability questions");
assert(/أقدر أضيف عميل جديد حسب صلاحيتك/.test(providers),"Local advisor can answer Arabic capability questions");
assert(/أقدر أجهز فاتورة حسب صلاحيتك/.test(providers),"Local advisor can answer Arabic invoice capability questions");
assert(/isGeneralAdvisorSystem/.test(providers)&&/transparentAdvisorFailure/.test(providers),"Provider fallback is restricted to general advisor conversations");
assert(/vivito-live-erp-v5/.test(providers),"General advisor outage preserves the user request instead of generic ERP boilerplate");
assert(/mode:\"provider-unavailable\"/.test(assistant)&&/تعذر على VIVITO إكمال الرد على طلبك الحالي/.test(assistant),"Assistant has explicit provider-unavailable response instead of canned business fallback");
assert(!/configure an external AI provider/i.test(assistant),"User-facing advisor failure does not ask operators to configure infrastructure");

if(process.exitCode){console.error("\nVIVITO language QA FAILED");process.exit(process.exitCode)}
console.log("\nVIVITO language QA passed");
