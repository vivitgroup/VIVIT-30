import fs from "node:fs";

const playbook = fs.readFileSync(new URL("../lib/vivito/playbook.ts", import.meta.url), "utf8");

const checks = [
  ["defines ambiguous metrics before diagnosis", /Definition before diagnosis/i],
  ["fails closed on insufficient evidence", /evidence is insufficient/i],
  ["rejects implausible unverified values", /implausible number as fact/i],
  ["keeps metric definitions stable", /Metric definition must stay stable/i],
  ["investigates conflicting or anomalous data", /investigate before optimizing/i],
  ["links marketing to business outcomes", /business outcome/i],
  ["includes payback in economic decisions", /payback period/i],
  ["separates correlation from causation and requires a test", /Correlation is not causation[\s\S]*propose a test/i],
  ["adds rollback or exit conditions to material actions", /rollback or exit condition/i],
  ["does not mix incompatible metrics or populations", /do not mix them/i],
];

let passed = 0;
for (const [label, pattern] of checks) {
  if (pattern.test(playbook)) {
    console.log(`PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`FAIL  ${label}`);
  }
}

if (passed !== checks.length) {
  console.error(`\n${passed}/${checks.length} VIVITO decision-doctrine regression checks passed.`);
  process.exit(1);
}

console.log(`\n${passed}/${checks.length} VIVITO decision-doctrine regression checks passed.`);
