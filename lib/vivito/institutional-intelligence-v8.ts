export const VIVITO_INSTITUTIONAL_INTELLIGENCE_V8 = [
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
] as const;

export type InstitutionalCapabilityV8 = (typeof VIVITO_INSTITUTIONAL_INTELLIGENCE_V8)[number];

export type CompanyMemoryNodeV8 = {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  type: "decision" | "campaign" | "contract" | "metric" | "issue" | "meeting" | "objective" | "person";
  label: string;
  observedAt: string;
  source: string;
  confidence: number;
};

export type CompanyMemoryEdgeV8 = {
  from: string;
  to: string;
  relation: "caused" | "influenced" | "depends-on" | "owned-by" | "supersedes" | "supports" | "contradicts";
  evidence: "observed" | "tested" | "hypothesis";
};

export function buildCompanyMemoryGraphV8(nodes: CompanyMemoryNodeV8[], edges: CompanyMemoryEdgeV8[], scope: { workspaceId: string; clientId?: string | null }) {
  const scoped = nodes.filter((n) => n.workspaceId === scope.workspaceId && (!scope.clientId || !n.clientId || n.clientId === scope.clientId));
  const ids = new Set(scoped.map((n) => n.id));
  const validEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return {
    nodes: scoped,
    edges: validEdges,
    contradictions: validEdges.filter((e) => e.relation === "contradicts"),
    hypotheses: validEdges.filter((e) => e.evidence === "hypothesis"),
    doctrine: "Memory is scoped, source-linked and time-stamped; fresher verified source evidence outranks remembered assumptions.",
  };
}

export type ObjectiveNodeV8 = {
  id: string;
  parentId?: string | null;
  level: "company" | "department" | "kpi" | "initiative";
  label: string;
  owner: string;
  target?: number | null;
  actual?: number | null;
  dueAt: string;
};

export function buildStrategicObjectiveTreeV8(nodes: ObjectiveNodeV8[]) {
  const ids = new Set(nodes.map((n) => n.id));
  const orphaned = nodes.filter((n) => n.parentId && !ids.has(n.parentId));
  const roots = nodes.filter((n) => !n.parentId);
  const progress = nodes.filter((n) => n.target !== null && n.target !== undefined && n.actual !== null && n.actual !== undefined)
    .map((n) => ({ id: n.id, progressPct: n.target ? (Number(n.actual) / n.target) * 100 : 0 }));
  return { roots, nodes, orphaned, progress, valid: orphaned.length === 0 };
}

export type KpiDependencyV8 = { from: string; to: string; lag: "leading" | "coincident" | "lagging"; owner: string; evidence: "observed" | "tested" | "hypothesis" };
export function buildKpiDependencyMapV8(kpis: string[], dependencies: KpiDependencyV8[]) {
  const ids = new Set(kpis);
  const valid = dependencies.filter((d) => ids.has(d.from) && ids.has(d.to));
  return { kpis, dependencies: valid, leadingIndicators: valid.filter((d) => d.lag === "leading"), hypotheses: valid.filter((d) => d.evidence === "hypothesis") };
}

export type CadenceInputV8 = { role: string; department: string; criticality: number; volatility: number };
export function buildManagementCadenceV8(input: CadenceInputV8) {
  const score = Math.max(0, input.criticality) + Math.max(0, input.volatility);
  return {
    daily: score >= 14 ? ["exceptions", "critical blockers", "cash/availability alerts"] : ["critical exceptions only"],
    weekly: ["KPI review", "commitments", "decisions", "risks", "experiments"],
    monthly: ["financial performance", "client health", "capacity", "portfolio allocation"],
    quarterly: ["strategy", "capital allocation", "scenario review", "objective reset"],
    role: input.role,
    department: input.department,
  };
}

