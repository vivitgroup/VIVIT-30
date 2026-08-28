import { buildVivitoPersistentExecutiveContextV7 } from "./persistent-executive-intelligence-v7";
import { buildVivitoInstitutionalIntelligenceContextV8 } from "./institutional-intelligence-v8";

export type CausalNode = { id: string; label: string; domain: string };
export type CausalEdge = { from: string; to: string; strength: number; evidence: "observed" | "tested" | "hypothesis" };

export function buildCausalGraph(nodes: CausalNode[], edges: CausalEdge[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  return {
    nodes,
    edges: validEdges,
    unsupportedEdges: edges.filter((e) => !nodeIds.has(e.from) || !nodeIds.has(e.to)),
    testedEdges: validEdges.filter((e) => e.evidence === "tested"),
    hypotheses: validEdges.filter((e) => e.evidence === "hypothesis"),
  };
}

export function rankHypotheses(items: Array<{ hypothesis: string; probability: number; impact: number; validationEase: number }>) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return [...items]
    .map((item) => ({ ...item, score: clamp(item.probability) * clamp(item.impact) * clamp(item.validationEase) }))
    .sort((a, b) => b.score - a.score);
}

export function rankInformationValue(items: Array<{ input: string; decisionChangeProbability: number; valueIfResolved: number; acquisitionCost: number }>) {
  return [...items]
    .map((item) => ({ ...item, informationValue: Math.max(0, item.decisionChangeProbability) * Math.max(0, item.valueIfResolved) - Math.max(0, item.acquisitionCost) }))
    .sort((a, b) => b.informationValue - a.informationValue);
}

export function sequenceExperiments(experiments: Array<{ name: string; uncertaintyReduction: number; cost: number; durationDays: number; dependency?: string }>) {
  return [...experiments]
    .map((x) => ({ ...x, sequencingScore: Math.max(0, x.uncertaintyReduction) / Math.max(1, x.cost) / Math.max(1, x.durationDays) }))
    .sort((a, b) => {
      if (!a.dependency && b.dependency) return -1;
      if (a.dependency && !b.dependency) return 1;
      return b.sequencingScore - a.sequencingScore;
    });
}

export function analyzeSecondOrderEffects(input: { decision: string; firstOrder: string[]; secondOrder: string[]; thirdOrder?: string[] }) {
  return { ...input, requiresGuardrail: input.secondOrder.length > 0 || Boolean(input.thirdOrder?.length) };
}

export function detectStrategicContradictions(goals: Array<{ id: string; objective: string; direction: "increase" | "decrease" | "hold"; resource?: string }>) {
  const contradictions: Array<{ a: string; b: string; reason: string }> = [];
  for (let i = 0; i < goals.length; i++) {
    for (let j = i + 1; j < goals.length; j++) {
      const a = goals[i], b = goals[j];
      if (a.resource && b.resource && a.resource === b.resource && a.direction !== b.direction) {
        contradictions.push({ a: a.id, b: b.id, reason: `Conflicting directions on constrained resource: ${a.resource}` });
      }
    }
  }
  return contradictions;
}

export type DecisionJournalEntry = {
  id: string;
  decision: string;
  context: string;
  assumptions: string[];
  evidence: string[];
  alternatives: string[];
  expectedOutcome: string;
  reviewAt: string;
  actualOutcome?: string;
};

export function reviewDecisionJournal(entry: DecisionJournalEntry) {
  return {
    ...entry,
    reviewRequired: !entry.actualOutcome,
    learningReady: Boolean(entry.actualOutcome),
    assumptionCount: entry.assumptions.length,
    evidenceCount: entry.evidence.length,
  };
}

export function codifyOrganizationalLearning(input: { lesson: string; sourceScope: string; reusableScope: string; evidenceCount: number; exceptions?: string[] }) {
  return {
    ...input,
    confidence: input.evidenceCount >= 3 ? "high" : input.evidenceCount >= 2 ? "medium" : "low",
    generalize: input.evidenceCount >= 2 && input.reusableScope.length > 0,
  };
}

