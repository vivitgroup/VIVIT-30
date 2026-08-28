import { db, sql } from "@/lib/db";

export type BrainScope = { workspaceId: string; clientId?: string | null; actorId: string };
export type BrainRole = "SUPER_ADMIN" | "ACCOUNT_MANAGER" | "MEDIA_BUYER" | "CREATOR" | "ACCOUNTANT" | "SALES" | "CLIENT";

const rows = (value: unknown) => Array.from(value as Iterable<Record<string, unknown>>);
const id = () => crypto.randomUUID();
const scopedClient = (clientId?: string | null) => clientId || null;

function requireScope(scope: BrainScope) {
  if (!scope.workspaceId || !scope.actorId) throw new Error("workspaceId and actorId are required");
}

export async function recordMemoryNode(scope: BrainScope, input: {
  kind: string; title: string; content: string; confidence?: number; sourceType: string; sourceId?: string;
  observedAt?: Date; freshUntil?: Date;
}) {
  requireScope(scope);
  const confidence = Math.max(0, Math.min(1, input.confidence ?? 0.5));
  const nodeId = id();
  await db.execute(sql`insert into vivito_memory_nodes
    (id,workspace_id,client_id,kind,title,content,confidence,source_type,source_id,observed_at,fresh_until,created_by)
    values (${nodeId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.kind},${input.title},${input.content},${confidence},${input.sourceType},${input.sourceId ?? null},${input.observedAt ?? new Date()},${input.freshUntil ?? null},${scope.actorId})`);
  return nodeId;
}

export async function linkMemoryNodes(scope: BrainScope, input: { fromNodeId: string; toNodeId: string; relation: string; evidence?: string }) {
  requireScope(scope);
  if (input.fromNodeId === input.toNodeId) throw new Error("Self-referential memory edges are not allowed");
  const owned = rows(await db.execute(sql`select id from vivito_memory_nodes where workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)} and id in (${input.fromNodeId},${input.toNodeId})`));
  if (owned.length !== 2) throw new Error("Memory nodes must exist inside the same workspace/client scope");
  const edgeId = id();
  await db.execute(sql`insert into vivito_memory_edges(id,workspace_id,client_id,from_node_id,to_node_id,relation,evidence,created_by)
    values(${edgeId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.fromNodeId},${input.toNodeId},${input.relation},${input.evidence ?? null},${scope.actorId})`);
  return edgeId;
}

export async function assessMemoryFreshness(scope: BrainScope, now = new Date()) {
  requireScope(scope);
  await db.execute(sql`update vivito_memory_nodes set status='STALE',updated_at=now()
    where workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)}
      and status='ACTIVE' and fresh_until is not null and fresh_until < ${now}`);
  return rows(await db.execute(sql`select id,title,kind,confidence,status,observed_at,fresh_until from vivito_memory_nodes
    where workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)} order by observed_at desc limit 100`));
}

export async function detectMemoryContradictions(scope: BrainScope) {
  requireScope(scope);
  return rows(await db.execute(sql`select a.id as left_id,b.id as right_id,a.kind,a.title,a.content as left_content,b.content as right_content
    from vivito_memory_nodes a join vivito_memory_nodes b
      on a.workspace_id=b.workspace_id and a.client_id is not distinct from b.client_id and a.kind=b.kind and lower(a.title)=lower(b.title) and a.id < b.id
    where a.workspace_id=${scope.workspaceId} and a.client_id is not distinct from ${scopedClient(scope.clientId)}
      and a.status='ACTIVE' and b.status='ACTIVE' and a.content <> b.content
    order by greatest(a.updated_at,b.updated_at) desc limit 50`));
}

export async function trackCommitment(scope: BrainScope, input: { title: string; ownerId: string; sourceType: string; sourceId?: string; dueAt: Date; evidence?: string }) {
  requireScope(scope);
  const commitmentId = id();
  await db.execute(sql`insert into vivito_commitments(id,workspace_id,client_id,title,owner_id,source_type,source_id,due_at,evidence,created_by)
    values(${commitmentId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.title},${input.ownerId},${input.sourceType},${input.sourceId ?? null},${input.dueAt},${input.evidence ?? null},${scope.actorId})`);
  return commitmentId;
}

export async function recordStrategicObjective(scope: BrainScope, input: { parentId?: string; title: string; level: "COMPANY"|"DEPARTMENT"|"TEAM"|"INITIATIVE"; metric?: string; target?: number; ownerId: string; deadline?: Date }) {
  requireScope(scope);
  if (input.parentId) {
    const parent = rows(await db.execute(sql`select id from vivito_strategic_objectives where id=${input.parentId} and workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)} limit 1`));
    if (!parent.length) throw new Error("Objective parent is outside the current scope");
  }
  const objectiveId = id();
  await db.execute(sql`insert into vivito_strategic_objectives(id,workspace_id,client_id,parent_id,title,level,metric,target,owner_id,deadline,created_by)
    values(${objectiveId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.parentId ?? null},${input.title},${input.level},${input.metric ?? null},${input.target ?? null},${input.ownerId},${input.deadline ?? null},${scope.actorId})`);
  return objectiveId;
}

