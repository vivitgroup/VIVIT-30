export type EvidenceRefV7 = {
  id: string;
  source: string;
  observedAt: string;
  confidence: number;
};

export type DecisionMemoryRecordV2 = {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  decision: string;
  assumptions: string[];
  evidence: EvidenceRefV7[];
  expectedOutcome: string;
  actualOutcome?: string | null;
  owner: string;
  decidedAt: string;
  reviewAt: string;
  supersedesId?: string | null;
  status: "active" | "review-due" | "superseded" | "invalidated";
};

export function buildDecisionMemoryV2(
  records: DecisionMemoryRecordV2[],
  scope: { workspaceId: string; clientId?: string | null; query?: string },
) {
  const query = (scope.query || "").toLowerCase();
  const scoped = records.filter((record) => {
    if (record.workspaceId !== scope.workspaceId) return false;
    if (scope.clientId && record.clientId && record.clientId !== scope.clientId) return false;
    if (!query) return true;
    const haystack = [record.decision, record.expectedOutcome, record.actualOutcome || "", ...record.assumptions]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const supersededIds = new Set(scoped.map((r) => r.supersedesId).filter(Boolean));
  const active = scoped
    .filter((r) => r.status !== "invalidated" && r.status !== "superseded" && !supersededIds.has(r.id))
    .sort((a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt));
  const reviewed = scoped.filter((r) => Boolean(r.actualOutcome));
  const reviewDue = active.filter((r) => Date.parse(r.reviewAt) <= Date.now());

  return {
    active,
    reviewed,
    reviewDue,
    doctrine:
      "Fresh ERP/source evidence overrides remembered assumptions. Corrections supersede old records; never silently mutate decision history.",
  };
}

export type ClientBrandTwinSnapshotV7 = {
  clientId: string;
  version: number;
  voice: string[];
  visualCodes: string[];
  icp: string[];
  jobsToBeDone: string[];
  offers: string[];
  pricing: string[];
  objections: string[];
  journey: string[];
  winningCreatives: string[];
  failedCreatives: string[];
  channelHistory: string[];
  competitors: string[];
  constraints: string[];
  objectives: string[];
  sourceEvidence: EvidenceRefV7[];
  conflicts: string[];
  updatedAt: string;
};

export function mergeClientBrandTwin(
  previous: ClientBrandTwinSnapshotV7,
  update: Partial<Omit<ClientBrandTwinSnapshotV7, "clientId" | "version">> & { clientId: string },
): ClientBrandTwinSnapshotV7 {
  if (previous.clientId !== update.clientId) {
    throw new Error("CLIENT_TWIN_ISOLATION_VIOLATION");
  }

  const conflicts = [...previous.conflicts];
  const detectConflict = (field: keyof ClientBrandTwinSnapshotV7, incoming?: unknown) => {
    if (!incoming || !Array.isArray(incoming) || incoming.length === 0) return;
    const current = previous[field];
    if (Array.isArray(current) && current.length && JSON.stringify(current) !== JSON.stringify(incoming)) {
      conflicts.push(`${String(field)} changed; verify against source evidence before treating the new value as canonical.`);
    }
  };
  detectConflict("voice", update.voice);
  detectConflict("visualCodes", update.visualCodes);
  detectConflict("offers", update.offers);
  detectConflict("pricing", update.pricing);
  detectConflict("objectives", update.objectives);

  return {
    ...previous,
    ...update,
    clientId: previous.clientId,
    version: previous.version + 1,
    conflicts: [...new Set(conflicts)],
    updatedAt: update.updatedAt || new Date().toISOString(),
  };
}

export type WarRoomItemV7 = {
  id: string;
  type: "decision" | "risk" | "opportunity" | "blocker";
  title: string;
  impact: number;
  urgency: number;
  confidence: number;
  financialImpact?: number | null;
  owner: string;
  deadline?: string | null;
  evidence: EvidenceRefV7[];
};

export function buildExecutiveWarRoom(items: WarRoomItemV7[]) {
  const ranked = items
    .map((item) => ({
      ...item,
      priorityScore:
        item.impact * 0.4 + item.urgency * 0.35 + item.confidence * 0.15 + (item.financialImpact ? Math.min(10, Math.abs(item.financialImpact) / 10000) : 0) * 0.1,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    decisionQueue: ranked.filter((x) => x.type === "decision" || x.type === "blocker"),
    risks: ranked.filter((x) => x.type === "risk"),
    opportunities: ranked.filter((x) => x.type === "opportunity"),
    topPriority: ranked[0] || null,
    missingOwnership: ranked.filter((x) => !x.owner),
    doctrine: "Rank enterprise decisions by impact, urgency, confidence and material financial exposure; surface evidence and ownership.",
  };
}

export type ResearchClaimV7 = {
  claim: string;
  source?: string | null;
  sourceDate?: string | null;
  authority: "primary" | "official" | "reputable-secondary" | "community" | "unknown";
  locality?: string | null;
  confidence: number;
  contradictedBy?: string[];
};

export function planAutonomousResearchV2(question: string, claims: ResearchClaimV7[] = [], freshnessDays = 30) {
  const now = Date.now();
  const ledger = claims.map((claim) => {
    const ageDays = claim.sourceDate ? Math.floor((now - Date.parse(claim.sourceDate)) / 86400000) : null;
    return {
      ...claim,
      ageDays,
      stale: ageDays === null || ageDays > freshnessDays,
      verified: Boolean(claim.source) && claim.authority !== "unknown" && claim.confidence >= 0.7,
      hasContradiction: Boolean(claim.contradictedBy?.length),
    };
  });

  return {
    question,
    sourcePlan: ["primary/official sources", "independent reputable sources", "local market evidence where material"],
    claimLedger: ledger,
    contradictionChecks: ledger.filter((x) => x.hasContradiction),
    staleClaims: ledger.filter((x) => x.stale),
    gaps: ledger.filter((x) => !x.verified).map((x) => x.claim),
    doctrine: "A search summary is never a fact. Verify claims, dates, authority, locality, contradictions and freshness before recommendation.",
  };
}

export type ExperimentPlanV7 = {
  hypothesis: string;
  treatment: string;
  comparator: string;
  primaryMetric: string;
  guardrails: string[];
  trackingReady: boolean;
  durationDays: number;
  minimumSample: number;
  winnerCriteria: string;
  scaleCriteria: string;
  killCriteria: string;
  knownConfounds?: string[];
};

export function validateExperimentationOS(plan: ExperimentPlanV7) {
  const issues: string[] = [];
  if (!plan.hypothesis) issues.push("missing hypothesis");
  if (!plan.treatment) issues.push("missing treatment");
  if (!plan.comparator) issues.push("missing control/comparator");
  if (!plan.primaryMetric) issues.push("missing primary metric");
  if (!plan.guardrails.length) issues.push("missing guardrail");
  if (!plan.trackingReady) issues.push("tracking is not ready");
  if (plan.durationDays <= 0 || plan.minimumSample <= 0) issues.push("invalid duration/sample");
  if (!plan.winnerCriteria || !plan.scaleCriteria || !plan.killCriteria) issues.push("winner/scale/kill criteria incomplete");
  if (plan.knownConfounds?.length) issues.push("known confounds must be controlled before declaring a winner");
  return {
    valid: issues.length === 0,
    issues,
    declaration: issues.length ? "NO_WINNER_YET" : "PREREGISTERED_AND_TESTABLE",
  };
}

export type FinancialDigitalTwinInputV7 = {
  revenue: number;
  cogs: number;
  variableCosts: number;
  payroll: number;
  fixedOpex: number;
  adSpend: number;
  collectedCash: number;
  startingCash: number;
  newCustomers?: number;
  downsideRevenuePct?: number;
  upsideRevenuePct?: number;
};

export function calculateFinancialDigitalTwinV2(input: FinancialDigitalTwinInputV7) {
  const grossProfit = input.revenue - input.cogs;
  const contributionProfit = grossProfit - input.variableCosts - input.adSpend;
  const operatingContribution = contributionProfit - input.payroll - input.fixedOpex;
  const monthlyBurn = Math.max(0, -operatingContribution);
  const runwayMonths = monthlyBurn > 0 ? input.startingCash / monthlyBurn : null;
  const collectionGap = Math.max(0, input.revenue - input.collectedCash);
  const cac = input.newCustomers && input.newCustomers > 0 ? input.adSpend / input.newCustomers : null;
  const scenario = (revenuePct: number) => {
    const scenarioRevenue = input.revenue * (1 + revenuePct);
    const scenarioGrossProfit = scenarioRevenue - input.cogs;
    return scenarioGrossProfit - input.variableCosts - input.adSpend - input.payroll - input.fixedOpex;
  };
  return {
    grossProfit,
    grossMarginPct: input.revenue ? (grossProfit / input.revenue) * 100 : 0,
    contributionProfit,
    contributionMarginPct: input.revenue ? (contributionProfit / input.revenue) * 100 : 0,
    operatingContribution,
    monthlyBurn,
    runwayMonths,
    collectionGap,
    cac,
    scenarios: {
      downside: scenario(-(Math.abs(input.downsideRevenuePct ?? 0.15))),
      base: scenario(0),
      upside: scenario(Math.abs(input.upsideRevenuePct ?? 0.15)),
    },
    doctrine: "Separate invoiced revenue, collected cash and contribution economics; use scenarios instead of false precision.",
  };
}

export type CreativeIntelligenceInputV3 = {
  hook: number;
  stoppingPower: number;
  messageClarity: number;
  productFidelity: number;
  brandFit: number;
  emotion: number;
  offerStrength: number;
  platformFit: number;
  novelty: number;
  fatigueRisk: number;
  observedCtrChangePct?: number | null;
  observedFrequency?: number | null;
  observedConversions?: number | null;
};

export function scoreCreativeIntelligenceV3(input: CreativeIntelligenceInputV3) {
  const positives = [
    input.hook,
    input.stoppingPower,
    input.messageClarity,
    input.productFidelity,
    input.brandFit,
    input.emotion,
    input.offerStrength,
    input.platformFit,
    input.novelty,
  ];
  const preTestScore = Math.max(0, Math.min(100, positives.reduce((a, b) => a + b, 0) / positives.length * 10 - input.fatigueRisk * 2));
  const hasObservedPerformance =
    input.observedCtrChangePct !== null && input.observedCtrChangePct !== undefined &&
    input.observedConversions !== null && input.observedConversions !== undefined;
  const refreshTriggers: string[] = [];
  if (input.fatigueRisk >= 7) refreshTriggers.push("high predicted fatigue risk");
  if ((input.observedCtrChangePct ?? 0) <= -20) refreshTriggers.push("observed CTR decay");
  if ((input.observedFrequency ?? 0) >= 4) refreshTriggers.push("high observed frequency");

  return {
    preTestScore,
    evidenceClass: hasObservedPerformance ? "OBSERVED_PERFORMANCE_EVIDENCE" : "HYPOTHESIS_NOT_PERFORMANCE_PROOF",
    refreshTriggers,
    testVariables: ["hook", "first frame", "proof", "format", "CTA", "angle", "offer"],
  };
}

export type EarlyWarningInputV7 = {
  churnProbability?: number | null;
  runwayMonths?: number | null;
  cplChangePct?: number | null;
  ctrChangePct?: number | null;
  frequency?: number | null;
  salesTargetAchievementPct?: number | null;
  teamUtilizationPct?: number | null;
};

export function forecastEarlyWarningEngine(input: EarlyWarningInputV7) {
  const warnings: Array<{ code: string; severity: "medium" | "high" | "critical"; trigger: string; owner: string; evidence: string; nextAction: string }> = [];
  if ((input.churnProbability ?? 0) >= 0.6) warnings.push({ code: "CHURN_RISK", severity: "high", trigger: "churn probability >= 60%", owner: "Account Management", evidence: `p=${input.churnProbability}`, nextAction: "Validate drivers, contact client, and build retention plan." });
  if (input.runwayMonths !== null && input.runwayMonths !== undefined && input.runwayMonths <= 3) warnings.push({ code: "CASH_SQUEEZE", severity: "critical", trigger: "runway <= 3 months", owner: "Finance", evidence: `runway=${input.runwayMonths}`, nextAction: "Reconcile collections, burn and committed cash outflows." });
  if ((input.cplChangePct ?? 0) >= 25) warnings.push({ code: "CPL_INFLATION", severity: "high", trigger: "CPL increased >= 25%", owner: "Media Buyer", evidence: `CPL delta=${input.cplChangePct}%`, nextAction: "Check tracking, auction pressure, audience and creative before budget changes." });
  if ((input.ctrChangePct ?? 0) <= -20 && (input.frequency ?? 0) >= 3) warnings.push({ code: "CREATIVE_FATIGUE", severity: "high", trigger: "CTR down with rising frequency", owner: "Creative + Media", evidence: `CTR delta=${input.ctrChangePct}%, frequency=${input.frequency}`, nextAction: "Refresh creative variables and verify audience saturation." });
  if ((input.salesTargetAchievementPct ?? 100) < 80) warnings.push({ code: "SALES_TARGET_RISK", severity: "high", trigger: "sales target achievement < 80%", owner: "Sales", evidence: `achievement=${input.salesTargetAchievementPct}%`, nextAction: "Inspect pipeline coverage, stage conversion and follow-up quality." });
  if ((input.teamUtilizationPct ?? 0) >= 90) warnings.push({ code: "TEAM_OVERLOAD", severity: "high", trigger: "team utilization >= 90%", owner: "Operations", evidence: `utilization=${input.teamUtilizationPct}%`, nextAction: "Rebalance workload and protect critical-path delivery." });

  return {
    warnings,
    overallSeverity: warnings.some((w) => w.severity === "critical") ? "critical" : warnings.length ? "high" : "normal",
    doctrine: "Early warnings are evidence-backed signals, not causal certainty. Validate the driver before material intervention.",
  };
}

export function buildVivitoPersistentExecutiveContextV7() {
  return `
VIVITO PERSISTENT EXECUTIVE INTELLIGENCE V7 — ACTIVE
- Decision Memory V2: preserve decision, assumptions, evidence, expected outcome, owner, review date and actual outcome; corrections supersede history instead of silently rewriting it.
- Client / Brand Twin: maintain strict client isolation across voice, visual codes, ICP/JTBD, offers, pricing, objections, journey, creative history, channels, competitors, constraints and objectives; surface conflicts.
- Executive War Room: rank decisions, risks, blockers and opportunities by impact, urgency, confidence and financial exposure with evidence, owner and deadline.
- Autonomous Research Agent V2: create a claim ledger, source plan, contradiction checks, locality and freshness checks; search summaries are not facts.
- Experimentation OS: preregister hypothesis, treatment, comparator, primary metric, guardrails, sample/duration, winner, scale and kill criteria; declare no winner when validity is broken.
- Financial Digital Twin: separate revenue, collections, gross/contribution economics, burn and runway; model downside/base/upside before material scale.
- Creative Intelligence V3: distinguish pre-test creative hypotheses from observed performance proof; connect hook, message, fidelity, brand fit, offer, platform fit and fatigue to refresh/test decisions.
- Forecast + Early Warning: surface churn, cash squeeze, CPL inflation, creative fatigue, sales-target risk and team overload with trigger, evidence, severity, owner and next diagnostic action.
- Cross-system rule: persistent memory never outranks fresher verified ERP/source evidence, and no cross-client fact leakage is allowed.
`;
}
