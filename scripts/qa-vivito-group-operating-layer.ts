import assert from "node:assert/strict";
import {
  assertVivitoBusinessUnitResolved,
  buildVivitoBusinessUnitPrompt,
  resolveVivitoBusinessUnit,
} from "../lib/vivito/business-units";

const cases = [
  ["Give me the VIVIT Group executive pulse", "group"],
  ["حلل أداء VIVIT Marketing النهارده", "marketing"],
  ["VIVIT Hospitality occupancy this week", "hospitality"],
  ["هوسبتليتي عندها كام property active؟", "hospitality"],
  ["Tech deployments اللي فشلت النهارده", "tech"],
  ["فيفيت تك projects المتأخرة", "tech"],
  ["shared services payroll status", "shared"],
] as const;

for (const [query, expected] of cases) {
  const result = resolveVivitoBusinessUnit(query);
  assert.equal(result.unit, expected, `${query}: expected ${expected}, got ${result.unit}`);
  assert.equal(result.confidence, "explicit", `${query}: explicit routing expected`);
  assertVivitoBusinessUnitResolved(result);
}

const ambiguous = resolveVivitoBusinessUnit("قارن marketing و hospitality");
assert.equal(ambiguous.unit, null);
assert.equal(ambiguous.confidence, "ambiguous");
assert.deepEqual(new Set(ambiguous.candidates), new Set(["marketing", "hospitality"]));

const contextual = resolveVivitoBusinessUnit("وريني التاسكات المتأخرة", "marketing");
assert.equal(contextual.unit, "marketing");
assert.equal(contextual.confidence, "context");

const unresolved = resolveVivitoBusinessUnit("TNG بيدفع كام؟");
assert.equal(unresolved.unit, null, "A client name alone must never be guessed into a business unit");
assert.equal(unresolved.confidence, "none");

assert.throws(
  () => assertVivitoBusinessUnitResolved(unresolved),
  /vivito_business_unit_unresolved:missing/,
  "Unscoped execution must fail closed",
);

const prompt = buildVivitoBusinessUnitPrompt();
for (const required of ["group=VIVIT Group", "marketing=VIVIT Marketing", "hospitality=VIVIT Hospitality", "tech=VIVIT Tech", "shared=VIVIT Shared Services"]) {
  assert.ok(prompt.includes(required), `Business-unit prompt missing ${required}`);
}

console.log("VIVITO_GROUP_OPERATING_LAYER_QA: PASS");