export async function recordDecision(scope: BrainScope, input: { title: string; decision: string; rationale: string; assumptions?: unknown[]; risks?: unknown[]; expectedOutcome?: string; ownerId: string; reviewAt?: Date }) {
  requireScope(scope);
  const decisionId = id();
  await db.execute(sql`insert into vivito_decisions(id,workspace_id,client_id,title,decision,rationale,assumptions,risks,expected_outcome,owner_id,review_at,created_by)
    values(${decisionId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.title},${input.decision},${input.rationale},${JSON.stringify(input.assumptions ?? [])}::jsonb,${JSON.stringify(input.risks ?? [])}::jsonb,${input.expectedOutcome ?? null},${input.ownerId},${input.reviewAt ?? null},${scope.actorId})`);
  return decisionId;
}

export async function recordOutcome(scope: BrainScope, input: { decisionId?: string; metric: string; baseline?: number; target?: number; actual?: number; attributionConfidence?: number; evidence: string; observedAt?: Date }) {
  requireScope(scope);
  if (input.decisionId) {
    const decision = rows(await db.execute(sql`select id from vivito_decisions where id=${input.decisionId} and workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)} limit 1`));
    if (!decision.length) throw new Error("Decision is outside the current scope");
  }
  const outcomeId = id();
  const confidence = Math.max(0, Math.min(1, input.attributionConfidence ?? 0));
  await db.execute(sql`insert into vivito_outcomes(id,workspace_id,client_id,decision_id,metric,baseline,target,actual,attribution_confidence,evidence,observed_at,created_by)
    values(${outcomeId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.decisionId ?? null},${input.metric},${input.baseline ?? null},${input.target ?? null},${input.actual ?? null},${confidence},${input.evidence},${input.observedAt ?? new Date()},${scope.actorId})`);
  return outcomeId;
}

export async function recordScenario(scope: BrainScope, input: { title: string; scenarioType: "BASE"|"UPSIDE"|"DOWNSIDE"|"STRESS"|"CUSTOM"; assumptions: unknown[]; expectedImpact: Record<string, unknown>; probability?: number }) {
  requireScope(scope);
  const scenarioId = id();
  const probability = input.probability == null ? null : Math.max(0, Math.min(1, input.probability));
  await db.execute(sql`insert into vivito_scenarios(id,workspace_id,client_id,title,scenario_type,assumptions,expected_impact,probability,status,created_by)
    values(${scenarioId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.title},${input.scenarioType},${JSON.stringify(input.assumptions)}::jsonb,${JSON.stringify(input.expectedImpact)}::jsonb,${probability},'HYPOTHESIS',${scope.actorId})`);
  return scenarioId;
}

export async function recordProofOfWork(scope: BrainScope, input: { actionType: string; entityType: string; entityId?: string; claimedOutcome: string; evidenceType: string; evidenceRef: string }) {
  requireScope(scope);
  const proofId = id();
  await db.execute(sql`insert into vivito_proof_ledger(id,workspace_id,client_id,action_type,entity_type,entity_id,claimed_outcome,evidence_type,evidence_ref,verification_status,actor_id)
    values(${proofId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.actionType},${input.entityType},${input.entityId ?? null},${input.claimedOutcome},${input.evidenceType},${input.evidenceRef},'UNVERIFIED',${scope.actorId})`);
  return proofId;
}

export async function verifyProofOfWork(scope: BrainScope, proofId: string, status: "VERIFIED"|"FAILED"|"PARTIAL") {
  requireScope(scope);
  const result = rows(await db.execute(sql`update vivito_proof_ledger set verification_status=${status},verified_at=now(),updated_at=now()
    where id=${proofId} and workspace_id=${scope.workspaceId} and client_id is not distinct from ${scopedClient(scope.clientId)} returning id`));
  if (!result.length) throw new Error("Proof entry not found in current scope");
  return result[0];
}

