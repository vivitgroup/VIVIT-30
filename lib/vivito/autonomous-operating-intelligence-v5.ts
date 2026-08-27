export type Horizon = "today" | "week" | "quarter" | "year";

export type HorizonPlan = {
  horizon: Horizon;
  objective: string;
  metric: string;
  owner: string;
  reviewCadence: string;
};

export function buildMultiHorizonPlan(input: {
  objective: string;
  metric: string;
  owner: string;
}): HorizonPlan[] {
  return [
    { horizon: "today", objective: `Stabilize or advance: ${input.objective}`, metric: input.metric, owner: input.owner, reviewCadence: "daily" },
    { horizon: "week", objective: `Validate leading indicators for: ${input.objective}`, metric: input.metric, owner: input.owner, reviewCadence: "twice-weekly" },
    { horizon: "quarter", objective: `Compound repeatable gains toward: ${input.objective}`, metric: input.metric, owner: input.owner, reviewCadence: "monthly" },
    { horizon: "year", objective: `Protect strategic position while pursuing: ${input.objective}`, metric: input.metric, owner: input.owner, reviewCadence: "quarterly" },
  ];
}

export function scheduleResources(
  demand: Array<{ workstream: string; hours: number; priority: number; requiredSkill?: string }>,
  capacity: Array<{ resource: string; hoursAvailable: number; skills?: string[] }>,
) {
  const remaining = new Map(capacity.map((r) => [r.resource, Math.max(0, r.hoursAvailable)]));
  const allocations: Array<{ workstream: string; resource: string | null; hours: number; blocked: boolean }> = [];
  for (const item of [...demand].sort((a, b) => b.priority - a.priority)) {
    const candidate = capacity
      .filter((r) => !item.requiredSkill || r.skills?.includes(item.requiredSkill))
      .sort((a, b) => (remaining.get(b.resource) ?? 0) - (remaining.get(a.resource) ?? 0))[0];
    const available = candidate ? remaining.get(candidate.resource) ?? 0 : 0;
    const assigned = Math.min(Math.max(0, item.hours), available);
    if (candidate && assigned > 0) remaining.set(candidate.resource, available - assigned);
    allocations.push({ workstream: item.workstream, resource: candidate?.resource ?? null, hours: assigned, blocked: assigned < item.hours });
  }
  return { allocations, remainingCapacity: Object.fromEntries(remaining) };
}

export function criticalPath(
  nodes: Array<{ id: string; duration: number; dependsOn?: string[] }>,
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, { total: number; path: string[] }>();
  const visit = (id: string, stack = new Set<string>()): { total: number; path: string[] } => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return { total: Number.POSITIVE_INFINITY, path: [...stack, id] };
    const node = byId.get(id);
    if (!node) return { total: 0, path: [] };
    const nextStack = new Set(stack); nextStack.add(id);
    const deps = (node.dependsOn ?? []).map((d) => visit(d, nextStack));
    const longest = deps.sort((a, b) => b.total - a.total)[0] ?? { total: 0, path: [] };
    const result = { total: longest.total + Math.max(0, node.duration), path: [...longest.path, id] };
    memo.set(id, result); return result;
  };
  const ranked = nodes.map((n) => ({ id: n.id, ...visit(n.id) })).sort((a, b) => b.total - a.total);
  return { critical: ranked[0] ?? null, ranked };
}

export function prioritizeDecisionQueue(items: Array<{
  id: string;
  impact: number;
  urgency: number;
  reversibility: number;
  confidence: number;
  cashConsequence?: number;
}>) {
  return [...items].map((x) => ({
    ...x,
    priorityScore:
      x.impact * 0.3 + x.urgency * 0.25 + x.reversibility * 0.1 + x.confidence * 0.2 + (x.cashConsequence ?? 0) * 0.15,
  })).sort((a, b) => b.priorityScore - a.priorityScore);
}

export function escalationDecision(input: {
  financialImpact: number;
  risk: number;
  reversibility: number;
  permissionLevel: "operator" | "manager" | "executive";
}) {
  const score = input.financialImpact * 0.35 + input.risk * 0.4 + (1 - input.reversibility) * 0.25;
  const required = score >= 0.75 ? "executive" : score >= 0.45 ? "manager" : "operator";
  const rank = { operator: 0, manager: 1, executive: 2 } as const;
  return { score, required, escalate: rank[input.permissionLevel] < rank[required] };
}

export function abstractCrossClientPattern(input: {
  pattern: string;
  sampleSize: number;
  compatibilityRule: string;
  containsClientIdentifiers?: boolean;
}) {
  return {
    reusable: input.sampleSize >= 3 && !input.containsClientIdentifiers,
    pattern: input.pattern,
    sampleSize: input.sampleSize,
    compatibilityRule: input.compatibilityRule,
    privacyRule: "Use only anonymized, aggregate patterns; never reveal or transfer client-specific facts.",
  };
}

