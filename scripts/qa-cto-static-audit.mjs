import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const posix = (p) => p.replaceAll("\\", "/");
const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .map((x) => x.trim())
  .filter(Boolean);

const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const sourceExt = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const runtimeRoots = /^(?:app|components|lib|proxy\.ts)(?:\/|$)/;
const runtimeFiles = tracked.filter((f) => runtimeRoots.test(f) && sourceExt.test(f));
const allSourceFiles = tracked.filter((f) => sourceExt.test(f));
const apiRoutes = tracked.filter((f) => /^app\/api\/.+\/route\.ts$/.test(f));
const pages = tracked.filter((f) => /^app\/.+\/page\.tsx$/.test(f));
const dashboardPages = pages.filter((f) => f.startsWith("app/dashboard/"));
const migrations = tracked.filter((f) => /^db\/migrations\/.*\.sql$/.test(f));
const workflows = tracked.filter((f) => /^\.github\/workflows\/.*\.ya?ml$/.test(f));
const vivitoModules = tracked.filter((f) => /^lib\/vivito\/.*\.ts$/.test(f));
const vivitoQa = tracked.filter((f) => /^scripts\/qa-vivito-.*\.(?:mjs|ts)$/.test(f));

const blockers = [];
const warnings = [];
const inventory = {};

function lineAt(src, index) {
  return src.slice(0, Math.max(0, index)).split("\n").length;
}
function add(list, kind, file, src, index = 0, detail = "") {
  list.push({ kind, file, line: lineAt(src, index), detail: detail.replace(/\s+/g, " ").trim().slice(0, 220) });
}
function scanRegex(files, kind, re, target = blockers, skip = () => false) {
  for (const file of files) {
    if (skip(file)) continue;
    const src = read(file);
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of src.matchAll(rx)) add(target, kind, file, src, m.index ?? 0, m[0]);
  }
}

inventory.trackedFiles = tracked.length;
inventory.runtimeSourceFiles = runtimeFiles.length;
inventory.apiRoutes = apiRoutes.length;
inventory.pages = pages.length;
inventory.dashboardPages = dashboardPages.length;
inventory.migrations = migrations.length;
inventory.workflows = workflows.length;
inventory.vivitoModules = vivitoModules.length;
inventory.vivitoQaScripts = vivitoQa.length;