export async function recordDependency(scope: BrainScope, input: { fromType: string; fromId: string; toType: string; toId: string; dependencyType: string; criticality?: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL" }) {
  requireScope(scope);
  const dependencyId = id();
  await db.execute(sql`insert into vivito_dependency_edges(id,workspace_id,client_id,from_type,from_id,to_type,to_id,dependency_type,criticality,created_by)
    values(${dependencyId},${scope.workspaceId},${scopedClient(scope.clientId)},${input.fromType},${input.fromId},${input.toType},${input.toId},${input.dependencyType},${input.criticality ?? "MEDIUM"},${scope.actorId})`);
  return dependencyId;
}

export async function requestGovernanceApproval(scope: BrainScope, input: { entityType: string; entityId: string; title: string; amount?: number; steps: unknown[] }) {
  requireScope(scope);
  const approvalId = id();
  const totalSteps = Math.max(1, input.steps.length);
  await db.execute(sql`insert into approval_workflows(id,workspace_id,entity_type,entity_id,title,amount,requested_by,current_step,total_steps,status,steps)
    values(${approvalId},${scope.workspaceId},${input.entityType},${input.entityId},${input.title},${input.amount ?? null},${scope.actorId},1,${totalSteps},'PENDING',${JSON.stringify(input.steps)})`);
  return approvalId;
}

export async function loadCompanyBrainContext(scope: BrainScope) {
  requireScope(scope);
  await assessMemoryFreshness(scope);
  const clientId = scopedClient(scope.clientId);
  const [memories, commitments, objectives, decisions, scenarios, dependencies, proofs, contradictions] = await Promise.all([
    db.execute(sql`select id,kind,title,content,confidence,source_type,observed_at,fresh_until,status from vivito_memory_nodes where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} and status in ('ACTIVE','DISPUTED') order by confidence desc,observed_at desc limit 40`),
    db.execute(sql`select id,title,owner_id,due_at,status,evidence from vivito_commitments where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} and status in ('OPEN','BLOCKED') order by due_at asc limit 30`),
    db.execute(sql`select id,parent_id,title,level,metric,target,owner_id,deadline,status from vivito_strategic_objectives where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} and status in ('ACTIVE','AT_RISK') order by deadline nulls last limit 30`),
    db.execute(sql`select id,title,decision,rationale,expected_outcome,owner_id,review_at,status,actual_outcome from vivito_decisions where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} order by created_at desc limit 25`),
    db.execute(sql`select id,title,scenario_type,assumptions,expected_impact,probability,status from vivito_scenarios where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} and status <> 'RETIRED' order by created_at desc limit 15`),
    db.execute(sql`select id,from_type,from_id,to_type,to_id,dependency_type,criticality from vivito_dependency_edges where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} and is_active=true order by case criticality when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3 else 4 end limit 40`),
    db.execute(sql`select id,action_type,entity_type,entity_id,claimed_outcome,evidence_type,evidence_ref,verification_status,created_at from vivito_proof_ledger where workspace_id=${scope.workspaceId} and client_id is not distinct from ${clientId} order by created_at desc limit 30`),
    detectMemoryContradictions(scope),
  ]);
  return { memories: rows(memories), commitments: rows(commitments), objectives: rows(objectives), decisions: rows(decisions), scenarios: rows(scenarios), dependencies: rows(dependencies), proofs: rows(proofs), contradictions };
}

export async function buildCeoCommandSnapshot(scope: BrainScope) {
  const brain = await loadCompanyBrainContext(scope);
  const now = Date.now();
  const overdue = brain.commitments.filter((c: any) => c.status !== "DONE" && new Date(String(c.due_at)).getTime() < now);
  const blocked = brain.commitments.filter((c: any) => c.status === "BLOCKED");
  const atRisk = brain.objectives.filter((o: any) => o.status === "AT_RISK");
  const criticalDependencies = brain.dependencies.filter((d: any) => ["CRITICAL","HIGH"].includes(String(d.criticality)));
  const unverifiedProof = brain.proofs.filter((p: any) => p.verification_status !== "VERIFIED");
  const decisionsDue = brain.decisions.filter((d: any) => d.review_at && new Date(String(d.review_at)).getTime() <= now && !["CLOSED","REVERSED"].includes(String(d.status)));
  return {
    generatedAt: new Date().toISOString(),
    scope: { workspaceId: scope.workspaceId, clientId: scopedClient(scope.clientId) },
    priorities: { overdueCommitments: overdue, blockedCommitments: blocked, atRiskObjectives: atRisk, decisionsDueForReview: decisionsDue },
    risk: { criticalDependencies, contradictions: brain.contradictions, unverifiedProof },
    scenarios: brain.scenarios,
    evidencePolicy: "API acknowledgement is not business outcome proof; material actions remain approval-gated until verified evidence exists.",
  };
}

export const VIVITO_PERSISTENT_COMPANY_BRAIN_V9 = {
  version: "V9",
  capabilities: [
    "persistent-company-memory-graph","commitment-ledger","strategic-objective-engine","decision-journal",
    "outcome-learning-loop","ceo-command-center-runtime","cross-functional-dependency-graph","freshness-contradiction-detection",
    "proof-of-work-ledger","scenario-store","governance-approvals","institutional-api-layer"
  ] as const,
  safety: {
    tenantIsolation: true,
    crossClientLearning: "aggregate-only; never copy client facts across client scopes",
    evidenceBeforeClaim: true,
    highImpactApprovalRequired: true,
    scenarioStatus: "HYPOTHESIS",
  },
};
