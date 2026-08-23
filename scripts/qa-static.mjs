import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pass = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

const pages = new Set(walk("app/dashboard")
  .filter((file) => file.endsWith("/page.tsx"))
  .map((file) => "/" + path.dirname(file).replaceAll("\\", "/").replace(/^app\//, "")));
const sources = [...walk("app"), ...walk("components")].filter((file) => /\.(tsx?|jsx?)$/.test(file));

const internalLinks = new Set();
for (const file of sources) {
  const source = read(file);
  for (const match of source.matchAll(/(?:href=|router\.(?:push|replace)\(|window\.location\.(?:assign|replace)\()[{(]?\s*["'`]\/dashboard\/([^"'`?#)]*)/g)) {
    internalLinks.add(`/dashboard/${match[1].replace(/\/$/, "")}`);
  }
}
const routeExists = (href) => pages.has(href) || [...pages].some((page) => {
  const pattern = "^" + page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[[^/]+\\\]/g, "[^/]+") + "$";
  return new RegExp(pattern).test(href.replace(/\$\{[^}]+\}/g, "preview-id"));
});
const broken = [...internalLinks].filter((href) => !routeExists(href));
pass("All static dashboard links resolve", broken.length === 0, broken.join(", "));

const proxy = read("proxy.ts");
for (const route of ["/dashboard/revenue-attribution", "/dashboard/nps", "/dashboard/onboarding", "/dashboard/monthly-reports", "/dashboard/marketplace", "/dashboard/budget"]) {
  pass(`Proxy protects ${route}`, proxy.includes(route));
}
pass("Next 16 proxy convention is used", fs.existsSync(path.join(root,"proxy.ts")) && !fs.existsSync(path.join(root,"middleware.ts")));
pass("No fake in-memory login limiter remains", !/loginAttempts|addLoginFailure|checkBruteForce/.test(proxy));

const calendar = read("components/calendar/CalendarClient.tsx");
pass("Scheduled posts require media", /assetFileId/.test(calendar) && /required/.test(calendar) && /disabled=\{saving\|\|uploading\|\|!assetFileId\}/.test(calendar));
pass("Scheduled posts accept images and video", /image\/\*,video\/\*/.test(calendar));

const filesApi = read("app/api/files/route.ts");
pass("Files support 100 MB", /100\s*\*\s*1024\s*\*\s*1024/.test(filesApi));
pass("File storage bucket self-heals", /ensureBucket/.test(filesApi));
pass("File links are role/client scoped", /validateLinks/.test(filesApi) && /ACCOUNT_MANAGER/.test(filesApi) && /MEDIA_BUYER/.test(filesApi));

const clientApi = read("app/api/clients/route.ts");
pass("Accountant can create clients", clientApi.includes('"ACCOUNTANT"'));
pass("Client creation remains role-gated", /SUPER_ADMIN/.test(clientApi) && /ACCOUNT_MANAGER/.test(clientApi));

const reports = read("components/reports/ReportsClient.tsx");
pass("Reports render UI instead of raw endpoint navigation", reports.includes("fetch(") && !/window\.location\s*=\s*["'`]\/api\/reports/.test(reports));

const ai = read("app/api/ai/route.ts");
pass("AI requires a configured provider", ai.includes("AI provider is not configured") && !ai.includes("Smart draft (local mode)"));
pass("AI financial prompts use EGP", ai.includes(" EGP"));
pass("AI client context is authorization scoped", ai.includes("canAccessClient") && ai.includes("hydrateClientContext"));

const workspace = read("app/dashboard/workspace/page.tsx");
pass("Legacy workspace routes to settings", workspace.includes("/dashboard/settings#integrations"));

const layout = read("app/layout.tsx");
pass("Mobile viewport is explicit", /device-width/.test(layout));

const accountPayments = read("app/dashboard/clients/accounts-payment/page.tsx");
pass("Account Manager payment data is client-scoped", accountPayments.includes("c.account_manager_id=${userId}"));

const tasksInbox = read("app/dashboard/tasks-inbox/page.tsx");
pass("Account Manager task inbox is client-scoped", tasksInbox.includes("clients.accountManagerId") && tasksInbox.includes("inArray(creativeTasks.clientId"));
pass("Task inbox bulk writes are client-scoped", tasksInbox.includes("scopeCondition") && tasksInbox.includes("ownedIds"));

const bulkApi = read("app/api/bulk/route.ts");
pass("Bulk API has explicit task status allowlist", bulkApi.includes("TASK_STATUSES") && bulkApi.includes("Invalid task IDs or status"));
pass("Bulk task writes scope Account Managers", bulkApi.includes("managedClientIds") && bulkApi.includes("inArray(creativeTasks.clientId,owned)"));
pass("Bulk invoice mutation is finance-role gated", /invoices\.mark_overdue[\s\S]*SUPER_ADMIN[\s\S]*ACCOUNTANT/.test(bulkApi));
pass("Bulk exports have role gates", bulkApi.includes('case "clients.export"') && bulkApi.includes('case "tasks.export"') && bulkApi.includes("Forbidden"));

const onboardingApi = read("app/api/onboarding/route.ts");
pass("Onboarding API only accepts known steps", onboardingApi.includes("ALLOWED_STEPS") && onboardingApi.includes("Invalid onboarding step"));
pass("Onboarding completion is attributed to current user", onboardingApi.includes("completedBy:value?String((session.user as any).id):null"));

const monthlyReports = read("app/dashboard/monthly-reports/page.tsx");
pass("Monthly reports scope Account Manager clients", monthlyReports.includes("clients.accountManagerId") && monthlyReports.includes("currentUserId"));
pass("Monthly report UI uses EGP formatter", monthlyReports.includes("currency:'EGP'") || monthlyReports.includes('currency:"EGP"'));

const monthlySummary = read("app/api/monthly-summary/[clientId]/route.ts");
pass("Monthly summary validates client access", monthlySummary.includes("canAccessClient"));
pass("Monthly summary validates report period", monthlySummary.includes("month<1||month>12") && monthlySummary.includes("year<2020||year>2100"));

const pdfReport = read("app/api/pdf-report/[clientId]/route.ts");
pass("PDF report validates client access", pdfReport.includes("canAccessClient"));
pass("PDF report bounds metrics to selected month", pdfReport.includes("monthEnd") && pdfReport.includes("lte(mediaMetrics.date, monthEnd)"));

const budget = read("app/dashboard/budget/page.tsx");
pass("Budget pacing is role/client scoped", budget.includes("clients.accountManagerId") && budget.includes("clients.mediaBuyerId") && budget.includes("inArray(mediaMetrics.clientId,clientIds)"));

const media = read("app/dashboard/media/page.tsx");
pass("Media metric writes validate client ownership", media.includes("Invalid client or platform") && media.includes("if(!owned) throw new Error(\"Forbidden\")"));
pass("Media platform aggregates use visible clients only", media.includes("visiblePlatformMetrics") && media.includes("visibleThisMonth"));

const marketplace = read("app/dashboard/marketplace/page.tsx");
pass("Marketplace Account Manager tasks are scoped", marketplace.includes("clients.accountManagerId") && marketplace.includes("inArray(creativeTasks.clientId,ids)"));

const recurring = read("app/api/recurring/route.ts");
pass("Recurring invoices are finance-role gated", recurring.includes('"SUPER_ADMIN","ACCOUNTANT"'));
pass("Recurring invoice messages use EGP", recurring.includes('currency:"EGP"'));

const quickAction = read("app/api/quick-action/route.ts");
pass("Quick actions contain no legacy health action", !quickAction.includes("recalculate_health_old"));
pass("Recurring quick action forwards authenticated session", quickAction.includes('/api/recurring') && quickAction.includes('"Cookie"'));

const publicFiles = fs.existsSync(path.join(root,"public")) ? walk("public") : [];
const demoAssets = publicFiles.filter(file => /demo|sample|mock/i.test(path.basename(file)));
pass("No demo assets ship in public", demoAssets.length === 0, demoAssets.join(", "));

const health = read("app/api/health/route.ts");
const packageVersion = JSON.parse(read("package.json")).version;
pass("Health reports package version", health.includes(`\"${packageVersion}\"`));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failures.length}/${checks.length} static QA checks passed.`);
if (failures.length) process.exit(1);