export function attributeOutcome(candidates: Array<{
  cause: string;
  evidenceStrength: number;
  temporalFit: number;
  mechanismFit: number;
  confoundingRisk: number;
}>) {
  return [...candidates].map((c) => ({
    ...c,
    attributionScore: c.evidenceStrength * 0.4 + c.temporalFit * 0.2 + c.mechanismFit * 0.3 - c.confoundingRisk * 0.25,
  })).sort((a, b) => b.attributionScore - a.attributionScore);
}

export type GuardrailRule = {
  id: string;
  metric: string;
  operator: "<" | "<=" | ">" | ">=" | "==";
  threshold: number;
  action: "allow" | "block" | "require-approval";
};

export function evaluateGuardrails(metrics: Record<string, number>, rules: GuardrailRule[]) {
  const test = (v: number, op: GuardrailRule["operator"], t: number) =>
    op === "<" ? v < t : op === "<=" ? v <= t : op === ">" ? v > t : op === ">=" ? v >= t : v === t;
  const results = rules.map((r) => ({ ...r, triggered: test(metrics[r.metric] ?? Number.NaN, r.operator, r.threshold) }));
  return {
    results,
    blocked: results.some((r) => r.triggered && r.action === "block"),
    approvalRequired: results.some((r) => r.triggered && r.action === "require-approval"),
  };
}

export function scanOpportunities(signals: Array<{
  id: string;
  upside: number;
  evidenceConfidence: number;
  effort: number;
  urgency: number;
}>) {
  return [...signals].map((s) => ({
    ...s,
    opportunityScore: s.upside * 0.4 + s.evidenceConfidence * 0.25 + s.urgency * 0.2 - s.effort * 0.15,
  })).sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function executiveNarrative(input: {
  changed: string;
  why: string;
  financialImpact: string;
  decision: string;
  owner: string;
}) {
  return `What changed: ${input.changed}\nWhy: ${input.why}\nFinancial impact: ${input.financialImpact}\nDecision: ${input.decision}\nOwner: ${input.owner}`;
}

export function simulateDecision(input: {
  baseline: number;
  changePct: number;
  downsideFactor?: number;
  upsideFactor?: number;
}) {
  const base = input.baseline * (1 + input.changePct / 100);
  const downside = base * (input.downsideFactor ?? 0.85);
  const upside = base * (input.upsideFactor ?? 1.15);
  return { downside, base, upside, assumption: "Scenario simulation, not a causal forecast." };
}

export function verifyExecution(input: {
  claimedAction: string;
  observedState: string;
  expectedState: string;
  proofId?: string;
}) {
  const verified = input.observedState === input.expectedState && Boolean(input.proofId);
  return {
    claimedAction: input.claimedAction,
    verified,
    proofId: input.proofId ?? null,
    next: verified ? "close" : "diagnose-or-rollback",
  };
}

export function buildVivitoAutonomousOperatingContextV5() {
  return `AUTONOMOUS OPERATING INTELLIGENCE V5:\n- Multi-horizon planning: separate today, weekly, quarterly and annual decisions so short-term optimization never silently damages long-term strategy.\n- Resource scheduling brain: allocate people and time by priority, skill, capacity, dependency and deadline; surface unstaffed or overloaded work explicitly.\n- Dependency and bottleneck engine: map prerequisites, critical path and single points of failure before committing dates or parallel work.\n- Decision queue prioritizer: rank competing decisions by impact, urgency, reversibility, confidence and cash consequence rather than treating every issue equally.\n- Escalation intelligence V2: keep decisions at the lowest authorized level that can safely own them; escalate when risk, financial impact, irreversibility or permission boundaries require it.\n- Cross-client learning without leakage: reuse only anonymized aggregate patterns with compatibility rules and sufficient evidence; never expose one client's facts to another.\n- Outcome attribution engine: rank plausible causes using evidence strength, timing, mechanism fit and confounding risk; never turn correlation into causal certainty.\n- Policy and guardrail compiler: turn company rules, thresholds, approval limits and spending controls into explicit allow/block/approval checks before execution.\n- Continuous opportunity scanner: proactively identify underused capacity, weak retention, idle budget, cross-sell, pricing, funnel and efficiency opportunities, then rank by expected upside and evidence.\n- Executive narrative generator: compress complex operating data into what changed, why, financial impact, decision and accountable owner.\n- Simulation sandbox: test reversible scenarios before live execution and label simulation assumptions separately from observed facts or causal forecasts.\n- Autonomous verification loop: after every execution, re-read the resulting state, require proof-of-work, compare expected vs observed, and diagnose, retry safely, escalate or rollback when verification fails. Never equate an API acknowledgement with business-state success.\n`;
}
