export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildCeoCommandSnapshot,
  loadCompanyBrainContext,
  recordDecision,
  recordDependency,
  recordMemoryNode,
  recordOutcome,
  recordProofOfWork,
  recordScenario,
  recordStrategicObjective,
  requestGovernanceApproval,
  trackCommitment,
} from "@/lib/vivito/persistent-company-brain-v9";

const noStore = { "Cache-Control": "private, no-store" };
const writeRoles = new Set(["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "ACCOUNTANT", "SALES"]);
const governanceRoles = new Set(["SUPER_ADMIN", "ACCOUNTANT"]);

function userScope(session: any, clientId?: string | null) {
  return {
    workspaceId: String(session.user.workspaceId || "default"),
    clientId: clientId || null,
    actorId: String(session.user.id || ""),
  };
}

async function authorizeClientScope(session: any, clientId?: string | null) {
  if (!clientId) return true;
  const role = String(session.user.role || "");
  if (role === "SUPER_ADMIN" || role === "ACCOUNTANT") return true;
  const { db, sql } = await import("@/lib/db");
  const userId = String(session.user.id || "");
  const workspaceId = String(session.user.workspaceId || "default");
  const result = Array.from(await db.execute(sql`select id from clients where id=${clientId} and workspace_id=${workspaceId} and is_active=true and (
    (${role}='ACCOUNT_MANAGER' and account_manager_id=${userId}) or
    (${role}='MEDIA_BUYER' and media_buyer_id=${userId}) or
    (${role}='CLIENT' and user_id=${userId}) or
    (${role}='SALES')
  ) limit 1`) as any);
  return result.length > 0;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!(await authorizeClientScope(session, clientId))) return NextResponse.json({ error: "Forbidden client scope" }, { status: 403, headers: noStore });
  const scope = userScope(session, clientId);
  const view = req.nextUrl.searchParams.get("view") || "context";
  const data = view === "ceo" ? await buildCeoCommandSnapshot(scope) : await loadCompanyBrainContext(scope);
  return NextResponse.json({ version: "V9", view, data }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const role = String((session.user as any).role || "");
  if (!writeRoles.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });

  const body = await req.json().catch(() => null) as any;
  if (!body || typeof body.op !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  const clientId = body.clientId ? String(body.clientId) : null;
  if (!(await authorizeClientScope(session, clientId))) return NextResponse.json({ error: "Forbidden client scope" }, { status: 403, headers: noStore });
  const scope = userScope(session, clientId);

  try {
    let result: unknown;
    switch (body.op) {
      case "memory.record":
        result = await recordMemoryNode(scope, { kind: String(body.kind), title: String(body.title), content: String(body.content), confidence: Number(body.confidence ?? 0.5), sourceType: String(body.sourceType || "USER"), sourceId: body.sourceId ? String(body.sourceId) : undefined, freshUntil: body.freshUntil ? new Date(body.freshUntil) : undefined });
        break;
      case "commitment.record":
        result = await trackCommitment(scope, { title: String(body.title), ownerId: String(body.ownerId), sourceType: String(body.sourceType || "USER"), sourceId: body.sourceId ? String(body.sourceId) : undefined, dueAt: new Date(body.dueAt), evidence: body.evidence ? String(body.evidence) : undefined });
        break;
      case "objective.record":
        result = await recordStrategicObjective(scope, { parentId: body.parentId ? String(body.parentId) : undefined, title: String(body.title), level: body.level, metric: body.metric ? String(body.metric) : undefined, target: body.target == null ? undefined : Number(body.target), ownerId: String(body.ownerId), deadline: body.deadline ? new Date(body.deadline) : undefined });
        break;
      case "decision.record":
        result = await recordDecision(scope, { title: String(body.title), decision: String(body.decision), rationale: String(body.rationale), assumptions: Array.isArray(body.assumptions) ? body.assumptions : [], risks: Array.isArray(body.risks) ? body.risks : [], expectedOutcome: body.expectedOutcome ? String(body.expectedOutcome) : undefined, ownerId: String(body.ownerId), reviewAt: body.reviewAt ? new Date(body.reviewAt) : undefined });
        break;
      case "outcome.record":
        result = await recordOutcome(scope, { decisionId: body.decisionId ? String(body.decisionId) : undefined, metric: String(body.metric), baseline: body.baseline == null ? undefined : Number(body.baseline), target: body.target == null ? undefined : Number(body.target), actual: body.actual == null ? undefined : Number(body.actual), attributionConfidence: body.attributionConfidence == null ? undefined : Number(body.attributionConfidence), evidence: String(body.evidence || "") });
        break;
      case "scenario.record":
        result = await recordScenario(scope, { title: String(body.title), scenarioType: body.scenarioType, assumptions: Array.isArray(body.assumptions) ? body.assumptions : [], expectedImpact: body.expectedImpact && typeof body.expectedImpact === "object" ? body.expectedImpact : {}, probability: body.probability == null ? undefined : Number(body.probability) });
        break;
      case "proof.record":
        result = await recordProofOfWork(scope, { actionType: String(body.actionType), entityType: String(body.entityType), entityId: body.entityId ? String(body.entityId) : undefined, claimedOutcome: String(body.claimedOutcome), evidenceType: String(body.evidenceType), evidenceRef: String(body.evidenceRef) });
        break;
      case "dependency.record":
        result = await recordDependency(scope, { fromType: String(body.fromType), fromId: String(body.fromId), toType: String(body.toType), toId: String(body.toId), dependencyType: String(body.dependencyType), criticality: body.criticality });
        break;
      case "governance.request":
        if (!governanceRoles.has(role)) return NextResponse.json({ error: "Governance approval requests require finance/admin role" }, { status: 403, headers: noStore });
        result = await requestGovernanceApproval(scope, { entityType: String(body.entityType), entityId: String(body.entityId), title: String(body.title), amount: body.amount == null ? undefined : Number(body.amount), steps: Array.isArray(body.steps) ? body.steps : [] });
        break;
      default:
        return NextResponse.json({ error: "Unsupported institutional operation" }, { status: 400, headers: noStore });
    }
    return NextResponse.json({ ok: true, version: "V9", result }, { headers: noStore });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Institutional operation failed" }, { status: 400, headers: noStore });
  }
}
