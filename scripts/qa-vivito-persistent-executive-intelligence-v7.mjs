import fs from "node:fs";

const engine = fs.readFileSync("lib/vivito/persistent-executive-intelligence-v7.ts", "utf8");
const v6 = fs.readFileSync("lib/vivito/cognitive-execution-intelligence-v6.ts", "utf8");

const checks = [
  ["decision memory preserves expected vs actual outcome", /DecisionMemoryRecordV2/.test(engine) && /expectedOutcome/.test(engine) && /actualOutcome/.test(engine)],
  ["decision memory uses supersession not silent mutation", /supersedesId/.test(engine) && /Fresh ERP\/source evidence overrides remembered assumptions/.test(engine)],
  ["client brand twin enforces strict client isolation", /mergeClientBrandTwin/.test(engine) && /CLIENT_TWIN_ISOLATION_VIOLATION/.test(engine)],
  ["client brand twin surfaces conflicts", /conflicts/.test(engine) && /verify against source evidence/.test(engine)],
  ["executive war room ranks material issues", /buildExecutiveWarRoom/.test(engine) && /priorityScore/.test(engine) && /financial exposure/.test(engine)],
  ["research agent keeps claim ledger", /planAutonomousResearchV2/.test(engine) && /claimLedger/.test(engine) && /contradictionChecks/.test(engine)],
  ["research agent checks freshness and rejects search summaries as facts", /staleClaims/.test(engine) && /search summary is never a fact/i.test(engine)],
  ["experimentation OS requires comparator and guardrails", /validateExperimentationOS/.test(engine) && /control\/comparator/.test(engine) && /missing guardrail/.test(engine)],
  ["experimentation OS has winner scale kill criteria", /winnerCriteria/.test(engine) && /scaleCriteria/.test(engine) && /killCriteria/.test(engine) && /NO_WINNER_YET/.test(engine)],
  ["financial digital twin separates collection and contribution economics", /calculateFinancialDigitalTwinV2/.test(engine) && /collectionGap/.test(engine) && /contributionProfit/.test(engine)],
  ["financial digital twin models runway and scenarios", /runwayMonths/.test(engine) && /downside/.test(engine) && /upside/.test(engine)],
  ["creative intelligence separates hypothesis from observed proof", /scoreCreativeIntelligenceV3/.test(engine) && /HYPOTHESIS_NOT_PERFORMANCE_PROOF/.test(engine) && /OBSERVED_PERFORMANCE_EVIDENCE/.test(engine)],
  ["creative intelligence exposes refresh triggers", /refreshTriggers/.test(engine) && /observed CTR decay/.test(engine)],
  ["early warning engine covers executive risks", /forecastEarlyWarningEngine/.test(engine) && /CHURN_RISK/.test(engine) && /CASH_SQUEEZE/.test(engine) && /CPL_INFLATION/.test(engine) && /CREATIVE_FATIGUE/.test(engine) && /SALES_TARGET_RISK/.test(engine) && /TEAM_OVERLOAD/.test(engine)],
  ["early warnings carry evidence owner and next action", /evidence:/.test(engine) && /owner:/.test(engine) && /nextAction:/.test(engine)],
  ["V7 context exposes all eight systems", /Decision Memory V2/.test(engine) && /Client \/ Brand Twin/.test(engine) && /Executive War Room/.test(engine) && /Autonomous Research Agent V2/.test(engine) && /Experimentation OS/.test(engine) && /Financial Digital Twin/.test(engine) && /Creative Intelligence V3/.test(engine) && /Forecast \+ Early Warning/.test(engine)],
  ["V6 imports V7 runtime", /persistent-executive-intelligence-v7/.test(v6) && /buildVivitoPersistentExecutiveContextV7/.test(v6)],
  ["V7 runtime context is appended", /buildVivitoPersistentExecutiveContextV7\(\)/.test(v6)],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`VIVITO V7 QA failed ${failed.length}/${checks.length}:`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`${checks.length}/${checks.length} VIVITO Persistent Executive Intelligence V7 checks passed`);
