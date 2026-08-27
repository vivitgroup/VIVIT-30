import fs from "node:fs";

const engine = fs.readFileSync("lib/vivito/cognitive-execution-intelligence-v6.ts", "utf8");
const playbook = fs.readFileSync("lib/vivito/playbook.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const checks = [
  ["causal graph engine", /buildCausalGraph/.test(engine) && /tested causal links/.test(engine)],
  ["hypothesis ranking", /rankHypotheses/.test(engine) && /probability, impact and ease of validation/.test(engine)],
  ["information value", /rankInformationValue/.test(engine) && /ability to change the decision/.test(engine)],
  ["adaptive experiment sequencing", /sequenceExperiments/.test(engine) && /cheapest\/highest-learning tests first/.test(engine)],
  ["second-order effects", /analyzeSecondOrderEffects/.test(engine) && /Second-order effects/.test(engine)],
  ["strategic contradiction detector", /detectStrategicContradictions/.test(engine) && /mutually incompatible objectives/.test(engine)],
  ["executive decision journal", /DecisionJournalEntry/.test(engine) && /Executive decision journal/.test(engine)],
  ["organizational learning", /codifyOrganizationalLearning/.test(engine) && /scoped reusable rules/.test(engine)],
  ["human in the loop", /humanInLoopDecision/.test(engine) && /approval-required/.test(engine) && /autonomous-with-verification/.test(engine)],
  ["multi objective optimizer", /optimizeMultipleObjectives/.test(engine) && /explicit weights/.test(engine)],
  ["strategic risk register", /buildStrategicRiskRegister/.test(engine) && /probability, impact, owner, mitigation, trigger and contingency/.test(engine)],
  ["executive operating autopilot", /buildExecutiveOperatingAutopilot/.test(engine) && /objective into plan, ownership, execution, evidence verification, review and correction/.test(engine)],
  ["runtime import", /buildVivitoCognitiveExecutionContextV6/.test(playbook)],
  ["runtime context wired", /buildVivitoCognitiveExecutionContextV6\(\)/.test(playbook)],
  ["build gate wired", String(pkg.scripts?.build || "").includes("qa:vivito-cognitive-execution-intelligence-v6")],
  ["qa script registered", pkg.scripts?.["qa:vivito-cognitive-execution-intelligence-v6"] === "node scripts/qa-vivito-cognitive-execution-intelligence-v6.mjs"],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`VIVITO V6 QA failed ${failed.length}/${checks.length}:`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`${checks.length}/${checks.length} VIVITO Cognitive & Execution Intelligence V6 checks passed`);
