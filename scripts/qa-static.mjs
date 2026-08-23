import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
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
pass("Next 16 proxy convention is used", exists("proxy.ts") && !exists("middleware.ts"));
pass("No fake in-memory login limiter remains", !/loginAttempts|addLoginFailure|checkBruteForce/.test(proxy));
const accountsPaymentRule = proxy.match(/\["\/dashboard\/clients\/accounts-payment",\s*\[([^\]]+)\]\]/)?.[1] ?? "";
pass("Accounts Payment has a specific proxy rule", accountsPaymentRule.length > 0);
pass("Media Buyer cannot access Accounts Payment", accountsPaymentRule.length > 0 && !accountsPaymentRule.includes("MEDIA_BUYER"));
pass("Specific Accounts Payment rule precedes generic Clients rule", proxy.indexOf('["/dashboard/clients/accounts-payment"') < proxy.indexOf('["/dashboard/clients",'));

pass("Obsolete referral UI is removed", !exists("app/dashboard/referrals/page.tsx"));
pass("Obsolete referral API is removed", !exists("app/api/referrals/route.ts"));
pass("Obsolete SaaS analytics UI is removed", !exists("app/dashboard/saas-analytics/page.tsx"));

const calendar = read("components/calendar/CalendarClient.tsx");
pass("Scheduled posts require media", /assetFileId/.test(calendar) && /required/.test(calendar) && /disabled=\{saving\|\|uploading\|\|!assetFileId\}/.test(calendar));
pass("Scheduled posts accept images and video", /image\/\*,video\/\*/.test(calendar));

const filesApi = read("app/api/files/route.ts");
pass("Files support 100 MB", /100\s*\*\s*1024\s*\*\s*1024/.test(filesApi));
pass("File storage bucket self-heals", /ensureBucket/.test(filesApi));

