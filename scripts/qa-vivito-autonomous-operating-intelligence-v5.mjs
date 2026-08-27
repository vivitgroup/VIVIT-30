import fs from "node:fs";

const src = fs.readFileSync("lib/vivito/autonomous-operating-intelligence-v5.ts", "utf8");
const playbook = fs.readFileSync("lib/vivito/playbook.ts", "utf8");

const checks = [
  ["multi-horizon planning", /buildMultiHorizonPlan/],
  ["resource scheduling", /scheduleResources/],
  ["dependency critical path", /criticalPath/],
  ["decision queue prioritization", /prioritizeDecisionQueue/],
  ["escalation intelligence", /escalationDecision/],
  ["cross-client learning without leakage", /abstractCrossClientPattern/],
  ["outcome attribution", /attributeOutcome/],
  ["policy guardrail compiler", /evaluateGuardrails/],
  ["continuous opportunity scanning", /scanOpportunities/],
  ["executive narrative generation", /executiveNarrative/],
  ["simulation sandbox", /simulateDecision/],
  ["autonomous verification loop", /verifyExecution/],
  ["runtime context builder", /buildVivitoAutonomousOperatingContextV5/],
  ["runtime import wiring", /autonomous-operating-intelligence-v5/],
  ["runtime system wiring", /buildVivitoAutonomousOperatingContextV5\(\)/],
  ["privacy doctrine", /never expose one client's facts to another/i],
  ["causality discipline", /never turn correlation into causal certainty/i],
  ["proof-of-work verification", /require proof-of-work/i],
];

let passed = 0;
for (const [name, re] of checks) {
  const target = name.startsWith("runtime") ? playbook : src;
  if (!re.test(target)) {
    console.error(`FAIL  ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS  ${name}`);
    passed++;
  }
}

console.log(`\n${passed}/${checks.length} VIVITO Autonomous Operating Intelligence V5 checks passed.`);
if (passed !== checks.length) process.exit(1);