export type PerformanceReviewInputV8 = { person: string; outcomes: number; commitmentsMet: number; commitmentsTotal: number; quality: number; blockersOwned: number; blockersResolved: number; evidenceCoverage: number };
export function scorePerformanceReviewV8(input: PerformanceReviewInputV8) {
  const commitmentRate = input.commitmentsTotal ? input.commitmentsMet / input.commitmentsTotal : 1;
  const blockerRate = input.blockersOwned ? input.blockersResolved / input.blockersOwned : 1;
  const score = Math.max(0, Math.min(100, input.outcomes * 0.4 + commitmentRate * 100 * 0.2 + input.quality * 0.2 + blockerRate * 100 * 0.1 + input.evidenceCoverage * 0.1));
  return { person: input.person, score, commitmentRate, blockerRate, evidenceCoverage: input.evidenceCoverage, doctrine: "Performance review prioritizes outcomes, commitments, quality and evidence over subjective impressions." };
}

export type CommitmentV8 = { id: string; text: string; owner: string; dueAt: string; status: "open" | "done" | "blocked" | "cancelled"; evidence?: string | null; source: string };
export function trackCommitmentsV8(items: CommitmentV8[], nowIso: string) {
  const now = Date.parse(nowIso);
  const overdue = items.filter((i) => i.status === "open" && Date.parse(i.dueAt) < now);
  const unverifiedDone = items.filter((i) => i.status === "done" && !i.evidence);
  return { items, overdue, unverifiedDone, completionPct: items.length ? (items.filter((i) => i.status === "done" && i.evidence).length / items.length) * 100 : 100 };
}

export type FunctionalProposalV8 = { function: string; action: string; financialImpact: number; strategicImpact: number; risk: number; hardConstraintViolation?: boolean; reversibility: number };
export function resolveCrossFunctionalConflictV2(items: FunctionalProposalV8[]) {
  const eligible = items.filter((i) => !i.hardConstraintViolation);
  const ranked = eligible.map((i) => ({ ...i, score: i.financialImpact * 0.35 + i.strategicImpact * 0.3 + i.reversibility * 0.15 - i.risk * 0.2 })).sort((a, b) => b.score - a.score);
  return { winner: ranked[0] ?? null, ranked, rejectedForHardConstraint: items.filter((i) => i.hardConstraintViolation), doctrine: "Hard constraints dominate local optimization; trade-offs remain explicit." };
}

export type CapitalOptionV8 = { id: string; capitalRequired: number; expectedValue: number; downsideLoss: number; confidence: number; strategicFit: number; liquidityMonths?: number | null };
export function rankCapitalAllocationV8(options: CapitalOptionV8[]) {
  return [...options].map((o) => {
    const riskAdjustedValue = o.expectedValue * Math.max(0, Math.min(1, o.confidence)) - o.downsideLoss * (1 - Math.max(0, Math.min(1, o.confidence)));
    const returnOnCapital = o.capitalRequired > 0 ? riskAdjustedValue / o.capitalRequired : 0;
    const score = returnOnCapital * 0.7 + o.strategicFit * 0.3;
    return { ...o, riskAdjustedValue, returnOnCapital, score };
  }).sort((a, b) => b.score - a.score);
}

export type WarGameScenarioV8 = { name: "aggressive" | "base" | "defensive"; revenue: number; cashImpact: number; marginPct: number; competitorResponse: string; probability: number };
export function runScenarioWarGameV8(scenarios: WarGameScenarioV8[]) {
  const normalized = scenarios.map((s) => ({ ...s, probability: Math.max(0, Math.min(1, s.probability)) }));
  const expectedCashImpact = normalized.reduce((sum, s) => sum + s.cashImpact * s.probability, 0);
  const worst = [...normalized].sort((a, b) => a.cashImpact - b.cashImpact)[0] ?? null;
  return { scenarios: normalized, expectedCashImpact, worst, doctrine: "War-gaming separates scenarios and competitor responses from predictions; probabilities must not be presented as certainty." };
}

export type AuditEventV8 = { id: string; actor: string; action: string; reason: string; evidence: string[]; approvedBy?: string | null; occurredAt: string; result?: string | null };
export function validateGovernanceAuditTrailV3(events: AuditEventV8[]) {
  const invalid = events.filter((e) => !e.actor || !e.action || !e.reason || !e.occurredAt || e.evidence.length === 0);
  return { events, invalid, valid: invalid.length === 0, immutableFields: ["actor", "action", "reason", "occurredAt", "evidence"] };
}

