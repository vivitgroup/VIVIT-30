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
const accountsPaymentRule = proxy.match(/\["\/dashboard\/clients\/accounts-payment",\s*\[([^\]]+)\]\]/)?.[1] ?? "";
pass("Accounts Payment has a specific proxy rule", accountsPaymentRule.length > 0);
pass("Media Buyer cannot access Accounts Payment", accountsPaymentRule.length > 0 && !accountsPaymentRule.includes("MEDIA_BUYER"));
pass("Specific Accounts Payment rule precedes generic Clients rule", proxy.indexOf('"/dashboard/clients/accounts-payment"') < proxy.indexOf('"/dashboard/clients"'));

const calendar = read("components/calendar/CalendarClient.tsx");
pass("Scheduled posts require media", /assetFileId/.test(calendar) && /required/.test(calendar) && /disabled=\{saving\|\|uploading\|\|!assetFileId\}/.test(calendar));
pass("Scheduled posts accept images and video", /image\/\*,video\/\*/.test(calendar));

const filesApi = read("app/api/files/route.ts");
pass("Files support 100 MB", /100\s*\*\s*1024\s*\*\s*1024/.test(filesApi));
pass("File storage bucket self-heals", /ensureBucket/.test(filesApi));

const clientApi = read("app/api/clients/route.ts");
pass("Accountant can create clients", clientApi.includes('"ACCOUNTANT"'));
pass("Client creation remains role-gated", /SUPER_ADMIN/.test(clientApi) && /ACCOUNT_MANAGER/.test(clientApi));

const publicClientsApi = read("app/api/v1/clients/route.ts");
pass("Public clients API is workspace scoped", /eq\(clients\.workspaceId,\s*apiKey\.workspaceId\)/.test(publicClientsApi));
pass("Public clients API does not accept API keys in query strings", !/searchParams\.get\(["']api_key["']\)/.test(publicClientsApi));
pass("Public clients API does not advertise fake rate limits", !/X-RateLimit-Limit|X-RateLimit-Window/.test(publicClientsApi));

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

const reports = read("components/reports/ReportsClient.tsx");
pass("Reports render UI instead of raw endpoint navigation", reports.includes("fetch(") && !/window\.location\s*=\s*["'`]\/api\/reports/.test(reports));

const ai = read("app/api/ai/route.ts");
pass("AI requires a configured provider", ai.includes("AI provider is not configured") && !ai.includes("Smart draft (local mode)"));
pass("AI financial prompts use EGP", ai.includes(" EGP"));

const workspace = read("app/dashboard/workspace/page.tsx");
pass("Legacy workspace routes to settings", workspace.includes("/dashboard/settings#integrations"));

const layout = read("app/layout.tsx");
pass("Mobile viewport is explicit", /device-width/.test(layout));

const publicFiles = fs.existsSync(path.join(root,"public")) ? walk("public") : [];
const demoAssets = publicFiles.filter(file => /demo|sample|mock/i.test(path.basename(file)));
pass("No demo assets ship in public", demoAssets.length === 0, demoAssets.join(", "));

const health = read("app/api/health/route.ts");
const packageVersion = JSON.parse(read("package.json")).version;
pass("Health reports package version", health.includes(`\"${packageVersion}\"`));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failures.length}/${checks.length} static QA checks passed.`);
if (failures.length) process.exit(1);