// 1) Repository/source integrity.
scanRegex(allSourceFiles, "MERGE_CONFLICT_MARKER", /^(?:<{7}|={7}|>{7})(?: .*)?$/m);
scanRegex(runtimeFiles, "TS_NOCHECK", /^\s*\/\/\s*@ts-nocheck\b/m);
scanRegex(runtimeFiles, "TS_IGNORE", /^\s*\/\/\s*@ts-ignore\b/m);
scanRegex(runtimeFiles, "SENTINEL_SOURCE", /^\s*__(?:PATCH|PLACEHOLDER|TODO)__\s*$/m);
scanRegex(runtimeFiles, "UNFINISHED_RUNTIME", /\b(?:TODO|FIXME|NOT_IMPLEMENTED|Not implemented|Coming soon)\b/i);
scanRegex(runtimeFiles, "PLACEHOLDER_HREF", /href\s*=\s*["']#["']/);
scanRegex(runtimeFiles.filter((f) => f.endsWith(".tsx")), "PERMANENTLY_DISABLED_CONTROL", /<(?:button|input|select|textarea)\b[^>]*\bdisabled(?:\s*=\s*\{?true\}?|\s|>)/i);
scanRegex(runtimeFiles, "UNSAFE_EVAL", /\b(?:eval\s*\(|new\s+Function\s*\()/);

// 2) Tenant isolation: no runtime fallback/default tenant literals.
const tenantDefault = /(?:\b(?:WORKSPACE|workspaceId|workspace_id)\b[^\n]{0,100}(?:=|:|\|\||\?\?|,)[^\n]{0,80}["']default["']|\beq\([^\n]{0,160}(?:workspaceId|workspace_id)[^\n]{0,100}["']default["'])/i;
scanRegex(runtimeFiles, "HARDCODED_TENANT_DEFAULT", tenantDefault);

// 3) API route structural/security inventory.
const PUBLIC_API = new Map([
  ["app/api/health/route.ts", "public health probe; response must not expose tenant/user metadata"],
  ["app/api/auth/[...nextauth]/route.ts", "NextAuth framework endpoint"],
  ["app/api/forgot-password/route.ts", "public password-reset request with enumeration-safe behavior"],
  ["app/api/reset-password/route.ts", "public single-use password-reset token endpoint"],
  ["app/api/signup/start/route.ts", "public signup initiation"],
  ["app/api/signup/verify/route.ts", "public OTP verification"],
  ["app/api/approve-token/route.ts", "public approval-token flow; token is the capability"],
]);
const httpExport = /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/;
const securityEvidence = /\b(?:auth|getToken|getServerSession|require[A-Z]\w*|assert[A-Z]\w*|verify[A-Z]\w*|authorize[A-Z]\w*|CRON_SECRET|WEBHOOK|webhook|signature|timingSafeEqual|apiKey|api[_-]?key|authorization|bearer|token)\b/;
for (const file of apiRoutes) {
  const src = read(file);
  if (!httpExport.test(src)) add(blockers, "API_WITHOUT_HTTP_HANDLER", file, src, 0, "route.ts exports no HTTP method");
  if (!PUBLIC_API.has(file) && !securityEvidence.test(src)) {
    add(blockers, "API_WITHOUT_EXPLICIT_SECURITY_EVIDENCE", file, src, 0, "No auth/token/signature/API-key evidence found; review endpoint explicitly");
  }
}
for (const [file, rationale] of PUBLIC_API) {
  if (!exists(file)) add(blockers, "PUBLIC_API_ALLOWLIST_STALE", file, "", 0, rationale);
}
if (exists("app/api/health/route.ts")) {
  const src = read("app/api/health/route.ts");
  if (/\b(?:userCount|usersCount|countUsers|totalUsers)\b|select\s+count\s*\([^)]*\)\s+from\s+users/i.test(src)) {
    add(blockers, "HEALTH_METADATA_LEAK", "app/api/health/route.ts", src, 0, "Health endpoint must not expose user counts");
  }
}

// 4) Page/component reality.
for (const file of pages) {
  const src = read(file);
  if (!/export\s+default\s+(?:async\s+)?(?:function|class|[A-Za-z_$])/.test(src)) {
    add(blockers, "PAGE_WITHOUT_DEFAULT_EXPORT", file, src, 0, "Next page lacks a default export");
  }
}
if (dashboardPages.length && exists("app/dashboard/layout.tsx")) {
  const layout = read("app/dashboard/layout.tsx");
  if (!/\b(?:auth|getToken|getServerSession|session)\b/.test(layout)) {
    add(blockers, "DASHBOARD_LAYOUT_WITHOUT_AUTH_EVIDENCE", "app/dashboard/layout.tsx", layout, 0, "Dashboard shell should establish authenticated context");
  }
} else if (dashboardPages.length) {
  add(blockers, "DASHBOARD_LAYOUT_MISSING", "app/dashboard/layout.tsx", "", 0, "Dashboard pages exist without dashboard layout");
}

// 5) Database/schema/migrations integrity.
if (!exists("db/schema.ts")) {
  add(blockers, "SCHEMA_MISSING", "db/schema.ts", "", 0, "Canonical Drizzle schema missing");
} else {
  const schema = read("db/schema.ts");
  const names = [...schema.matchAll(/pgTable\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  inventory.schemaTables = names.length;
  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) add(blockers, "DUPLICATE_SCHEMA_TABLE_NAME", "db/schema.ts", schema, schema.indexOf(name), name);
    seen.add(name);
  }
  if (!names.length) add(blockers, "SCHEMA_HAS_NO_TABLES", "db/schema.ts", schema, 0, "No pgTable declarations found");
}
for (const file of migrations) {
  const src = read(file);
  const dangerous = [
    ["RLS_DISABLED", /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i],
    ["PERMISSIVE_RLS_USING_TRUE", /CREATE\s+POLICY[\s\S]{0,500}\bUSING\s*\(\s*true\s*\)/i],
    ["PERMISSIVE_RLS_CHECK_TRUE", /CREATE\s+POLICY[\s\S]{0,500}\bWITH\s+CHECK\s*\(\s*true\s*\)/i],
  ];
  for (const [kind, re] of dangerous) {
    const m = re.exec(src);
    if (m) add(blockers, kind, file, src, m.index, m[0]);
  }
}

// 6) Release/CI discipline.
const CERT_WORKFLOWS = [
  ".github/workflows/qa-release.yml",
  ".github/workflows/release-verify.yml",
  ".github/workflows/vivito-super-operator-ci.yml",
];
for (const file of CERT_WORKFLOWS) {
  if (!exists(file)) {
    add(blockers, "CERTIFICATION_WORKFLOW_MISSING", file, "", 0, "Required certification workflow missing");
    continue;
  }
  const src = read(file);
  if (!/git\s+rev-parse\s+HEAD|GITHUB_SHA/.test(src)) add(blockers, "CERT_WORKFLOW_NO_SHA_ASSERTION", file, src, 0, "Exact candidate SHA must be asserted");
  if (/secrets\.(?:DATABASE_URL|DRIZZLE_DATABASE_URL|SUPABASE_[A-Z0-9_]+)/.test(src)) {
    add(blockers, "CERT_WORKFLOW_USES_PRODUCTION_DB_SECRET", file, src, 0, "Certification must use an isolated ephemeral database");
  }
}
const PROD_WORKFLOWS = workflows.filter((f) => /prod|production/i.test(path.basename(f)));
for (const file of PROD_WORKFLOWS) {
  const src = read(file);
  if (/pull_request\s*:/.test(src)) add(blockers, "PRODUCTION_WORKFLOW_ON_PULL_REQUEST", file, src, src.search(/pull_request\s*:/), "Production-capable workflow must not run automatically on PR");
}

// 7) VIVITO completeness: core capability modules + their behavioral gates.
const requiredVivitoModules = [
  "lib/vivito/orchestrator.ts",
  "lib/vivito/memory.ts",
  "lib/vivito/live-knowledge.ts",
  "lib/vivito/governance.ts",
  "lib/vivito/action-engine.ts",
  "lib/vivito/executors.ts",
  "lib/vivito/model-mesh.ts",
  "lib/vivito/capability-pack.ts",
  "lib/vivito/digital-twin.ts",
  "lib/vivito/learning-loop.ts",
  "lib/vivito/artifacts.ts",
  "lib/vivito/benchmark.ts",
  "lib/vivito/red-team-v2.ts",
  "lib/vivito/quota.ts",
  "lib/vivito/ceo-cfo.ts",
];
const requiredVivitoQa = [
  "scripts/qa-vivito-intelligence.mjs",
  "scripts/qa-vivito-actions.mjs",
  "scripts/qa-vivito-full-operator.mjs",
  "scripts/qa-vivito-operator-control.mjs",
  "scripts/qa-vivito-autonomy.mjs",
  "scripts/qa-vivito-external-writes.mjs",
  "scripts/qa-vivito-red-team-v2.ts",
];
for (const file of requiredVivitoModules) if (!exists(file)) add(blockers, "VIVITO_CORE_MODULE_MISSING", file, "", 0, "Required VIVITO core capability missing");
for (const file of requiredVivitoQa) if (!exists(file)) add(blockers, "VIVITO_BEHAVIOR_GATE_MISSING", file, "", 0, "Required VIVITO behavior gate missing");

// 8) Security-sensitive source must not weaken fail-closed DB/session behavior.
for (const file of ["lib/db.ts", "lib/auth.ts", "lib/permissions.ts", "lib/access-scope.ts", "proxy.ts"]) {
  if (!exists(file)) add(blockers, "SECURITY_CORE_FILE_MISSING", file, "", 0, "Required security/runtime core file missing");
}
if (exists("lib/db.ts")) {
  const src = read("lib/db.ts");
  if (!/DATABASE_URL/.test(src)) add(blockers, "DB_CONNECTION_CONTRACT_MISSING", "lib/db.ts", src, 0, "DB layer must declare DATABASE_URL contract");
}

// Produce stable, reviewable output.
console.log("CTO REPOSITORY-WIDE STATIC ACCEPTANCE");
for (const [key, value] of Object.entries(inventory)) console.log(`- ${key}: ${value}`);
if (PUBLIC_API.size) {
  console.log("\nExplicit public API allowlist:");
  for (const [file, rationale] of PUBLIC_API) console.log(`- ${file}: ${rationale}`);
}
function print(title, items) {
  console.log(`\n${title}: ${items.length}`);
  for (const item of items.sort((a, b) => `${a.kind}:${a.file}:${a.line}`.localeCompare(`${b.kind}:${b.file}:${b.line}`))) {
    console.log(`- [${item.kind}] ${posix(item.file)}:${item.line}${item.detail ? ` · ${item.detail}` : ""}`);
  }
}
print("WARNINGS", warnings);
print("RELEASE BLOCKERS", blockers);
if (blockers.length) {
  console.error(`\nFAIL · ${blockers.length} CTO release blocker(s). Every blocker requires source review/fix or a documented, narrowly-scoped gate rationale.`);
  process.exit(1);
}
console.log("\nPASS · repository-wide CTO static acceptance has no release blockers.");