export type OrgHealthInputV8 = { teamUtilizationPct: number; approvalLatencyHours: number; missedCommitmentPct: number; criticalDependencyCount: number; blockerAgeDays: number };
export function assessOrganizationalHealthV8(input: OrgHealthInputV8) {
  const alerts: string[] = [];
  if (input.teamUtilizationPct >= 90) alerts.push("TEAM_OVERLOAD");
  if (input.approvalLatencyHours >= 48) alerts.push("APPROVAL_LATENCY");
  if (input.missedCommitmentPct >= 20) alerts.push("COMMITMENT_RELIABILITY");
  if (input.criticalDependencyCount >= 3) alerts.push("DEPENDENCY_CONCENTRATION");
  if (input.blockerAgeDays >= 7) alerts.push("AGED_BLOCKERS");
  return { alerts, health: alerts.length >= 3 ? "critical" : alerts.length ? "watch" : "healthy", input };
}

export type CeoSignalV8 = { title: string; type: "decision" | "risk" | "opportunity" | "blocker"; impact: number; urgency: number; confidence: number; financialExposure: number; owner: string; evidence: string[]; noActionImpact: string };
export function buildCeoCommandCenterV8(signals: CeoSignalV8[]) {
  const ranked = [...signals].map((s) => ({ ...s, priority: s.impact * 0.3 + s.urgency * 0.25 + Math.abs(s.financialExposure) * 0.25 + s.confidence * 0.2 })).sort((a, b) => b.priority - a.priority);
  return {
    topDecision: ranked.find((s) => s.type === "decision") ?? null,
    topRisk: ranked.find((s) => s.type === "risk") ?? null,
    topOpportunity: ranked.find((s) => s.type === "opportunity") ?? null,
    topBlocker: ranked.find((s) => s.type === "blocker") ?? null,
    ranked,
    doctrine: "CEO view must answer what changed, why it matters, evidence, financial exposure, decision, owner and consequence of no action.",
  };
}

export function buildVivitoInstitutionalIntelligenceContextV8() {
  return `
VIVITO INSTITUTIONAL INTELLIGENCE V8 — ACTIVE
- Company Memory Graph: connect decisions, campaigns, contracts, metrics, issues, meetings, objectives and owners with scoped source-linked relationships; never leak facts across clients.
- Strategic Objective Tree: map company objectives to department objectives, KPIs, initiatives, owners, targets and dates; orphan objectives are invalid.
- KPI Dependency Map: distinguish leading, coincident and lagging indicators and label untested causal links as hypotheses.
- Management Cadence Engine: run exception-focused daily, operating weekly, financial/capacity monthly and strategy/capital quarterly cadences.
- Performance Review Intelligence: judge outcomes, commitments, quality, blocker resolution and evidence rather than subjective impressions.
- Commitment Tracking System: convert decisions and meeting promises into owner/date/evidence-backed commitments; done without evidence is not verified done.
- Cross-Functional Conflict Resolver V2: compare economics, strategic impact, reversibility and risk while hard constraints override local optimization.
- Capital Allocation Board: rank initiatives by risk-adjusted value, return on capital, confidence, downside and strategic fit; protect liquidity constraints.
- Scenario War-Gaming Engine: model aggressive/base/defensive scenarios, cash impact and competitor response without presenting scenarios as facts.
- Governance & Audit Trail V3: retain actor, action, reason, evidence, approval, time and result for material changes; no silent history rewriting.
- Organizational Health Monitor: watch overload, approval latency, missed commitments, dependency concentration and aged blockers.
- CEO Command Center: surface the most important decision, risk, opportunity and blocker with evidence, financial exposure, owner and no-action consequence.
- Institutional rule: execution requires authorization and proof-of-work; memory and models never outrank fresher verified source evidence.
`;
}
