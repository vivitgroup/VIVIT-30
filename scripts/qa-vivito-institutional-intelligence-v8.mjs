import fs from "node:fs";

const engine = fs.readFileSync("lib/vivito/institutional-intelligence-v8.ts", "utf8");
const runtime = fs.readFileSync("lib/vivito/cognitive-execution-intelligence-v6.ts", "utf8");

const expectedIds = [
  "company-memory-graph-v8",
  "strategic-objective-tree-v8",
  "kpi-dependency-map-v8",
  "management-cadence-engine-v8",
  "performance-review-intelligence-v8",
  "commitment-tracking-system-v8",
  "cross-functional-conflict-resolver-v2",
  "capital-allocation-board-v8",
  "scenario-war-gaming-engine-v8",
  "governance-audit-trail-v3",
  "organizational-health-monitor-v8",
  "ceo-command-center-v8",
];

const checks = [
  ["exact 12 V8 capability IDs exist", expectedIds.every((id) => engine.includes(id))],
  ["company memory graph scopes workspace/client and tracks evidence", /buildCompanyMemoryGraphV8/.test(engine) && /workspaceId/.test(engine) && /contradictions/.test(engine) && /hypotheses/.test(engine)],
  ["strategic objective tree detects orphan objectives", /buildStrategicObjectiveTreeV8/.test(engine) && /orphaned/.test(engine) && /progressPct/.test(engine)],
  ["KPI dependency map separates leading and hypothesis links", /buildKpiDependencyMapV8/.test(engine) && /leadingIndicators/.test(engine) && /hypotheses/.test(engine)],
  ["management cadence covers daily weekly monthly quarterly", /buildManagementCadenceV8/.test(engine) && /daily:/.test(engine) && /weekly:/.test(engine) && /monthly:/.test(engine) && /quarterly:/.test(engine)],
  ["performance review uses outcomes commitments quality blockers evidence", /scorePerformanceReviewV8/.test(engine) && /commitmentRate/.test(engine) && /blockerRate/.test(engine) && /evidenceCoverage/.test(engine)],
  ["commitment tracker identifies overdue and unverified done", /trackCommitmentsV8/.test(engine) && /overdue/.test(engine) && /unverifiedDone/.test(engine)],
  ["cross-functional conflict resolver fails closed on hard constraints", /resolveCrossFunctionalConflictV2/.test(engine) && /hardConstraintViolation/.test(engine) && /rejectedForHardConstraint/.test(engine)],
  ["capital allocation is risk adjusted", /rankCapitalAllocationV8/.test(engine) && /riskAdjustedValue/.test(engine) && /returnOnCapital/.test(engine)],
  ["war gaming includes competitor response and cash impact", /runScenarioWarGameV8/.test(engine) && /competitorResponse/.test(engine) && /expectedCashImpact/.test(engine)],
  ["governance audit trail requires actor reason evidence time", /validateGovernanceAuditTrailV3/.test(engine) && /actor/.test(engine) && /reason/.test(engine) && /evidence/.test(engine) && /occurredAt/.test(engine)],
  ["organizational health covers overload latency commitments dependencies blockers", /assessOrganizationalHealthV8/.test(engine) && /TEAM_OVERLOAD/.test(engine) && /APPROVAL_LATENCY/.test(engine) && /COMMITMENT_RELIABILITY/.test(engine) && /DEPENDENCY_CONCENTRATION/.test(engine) && /AGED_BLOCKERS/.test(engine)],
  ["CEO command center ranks decisions risks opportunities blockers", /buildCeoCommandCenterV8/.test(engine) && /topDecision/.test(engine) && /topRisk/.test(engine) && /topOpportunity/.test(engine) && /topBlocker/.test(engine)],
  ["V8 context includes all twelve systems", /Company Memory Graph/.test(engine) && /Strategic Objective Tree/.test(engine) && /KPI Dependency Map/.test(engine) && /Management Cadence Engine/.test(engine) && /Performance Review Intelligence/.test(engine) && /Commitment Tracking System/.test(engine) && /Cross-Functional Conflict Resolver V2/.test(engine) && /Capital Allocation Board/.test(engine) && /Scenario War-Gaming Engine/.test(engine) && /Governance & Audit Trail V3/.test(engine) && /Organizational Health Monitor/.test(engine) && /CEO Command Center/.test(engine)],
  ["V8 context preserves client isolation and freshness truth", /never leak facts across clients/i.test(engine) && /fresher verified source evidence/i.test(engine)],
  ["V8 context preserves authorization and proof of work", /execution requires authorization and proof-of-work/i.test(engine)],
  ["runtime imports V8 institutional context", /institutional-intelligence-v8/.test(runtime) && /buildVivitoInstitutionalIntelligenceContextV8/.test(runtime)],
  ["runtime appends V8 context", /buildVivitoInstitutionalIntelligenceContextV8\(\)/.test(runtime)],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`VIVITO V8 QA failed ${failed.length}/${checks.length}:`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`${checks.length}/${checks.length} VIVITO Institutional Intelligence V8 checks passed`);
