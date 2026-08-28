import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const runtime = read("lib/vivito/persistent-company-brain-v9.ts");
const api = read("app/api/assistant/institutional/route.ts");
const migration = read("db/migrations/20260828_vivito_persistent_company_brain_v9.sql");

const checks = [
  ["Migration is transaction wrapped", /^BEGIN;[\s\S]*COMMIT;\s*$/m.test(migration)],
  ["Persistent memory nodes exist", migration.includes("CREATE TABLE IF NOT EXISTS vivito_memory_nodes")],
  ["Memory graph edges exist", migration.includes("CREATE TABLE IF NOT EXISTS vivito_memory_edges")],
  ["Commitment ledger exists", migration.includes("CREATE TABLE IF NOT EXISTS vivito_commitments") && migration.includes("owner_id") && migration.includes("due_at") && migration.includes("evidence")],
  ["Strategic objective tree exists", migration.includes("CREATE TABLE IF NOT EXISTS vivito_strategic_objectives") && migration.includes("parent_id") && migration.includes("metric") && migration.includes("target")],
  ["Decision journal exists", migration.includes("CREATE TABLE IF NOT EXISTS vivito_decisions") && migration.includes("rationale") && migration.includes("assumptions") && migration.includes("risks")],
  ["Outcome learning store exists", migration.includes("CREATE TABLE IF NOT EXISTS vivito_outcomes") && migration.includes("attribution_confidence") && migration.includes("evidence text NOT NULL")],
  ["Scenario store labels hypotheses", migration.includes("CREATE TABLE IF NOT EXISTS vivito_scenarios") && migration.includes("DEFAULT 'HYPOTHESIS'")],
  ["Proof ledger separates claim from verification", migration.includes("CREATE TABLE IF NOT EXISTS vivito_proof_ledger") && migration.includes("claimed_outcome") && migration.includes("verification_status")],
  ["Cross-functional dependency graph exists", migration.includes("CREATE TABLE IF NOT EXISTS vivito_dependency_edges") && migration.includes("criticality")],
  ["All persistent domains are workspace scoped", (migration.match(/workspace_id text NOT NULL/g) || []).length >= 9],
  ["Client isolation is represented in persistent domains", (migration.match(/client_id text/g) || []).length >= 9],
  ["Runtime records provenance and freshness", runtime.includes("sourceType") && runtime.includes("freshUntil") && runtime.includes("assessMemoryFreshness")],
  ["Runtime detects contradictory active memory", runtime.includes("detectMemoryContradictions") && runtime.includes("a.content <> b.content")],
  ["Runtime prevents cross-scope memory links", runtime.includes("Memory nodes must exist inside the same workspace/client scope")],
  ["Outcome attribution defaults to uncertainty", runtime.includes("input.attributionConfidence ?? 0")],
  ["Proof of work starts unverified", runtime.includes("'UNVERIFIED'") && runtime.includes("verifyProofOfWork")],
  ["CEO command snapshot is evidence aware", runtime.includes("buildCeoCommandSnapshot") && runtime.includes("API acknowledgement is not business outcome proof")],
  ["Twelve V9 capabilities are declared", (runtime.match(/"[a-z-]+"/g) || []).filter(x => ["persistent-company-memory-graph","commitment-ledger","strategic-objective-engine","decision-journal","outcome-learning-loop","ceo-command-center-runtime","cross-functional-dependency-graph","freshness-contradiction-detection","proof-of-work-ledger","scenario-store","governance-approvals","institutional-api-layer"].some(id => x.includes(id))).length === 12],
  ["High-impact actions remain approval gated", runtime.includes("highImpactApprovalRequired: true") && runtime.includes("approval_workflows")],
  ["API requires authentication", api.includes("const session = await auth()") && api.includes("Unauthorized")],
  ["API rechecks client scope", api.includes("authorizeClientScope") && api.includes("Forbidden client scope")],
  ["Client role cannot write institutional state", api.includes("writeRoles") && !api.match(/writeRoles[^\n]*CLIENT/)],
  ["Governance is restricted to finance/admin", api.includes('new Set(["SUPER_ADMIN", "ACCOUNTANT"])')],
  ["Institutional API is no-store", api.includes('"Cache-Control": "private, no-store"')],
  ["No frozen benchmark/evaluator imports", !runtime.includes("evaluator") && !runtime.includes("benchmark") && !api.includes("evaluator") && !api.includes("benchmark")],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) { console.log(`PASS  ${name}`); passed++; }
  else console.error(`FAIL  ${name}`);
}
console.log(`\n${passed}/${checks.length} VIVITO Persistent Company Brain V9 checks passed.`);
if (passed !== checks.length) process.exit(1);
