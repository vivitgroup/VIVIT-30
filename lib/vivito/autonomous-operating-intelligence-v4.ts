export type ConfidenceLevel = "low" | "medium" | "high";

export type VivitoGoalPlan = {
  goal: string;
  workstreams: string[];
  constraints: string[];
  owners: string[];
  dependencies: string[];
  checkpoints: string[];
};

export function decomposeGoal(goal: string, constraints: string[] = []): VivitoGoalPlan {
  return {
    goal,
    workstreams: ["measurement", "demand", "conversion", "economics", "retention", "operations"],
    constraints,
    owners: ["executive-owner", "functional-owner", "data-owner"],
    dependencies: ["validated baseline", "capacity", "approval boundary"],
    checkpoints: ["baseline", "early signal", "decision gate", "post-mortem"],
  };
}

export function confidenceScore(input: {
  dataQuality: number;
  freshness: number;
  sampleAdequacy: number;
  consistency: number;
  contradictionPenalty?: number;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const base =
    clamp(input.dataQuality) * 0.3 +
    clamp(input.freshness) * 0.2 +
    clamp(input.sampleAdequacy) * 0.2 +
    clamp(input.consistency) * 0.3;
  const score = clamp(base - clamp(input.contradictionPenalty ?? 0));
  const level: ConfidenceLevel = score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low";
  return { score, level };
}

export function opportunityCost(options: Array<{ name: string; expectedValue: number; requiredInvestment: number }>) {
  const ranked = [...options]
    .map((o) => ({ ...o, netValue: o.expectedValue - o.requiredInvestment }))
    .sort((a, b) => b.netValue - a.netValue);
  const best = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  return {
    ranked,
    best,
    opportunityCostOfBest: best && second ? Math.max(0, second.netValue) : 0,
  };
}

export function marginalBudgetAllocation(
  options: Array<{ name: string; marginalReturn: number; risk: number; capacityRemaining: number }>,
) {
  return [...options].sort((a, b) => {
    const av = a.marginalReturn * Math.max(0, a.capacityRemaining) * (1 - Math.max(0, Math.min(1, a.risk)));
    const bv = b.marginalReturn * Math.max(0, b.capacityRemaining) * (1 - Math.max(0, Math.min(1, b.risk)));
    return bv - av;
  });
}

export function unitEconomics(input: {
  revenuePerCustomer: number;
  variableCostPerCustomer: number;
  cac: number;
  repeatContribution?: number;
}) {
  const contribution = input.revenuePerCustomer - input.variableCostPerCustomer + (input.repeatContribution ?? 0);
  const cacCeiling = Math.max(0, contribution);
  const contributionAfterCAC = contribution - input.cac;
  return { contribution, cacCeiling, contributionAfterCAC };
}

export function detectBusinessAnomaly(input: {
  actual: number;
  expected: number;
  tolerancePct: number;
  domain: "marketing" | "sales" | "finance" | "hr" | "operations" | "client";
}) {
  const denominator = Math.abs(input.expected) || 1;
  const variancePct = ((input.actual - input.expected) / denominator) * 100;
  const anomaly = Math.abs(variancePct) > Math.abs(input.tolerancePct);
  return {
    anomaly,
    variancePct,
    domain: input.domain,
    severity: Math.abs(variancePct) >= Math.abs(input.tolerancePct) * 2 ? "critical" : anomaly ? "warning" : "normal",
  };
}

export function buildStrategicCalendar(events: Array<{ name: string; date: string; leadDays: number }>) {
  return events.map((event) => ({
    ...event,
    preparationRule: `Begin preparation at least ${event.leadDays} days before ${event.name}.`,
  }));
}

export function buildPostMortem(input: {
  objective: string;
  expected: string;
  actual: string;
  rootCause: string;
  lesson: string;
  regression: string;
}) {
  return { ...input, policyUpdateRequired: Boolean(input.lesson && input.regression) };
}

export function safePeerBenchmark<T extends { metric: string; value: number }>(
  ownHistory: T[],
  anonymizedPeerStats: Array<{ metric: string; median: number; p75?: number }>,
) {
  return ownHistory.map((row) => ({
    ...row,
    peer: anonymizedPeerStats.find((p) => p.metric === row.metric) ?? null,
  }));
}

export type EvidenceLedgerEntry = {
  claim: string;
  source: string;
  observedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  type: "fact" | "inference" | "assumption" | "recommendation";
};

export type ExecutionProof = {
  action: string;
  proofType: "commit" | "artifact" | "db-mutation" | "provider-response" | "workflow";
  proofId: string;
  timestamp: string;
};

export function buildVivitoAutonomousOperatingContext() {
  return `AUTONOMOUS OPERATING INTELLIGENCE V4:\n- Goal decomposition: translate a strategic objective into measurable workstreams, dependencies, owners, checkpoints and decision gates.\n- Constraint-aware planning: account for budget, cash, capacity, headcount, stock, time, approval limits and operational bottlenecks before recommending execution.\n- KPI control tower: connect leading and lagging KPIs, detect deviations, identify likely drivers and assign accountable next actions.\n- Decision confidence: calibrate every material decision to data quality, freshness, sample adequacy, consistency and contradictory evidence.\n- Opportunity cost: compare viable alternatives and state what value is sacrificed when choosing one path over another.\n- Budget reallocation: optimize on marginal return, risk and remaining capacity instead of blindly ranking raw ROAS.\n- Unit economics diagnostics: reason in contribution margin, CAC ceiling, repeat economics, collection timing, refunds and fulfillment cost rather than top-line revenue alone.\n- Business anomaly detective: detect and triage anomalies across marketing, sales, finance, HR, operations and client behavior; investigate before acting.\n- Strategic calendar intelligence: plan ahead for seasonal and commercial events using required lead time and operational readiness, not reactive posting.\n- Automated post-mortems: compare expected vs actual, isolate root cause, codify the lesson and create a regression check before closing the loop.\n- Internal benchmarking: compare a business to its own history and anonymized compatible peer cohorts without leaking client data or mixing incompatible metric definitions.\n- Trust layer: every material claim should carry evidence type, source/freshness and confidence; every claimed execution must carry proof-of-work such as a commit, artifact, DB mutation, provider response or workflow result. Never say an action was executed without evidence.\n`;
}
