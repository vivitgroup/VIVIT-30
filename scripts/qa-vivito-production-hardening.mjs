import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const vercel = JSON.parse(read("vercel.json"));
const next = read("next.config.ts");
const proxy = read("proxy.ts");
const buildGuard = read("scripts/vercel-build.mjs");
const dependencyGuard = read("scripts/qa-production-dependency-security.mjs");
const runbook = read("RELEASE-RUNBOOK.md");
const releaseQa = read(".github/workflows/qa-release.yml");
const releaseVerify = read(".github/workflows/release-verify.yml");

check("Vercel uses lockfile deterministic install", vercel.installCommand === "npm ci");
check("Vercel production build goes through guarded build wrapper", vercel.buildCommand === "node scripts/vercel-build.mjs");
check("Production build fails closed without cron secret", buildGuard.includes('process.env.VERCEL_ENV==="production"') && buildGuard.includes("CRON_SECRET") && buildGuard.includes("process.exit(1)"));
check("Production dependencies are checked against OSV", dependencyGuard.includes("api.osv.dev/v1/querybatch") && dependencyGuard.includes("process.exit(1)"));
check("Dependency security lookup is time bounded", dependencyGuard.includes("AbortSignal.timeout(30000)"));
check("Global framework fingerprint is disabled", next.includes("poweredByHeader:false"));
check("Global HSTS is enabled", next.includes("Strict-Transport-Security") && next.includes("max-age=31536000"));
check("Global MIME sniffing is disabled", next.includes("X-Content-Type-Options") && next.includes("nosniff"));
check("Global framing is denied", next.includes("X-Frame-Options") && next.includes("DENY"));
check("Proxy CSP denies frame ancestors and objects", proxy.includes("frame-ancestors 'none'") && proxy.includes("object-src 'none'"));
check("Cross-site mutations fail closed", proxy.includes('site==="cross-site"') && proxy.includes("CSRF validation failed") && proxy.includes("status:403"));
check("Cron authentication fails closed when secret is absent", proxy.includes("if(!expected||secret!==expected)") && proxy.includes("status:401"));
check("Revoked sessions are rejected", proxy.includes("authValid!==true") && proxy.includes("Session is no longer authorized"));
check("Release runbook forbids CI Production access", runbook.includes("CI must not connect to Production for backup, restore, migration, or validation"));
check("Release runbook requires immutable exact-head evidence", runbook.includes("same immutable approved candidate SHA") && runbook.includes("Any new commit invalidates downstream certifications"));
check("Release runbook requires backup before Production writes", runbook.includes("Mandatory backup before Production writes") && runbook.includes("Never run a Production migration if a fresh recoverable backup cannot be identified"));
check("Release runbook requires explicit final acceptance", runbook.includes("Stage 14 — Final CTO Acceptance"));
check("Release QA checks out exact candidate head", releaseQa.includes("Checkout exact candidate SHA") && releaseQa.includes('test "$ACTUAL" = "$EXPECTED"'));
check("Release Verify independently asserts exact candidate head", releaseVerify.includes("Assert exact candidate SHA") && releaseVerify.includes('test "$ACTUAL" = "$EXPECTED"'));
check("Release CI uses local database endpoints", releaseQa.includes("127.0.0.1:5432") && releaseVerify.includes("127.0.0.1:5432"));

const workflowRoot = ".github/workflows";
const workflowFiles = fs.readdirSync(workflowRoot).filter((name) => /\.ya?ml$/i.test(name));
const dangerousPatterns = [
  /\bvercel\s+(?:deploy\s+)?--prod\b/i,
  /\bvercel\s+promote\b/i,
  /\bsupabase\s+db\s+push\b[^\n]*(?:production|prod)/i,
  /\bprisma\s+migrate\s+deploy\b[^\n]*(?:production|prod)/i,
  /DATABASE_URL\s*:\s*\$\{\{\s*secrets\.[^}]*PROD/i,
  /PRODUCTION_DATABASE_URL\s*:\s*\$\{\{\s*secrets\./i,
];
for (const name of workflowFiles) {
  const body = read(path.join(workflowRoot, name));
  for (const pattern of dangerousPatterns) {
    check(`CI workflow ${name} contains no Production write/deploy command matching ${pattern}`, !pattern.test(body));
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`Production hardening failed: ${failed.length}/${checks.length} checks failed.`);
  for (const item of failed) console.error(`FAIL  ${item.name}`);
  process.exit(1);
}
console.log(`Production hardening: PASS (${checks.length}/${checks.length} checks, ${workflowFiles.length} workflows scanned).`);
