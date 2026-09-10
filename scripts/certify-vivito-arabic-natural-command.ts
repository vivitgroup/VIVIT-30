import assert from "node:assert/strict";
import {detectVivitoLanguageStyle,normalizeVivitoLanguage} from "../lib/vivito/language";

const checks:Array<[string,()=>void]> = [
  ["detects Egyptian Arabic",()=>assert.equal(detectVivitoLanguageStyle("عايز اعمل تاسك للعميل"),"EGYPTIAN")],
  ["detects Franco",()=>assert.equal(detectVivitoLanguageStyle("3ayez a3mel task"),"FRANCO")],
  ["detects mixed Arabic English",()=>assert.equal(detectVivitoLanguageStyle("عايز update للcampaign"),"MIXED")],
  ["normalizes Franco action verbs",()=>assert.equal(normalizeVivitoLanguage("3ayez 5aly QA Client active").normalized,"عايز خلي QA Client active")],
  ["preserves unquoted entity business word",()=>assert.ok(normalizeVivitoLanguage("5aly QA Client active").normalized.includes("QA Client"))],
  ["preserves campaign entity text",()=>assert.ok(normalizeVivitoLanguage("3del Summer Campaign budget").normalized.includes("Summer Campaign budget"))],
  ["preserves email",()=>assert.ok(normalizeVivitoLanguage("eb3at to qa.client+ops@vivitgroup.com").normalized.includes("qa.client+ops@vivitgroup.com"))],
  ["preserves URL",()=>assert.ok(normalizeVivitoLanguage("5aly https://example.com/client?id=ABC-17").normalized.includes("https://example.com/client?id=ABC-17"))],
  ["preserves date",()=>assert.ok(normalizeVivitoLanguage("5aly deadline 2026-09-17").normalized.includes("2026-09-17"))],
  ["preserves IDs",()=>assert.ok(normalizeVivitoLanguage("3del TASK-ABC-991").normalized.includes("TASK-ABC-991"))],
  ["preserves amounts",()=>assert.ok(normalizeVivitoLanguage("edfa3 12500.50 EGP").normalized.includes("12500.50 EGP"))],
  ["normalization is deterministic",()=>{
    const q="3ayez 3del QA Client TASK-17";
    assert.deepEqual(normalizeVivitoLanguage(q),normalizeVivitoLanguage(q));
  }],
  ["normalization never mutates raw input",()=>{
    const q="3ayez update QA Client";
    assert.equal(normalizeVivitoLanguage(q).raw,q);
  }],
];

let failed=0;
for(const [name,run] of checks){
  try{run();console.log(`PASS ${name}`)}catch(error){failed++;console.error(`FAIL ${name}`,error)}
}
if(failed){
  console.error(`VIVITO Arabic/Natural Command Certification failed: ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`VIVITO Arabic/Natural Command Certification passed: ${checks.length}/${checks.length}`);
