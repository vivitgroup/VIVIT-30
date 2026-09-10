import fs from "node:fs";

const source = fs.readFileSync("app/api/assistant/diagnostics/route.ts", "utf8");
const checks = [
  ["requires authenticated session", /if \(!session\?\.user\)/],
  ["fails closed to SUPER_ADMIN", /role !== "SUPER_ADMIN"/],
  ["requires workspace scope", /if \(!workspaceId\)/],
  ["diagnostics are read-only GET", /export async function GET\(\)/],
  ["database probe has bounded timeout", /PROBE_TIMEOUT_MS = 2500/],
  ["database failures return safe generic message", /message: "Database probe failed"/],
  ["configuration exposes presence only", /Boolean\(process\.env\[name\]\?\.trim\(\)\)/],
  ["response disables caching", /private, no-store/],
  ["response enables nosniff", /X-Content-Type-Options/],
  ["remediation is disabled by default", /remediation: \{ enabled: false, requiresConfirmation: true \}/],
  ["no environment values are returned", !/value:\s*process\.env|process\.env\[[^\]]+\]\s*[,}]/.test(source)],
  ["route performs no mutation verbs", !/export async function (POST|PUT|PATCH|DELETE)/.test(source)],
  ["route performs no database mutation", !/\b(insert|update|delete)\s+/i.test(source)],
];

let failures = 0;
for (const [name, test] of checks) {
  const passed = typeof test === "boolean" ? test : test.test(source);
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failures += 1;
}

if (failures) {
  console.error(`VIVITO System Diagnostics Certification failed: ${failures}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`VIVITO System Diagnostics Certification passed: ${checks.length}/${checks.length}`);
