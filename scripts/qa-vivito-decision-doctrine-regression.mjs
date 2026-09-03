import fs from "node:fs";

const playbook = fs.readFileSync(new URL("../lib/vivito/playbook.ts", import.meta.url), "utf8");
const capabilities = fs.readFileSync(new URL("../lib/vivito/capability-pack-v4.ts", import.meta.url), "utf8");

const checks = [
  ["defines ambiguous metrics before diagnosis", /Definition before diagnosis/i, playbook],
  ["fails closed on insufficient evidence", /evidence is insufficient/i, playbook],
  ["rejects implausible unverified values", /implausible number as fact/i, playbook],
  ["keeps metric definitions stable", /Metric definition must stay stable/i, playbook],
  ["investigates conflicting or anomalous data", /investigate before optimizing/i, playbook],
  ["links marketing to business outcomes", /business outcome/i, playbook],
  ["includes payback in economic decisions", /payback period/i, playbook],
  ["separates correlation from causation and requires a test", /Correlation is not causation[\s\S]*propose a test/i, playbook],
  ["adds rollback or exit conditions to material actions", /rollback or exit condition/i, playbook],
  ["does not mix incompatible metrics or populations", /do not mix them/i, playbook],

  ["persistent decision memory v2 is active", /Persistent Decision Memory V2[\s\S]*actual outcome[\s\S]*fresher ERP/i, capabilities],
  ["autonomous research v2 uses claim-ledger evidence", /Autonomous Research Agent V2[\s\S]*claim ledger[\s\S]*contradictory evidence/i, capabilities],
  ["executive war room arbitrates cross-functional dissent", /Executive War Room V2[\s\S]*CEO[\s\S]*CFO[\s\S]*CMO[\s\S]*one enterprise decision/i, capabilities],
  ["experimentation os pre-registers scale and kill rules", /Marketing Experimentation OS V2[\s\S]*Scale\/Kill rule[\s\S]*Pre-register/i, capabilities],
  ["financial digital twin models profit cash and payback", /Financial Digital Twin V2[\s\S]*contribution margin[\s\S]*payback[\s\S]*cash/i, capabilities],
  ["client and brand twin is isolated per client", /Client & Brand Twin V3[\s\S]*client isolation is mandatory/i, capabilities],
  ["creative intelligence separates pre-score from performance proof", /Creative Intelligence V2[\s\S]*hypothesis, not proof/i, capabilities],
  ["media buyer copilot diagnoses hierarchy and gates writes", /Media Buyer Copilot V2[\s\S]*account -> campaign -> ad set -> ad[\s\S]*approval-gated/i, capabilities],
  ["sales conversation intelligence separates explicit and inferred signals", /Sales Conversation Intelligence V2[\s\S]*explicit promise[\s\S]*analyst inference/i, capabilities],
  ["meeting intelligence extracts decisions owners and deadlines", /Meeting Intelligence V2[\s\S]*Decisions, Actions, Owners, Deadlines/i, capabilities],
  ["forecasting engine carries confidence and break conditions", /Forecasting Engine V2[\s\S]*confidence[\s\S]*break conditions/i, capabilities],
  ["self improvement protects frozen benchmark and evaluator", /Self-Improvement Engine V2[\s\S]*frozen benchmark[\s\S]*Never weaken evaluator/i, capabilities],
];

let passed = 0;
for (const [label, pattern, corpus] of checks) {
  if (pattern.test(corpus)) {
    console.log(`PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`FAIL  ${label}`);
  }
}

if (passed !== checks.length) {
  console.error(`\n${passed}/${checks.length} VIVITO decision/capability regression checks passed.`);
  process.exit(1);
}

console.log(`\n${passed}/${checks.length} VIVITO decision/capability regression checks passed.`);