const clientApi = read("app/api/clients/route.ts");
pass("Accountant can create clients", clientApi.includes('"ACCOUNTANT"'));
pass("Client creation remains role-gated", /SUPER_ADMIN/.test(clientApi) && /ACCOUNT_MANAGER/.test(clientApi));
pass("Client assignments are role validated", /eq\(users\.role,\s*["']ACCOUNT_MANAGER["']\)/.test(clientApi) && /eq\(users\.role,\s*["']MEDIA_BUYER["']\)/.test(clientApi));
pass("Client contract dates are ordered", /contractEnd\s*<\s*contractStart/.test(clientApi));
pass("Client URLs are server validated", /validUrl/.test(clientApi) && /http:/.test(clientApi) && /https:/.test(clientApi));

const publicClientsApi = read("app/api/v1/clients/route.ts");
pass("Public clients API is workspace scoped", /eq\(clients\.workspaceId,\s*apiKey\.workspaceId\)/.test(publicClientsApi));
pass("Public clients API does not accept API keys in query strings", !/searchParams\.get\(["']api_key["']\)/.test(publicClientsApi));
pass("Public clients API does not advertise fake rate limits", !/X-RateLimit-Limit|X-RateLimit-Window/.test(publicClientsApi));

const apiKeys = read("app/api/api-keys/route.ts");
pass("Public API keys are explicitly read-only", /const permissions = ["']read["']/.test(apiKeys));
pass("API key revoke is workspace scoped", /eq\(apiKeys\.workspaceId,\s*["']default["']\)/.test(apiKeys));

const bulkApi = read("app/api/bulk/route.ts");
for (const action of ["clients.export", "tasks.export", "tasks.notify", "clients.update_health", "invoices.mark_overdue"]) {
  const start = bulkApi.indexOf(`case \"${action}\"`);
  const next = start >= 0 ? bulkApi.indexOf("case \"", start + 6) : -1;
  const block = start >= 0 ? bulkApi.slice(start, next > start ? next : bulkApi.length) : "";
  pass(`Bulk action ${action} has an authorization gate`, /hasRole\(|role\s*!==\s*["']SUPER_ADMIN["']|return forbidden\(\)/.test(block));
}
pass("Bulk health trigger forwards the authenticated session", /Cookie:\s*req\.headers\.get\(["']cookie["']\)/.test(bulkApi));
pass("Bulk invoice mutation is workspace scoped", /eq\(financeRecords\.workspaceId,\s*["']default["']\)/.test(bulkApi));
pass("Bulk Account Manager task access is client scoped", /eq\(clients\.accountManagerId,\s*userId\)/.test(bulkApi) && /inArray\(creativeTasks\.clientId,\s*clientIds\)/.test(bulkApi));

const whatsapp = read("app/api/whatsapp-templates/route.ts");
pass("WhatsApp refuses fake sends when integration is missing", /WhatsApp integration is not configured/.test(whatsapp) && /status:\s*result\.configured\s*\?\s*502\s*:\s*503/.test(whatsapp));
pass("WhatsApp templates use EGP", whatsapp.includes(" EGP"));
pass("WhatsApp no longer records simulated sends as success", !/status:\s*["']SIMULATED["']/.test(whatsapp));

const searchApi = read("app/api/search/route.ts");
pass("Account Manager task search is client scoped", /inArray\(creativeTasks\.clientId,\s*assignedClientIds\)/.test(searchApi));
pass("Sales search values use EGP", searchApi.includes('toLocaleString("en-EG")} EGP'));

const finance = read("app/dashboard/finance/page.tsx");
pass("Finance due date uses the selected calendar month", /new Date\(year,\s*month\s*-\s*1,\s*5\)/.test(finance));
pass("Finance stores media buying fee", /mediaBuyingFee:\s*agencyFee/.test(finance));
pass("Finance mutations are workspace scoped", /financeRecords\.workspaceId/.test(finance));
pass("Finance UX uses EGP", finance.includes("(EGP)") && !/Amount \(\$\)|Retainer \(\$\)|Ad Spend \(\$\)/.test(finance));
pass("Finance month select has no selected prop", !/selected=/.test(finance));
pass("Finance KPIs are not limited to the recent invoice table", /ytdFinance/.test(finance) && /agingRows/.test(finance));

const newTask = read("app/dashboard/creative/new/page.tsx");
const createTask = read("lib/actions/create-task.ts");
pass("New task form scopes Account Managers to assigned clients", /eq\(clients\.accountManagerId,\s*userId\)/.test(newTask));
pass("New task form uses active creators only", /eq\(users\.isActive,\s*true\)/.test(newTask));
pass("New task form rejects past deadlines in UI", /min=\{new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)\}/.test(newTask));
pass("New task page uses the secure task action", newTask.includes('@/lib/actions/create-task'));
pass("Task creation validates active creator role", /eq\(users\.role,\s*["']CREATOR["']\)/.test(createTask) && /eq\(users\.isActive,\s*true\)/.test(createTask));
pass("Task creation validates deadline server-side", /Deadline cannot be in the past/.test(createTask));

const signupApi = read("app/api/signup/route.ts");
const signupOtp = read("app/api/signup/otp/route.ts");
const signupPage = read("app/signup/page.tsx");
pass("Signup accepts valid business emails, not Gmail only", !/@gmail\\\.com/.test(signupApi) && !/@gmail\\\.com/.test(signupOtp) && !/@gmail\\\.com/.test(signupPage));
pass("Signup binds users to the default workspace", /eq\(workspaces\.id,\s*["']default["']\)/.test(signupApi));
pass("OTP uses cryptographic randomInt", /randomInt\(100000,\s*1000000\)/.test(signupOtp));
pass("OTP requests have a cooldown", /60_000/.test(signupOtp) && /status:\s*429/.test(signupOtp));

const forgotPassword = read("app/api/password/forgot/route.ts");
pass("Production password reset fails clearly without email delivery", /NODE_ENV\s*===\s*["']production["']/.test(forgotPassword) && /status:\s*503/.test(forgotPassword));
pass("Password reset requests have a cooldown", /60_000/.test(forgotPassword));

const team = read("app/dashboard/team/page.tsx");
pass("Team account approvals use a strict role allowlist", /APPROVABLE_ROLES/.test(team) && /includes\(finalRole/.test(team));
pass("Team only reviews pending account requests", /approvalStatus\s*!==\s*["']PENDING["']/.test(team) && /eq\(users\.approvalStatus,\s*["']PENDING["']\)/.test(team));
pass("Leave reviews accept only approved or rejected", /\["APPROVED",\s*"REJECTED"\]\.includes\(status\)/.test(team));
pass("Team payroll uses EGP", team.includes('toLocaleString("en-EG")} EGP') && !team.includes('`$${'));

const settings = read("app/dashboard/settings/page.tsx");
pass("Settings has no dead user filter", !settings.includes('onInput={undefined}') && !settings.includes('placeholder="Filter users..."'));
pass("Settings does not claim an active brute-force guard", !settings.includes('Brute Force Guard') && settings.includes('Login throttling'));
pass("Settings protects the last active Super Admin", settings.includes('At least one active Super Admin is required'));
pass("Hidden custom-role controls are removed", !settings.includes('Create Custom Role') && !settings.includes('display:"none"'));

const reports = read("components/reports/ReportsClient.tsx");
pass("Reports render UI instead of raw endpoint navigation", reports.includes("fetch(") && !/window\.location\s*=\s*["'`]\/api\/reports/.test(reports));
const ai = read("app/api/ai/route.ts");
pass("AI requires a configured provider", ai.includes("AI provider is not configured") && !ai.includes("Smart draft (local mode)"));
pass("AI financial prompts use EGP", ai.includes(" EGP"));
const workspace = read("app/dashboard/workspace/page.tsx");
pass("Legacy workspace routes to settings", workspace.includes("/dashboard/settings#integrations"));
const layout = read("app/layout.tsx");
pass("Mobile viewport is explicit", /device-width/.test(layout));
const publicFiles = exists("public") ? walk("public") : [];
const demoAssets = publicFiles.filter((file) => /demo|sample|mock/i.test(path.basename(file)));
pass("No demo assets ship in public", demoAssets.length === 0, demoAssets.join(", "));
const health = read("app/api/health/route.ts");
const packageVersion = JSON.parse(read("package.json")).version;
pass("Health reports package version", health.includes(`\"${packageVersion}\"`));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failures.length}/${checks.length} static QA checks passed.`);
if (failures.length) process.exit(1);