export function humanInLoopDecision(input: { reversibility: number; financialRisk: number; externalWrite: boolean; confidence: number }) {
  const highRisk = input.financialRisk >= 0.7 || input.reversibility <= 0.3 || input.externalWrite;
  if (highRisk) return { mode: "approval-required" as const, reason: "Material risk, irreversibility or external write requires human approval." };
  if (input.confidence < 0.55) return { mode: "options-first" as const, reason: "Evidence confidence is too low for autonomous execution." };
  return { mode: "autonomous-with-verification" as const, reason: "Risk is bounded and confidence is sufficient; verify after execution." };
}

export function optimizeMultipleObjectives(options: Array<{ name: string; scores: Record<string, number> }>, weights: Record<string, number>) {
  const weightTotal = Object.values(weights).reduce((s, n) => s + Math.max(0, n), 0) || 1;
  return [...options]
    .map((option) => {
      const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => sum + (option.scores[key] ?? 0) * Math.max(0, weight), 0) / weightTotal;
      return { ...option, weightedScore };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

export function buildStrategicRiskRegister(items: Array<{ risk: string; probability: number; impact: number; owner: string; mitigation: string; trigger: string; contingency: string }>) {
  return [...items]
    .map((item) => ({ ...item, exposure: Math.max(0, item.probability) * Math.max(0, item.impact) }))
    .sort((a, b) => b.exposure - a.exposure);
}

export function buildExecutiveOperatingAutopilot(input: {
  objective: string;
  plan: string[];
  owners: string[];
  checkpoints: string[];
  evidenceChecks: string[];
  correctionTriggers: string[];
}) {
  return {
    ...input,
    loop: ["objective", "plan", "assign", "execute", "verify", "review", "correct"],
    ready: Boolean(input.objective && input.plan.length && input.owners.length && input.checkpoints.length && input.evidenceChecks.length),
  };
}

export function buildVivitoCognitiveExecutionContextV6() {
  return `COGNITIVE & EXECUTION INTELLIGENCE V6:\n- Causal graph engine: map relationships across marketing, sales, pricing, operations and finance; separate tested causal links from observed associations and hypotheses.\n- Hypothesis ranking: prioritize plausible causes by probability, impact and ease of validation before prescribing action.\n- Information value: request the next piece of data based on its expected ability to change the decision, not on reporting convenience.\n- Adaptive experiment sequencing: run the cheapest/highest-learning tests first, respect dependencies, and use each result to narrow the next test.\n- Second-order effects: evaluate downstream and delayed consequences before committing to a recommendation, especially margin, cash, capacity, retention and brand effects.\n- Strategic contradiction detection: surface mutually incompatible objectives, constraints or resource demands instead of pretending they can all be maximized simultaneously.\n- Executive decision journal: record material decisions with context, assumptions, evidence, alternatives, expected outcome and review date; compare expected vs actual later.\n- Organizational learning: convert repeatable evidence into scoped reusable rules while preserving exceptions and avoiding unsafe over-generalization.\n- Human-in-the-loop intelligence: distinguish autonomous execution, option presentation and approval-required actions based on confidence, reversibility, financial risk and external-write exposure.\n- Multi-objective optimization: balance growth, margin, cash, retention, brand and workload using explicit weights rather than optimizing a single KPI blindly.\n- Strategic risk register: maintain probability, impact, owner, mitigation, trigger and contingency; rank by expected exposure and escalate when triggers fire.\n- Executive operating autopilot: turn an objective into plan, ownership, execution, evidence verification, review and correction loops. Never claim completion without proof-of-work.\n${buildVivitoPersistentExecutiveContextV7()}\n${buildVivitoInstitutionalIntelligenceContextV8()}`;
}
