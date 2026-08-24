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
const walk = (dir) => fs.existsSync(path.join(root,dir)) ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : [];

const pages = new Set(walk("app/dashboard").filter((file) => file.endsWith("/page.tsx")).map((file) => "/" + path.dirname(file).replaceAll("\\", "/").replace(/^app\//, "")));
const sources = [...walk("app"), ...walk("components")].filter((file) => /\.(tsx?|jsx?)$/.test(file));
const internalLinks = new Set();
for (const file of sources) {
  const source = read(file);
  for (const match of source.matchAll(/(?:href=|router\.(?:push|replace)\(|window\.location\.(?:assign|replace)\()[{(]?\s*["'`]\/dashboard\/([^"'`?#)]*)/g)) internalLinks.add(`/dashboard/${match[1].replace(/\/$/, "")}`);
}
const routeExists = (href) => pages.has(href) || [...pages].some((page) => {
  const pattern = "^" + page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[[^/]+\\\]/g, "[^/]+") + "$";
  return new RegExp(pattern).test(href.replace(/\$\{[^}]+\}/g, "preview-id"));
});
const broken = [...internalLinks].filter((href) => !routeExists(href));
pass("All static dashboard links resolve", broken.length === 0, broken.join(", "));

const proxy = read("proxy.ts");
for (const route of ["/dashboard/revenue-attribution", "/dashboard/nps", "/dashboard/onboarding", "/dashboard/monthly-reports", "/dashboard/marketplace", "/dashboard/budget"]) pass(`Proxy protects ${route}`, proxy.includes(route));
pass("Next 16 proxy convention is used", fs.existsSync(path.join(root,"proxy.ts")) && !fs.existsSync(path.join(root,"middleware.ts")));

const sidebar = read("components/layout/Sidebar.tsx");
const mobile = read("components/layout/MobileNav.tsx");
pass("Calendar navigation and proxy agree for CLIENT", sidebar.includes('label:"Calendar"') && proxy.includes('["/dashboard/calendar", ["SUPER_ADMIN", "ACCOUNT_MANAGER", "CREATOR", "SALES", "CLIENT"]]'));
pass("AI Studio navigation and proxy agree", proxy.includes('["/dashboard/ai-studio", ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR", "SALES", "ACCOUNTANT", "CLIENT"]]'));
pass("Mobile CLIENT calendar is not dead navigation", mobile.includes('CLIENT:[{icon:"🏠"') && mobile.includes('href:"/dashboard/calendar"') && proxy.includes('"CLIENT"]]'));

const calendarPage = read("app/dashboard/calendar/page.tsx");
pass("Calendar page allows CLIENT and SALES read access", calendarPage.includes("Role.CLIENT") && calendarPage.includes("Role.SALES"));
pass("Calendar management excludes SALES", /const canManage=\[Role\.SUPER_ADMIN,Role\.ACCOUNT_MANAGER\]\.includes\(role\)/.test(calendarPage));

const calendar = read("components/calendar/CalendarClient.tsx");
pass("Scheduled posts require media", /assetFileId/.test(calendar) && /required/.test(calendar) && /disabled=\{saving\|\|uploading\|\|!assetFileId\}/.test(calendar));
pass("Scheduled posts accept images and video", /image\/\*,video\/\*/.test(calendar));

const filesApi = read("app/api/files/route.ts");
const filesPage = read("app/dashboard/files/page.tsx");
pass("Files support 500 MB", /500\s*\*\s*1024\s*\*\s*1024/.test(filesApi) && /500\s*\*\s*1024\s*\*\s*1024/.test(filesPage));
pass("Files API supports owner/admin edit", /export async function PATCH/.test(filesApi) && /uploadedBy/.test(filesApi) && /SUPER_ADMIN/.test(filesApi));
pass("Files API supports owner/admin delete", /export async function DELETE/.test(filesApi) && /uploadedBy/.test(filesApi) && /SUPER_ADMIN/.test(filesApi));
pass("Files UI exposes edit/delete actions", /Edit/.test(filesPage) && /Delete/.test(filesPage));
pass("File storage bucket self-heals", /ensureBucket/.test(filesApi));
pass("File links are role/client scoped", /validateLinks/.test(filesApi) && /ACCOUNT_MANAGER/.test(filesApi) && /MEDIA_BUYER/.test(filesApi));

const clientApi = read("app/api/clients/route.ts");
pass("Client creation remains role-gated", /SUPER_ADMIN/.test(clientApi) && /ACCOUNT_MANAGER/.test(clientApi));

const reports = read("components/reports/ReportsClient.tsx");
pass("Reports render UI instead of raw endpoint navigation", reports.includes("fetch(") && !/window\.location\s*=\s*["'`]\/api\/reports/.test(reports));

const ai = read("app/api/ai/route.ts");
const assistant = read("app/api/assistant/route.ts");
pass("AI requires a configured provider", ai.includes("AI provider is not configured") && !ai.includes("Smart draft (local mode)"));
pass("AI financial prompts use EGP", ai.includes(" EGP"));
pass("AI client context is authorization scoped", ai.includes("canAccessClient") && ai.includes("hydrateClientContext"));
pass("Assistant handles task/deadline questions", /deadline|due today|overdue/i.test(assistant));

const layout = read("app/layout.tsx");
pass("Mobile viewport is explicit", /device-width/.test(layout));

const tasksInbox = read("app/dashboard/tasks-inbox/page.tsx");
pass("Account Manager task inbox is client-scoped", tasksInbox.includes("clients.accountManagerId") && tasksInbox.includes("inArray(creativeTasks.clientId"));
pass("Task inbox bulk writes are client-scoped", tasksInbox.includes("scopeCondition") && tasksInbox.includes("ownedIds"));

const actions = read("lib/actions/index.ts");
pass("Notification delete is owner scoped", /deleteNotification[\s\S]*notifications\.userId/.test(actions));
pass("Task create stores creator ownership", /createdById:\s*session\.user\.id/.test(actions));
pass("Task mutations check access", /taskForAccess/.test(actions) && /requireClientAccess/.test(actions));

const bulkApi = read("app/api/bulk/route.ts");
pass("Bulk API has explicit task status allowlist", bulkApi.includes("TASK_STATUSES") && bulkApi.includes("Invalid task IDs or status"));
pass("Bulk task writes scope Account Managers", bulkApi.includes("managedClientIds") && bulkApi.includes("inArray(creativeTasks.clientId,owned)"));

const monthlySummary = read("app/api/monthly-summary/[clientId]/route.ts");
pass("Monthly summary validates client access", monthlySummary.includes("canAccessClient"));
pass("Monthly summary validates report period", monthlySummary.includes("month<1||month>12") && monthlySummary.includes("year<2020||year>2100"));

const pdfReport = read("app/api/pdf-report/[clientId]/route.ts");
pass("PDF report validates client access", pdfReport.includes("canAccessClient"));

const media = read("app/dashboard/media/page.tsx");
pass("Media metric writes validate client ownership", media.includes("Invalid client or platform") && media.includes("Forbidden"));

const health = read("app/api/health/route.ts");
const packageVersion = JSON.parse(read("package.json")).version;
pass("Health reports package version", health.includes(`\"${packageVersion}\"`));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failures.length}/${checks.length} static QA checks passed.`);
if (failures.length) process.exit(1);
