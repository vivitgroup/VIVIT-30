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

const middleware = read("middleware.ts");
for (const route of ["/dashboard/revenue-attribution", "/dashboard/nps", "/dashboard/onboarding", "/dashboard/monthly-reports", "/dashboard/marketplace", "/dashboard/budget"]) {
  pass(`Middleware protects ${route}`, middleware.includes(route));
}

const calendar = read("components/calendar/CalendarClient.tsx");
pass("Scheduled posts require media", /assetFileId/.test(calendar) && /required/.test(calendar) && /disabled=\{saving\|\|uploading\|\|!assetFileId\}/.test(calendar));
pass("Scheduled posts accept images and video", /image\/\*,video\/\*/.test(calendar));

const filesApi = read("app/api/files/route.ts");
pass("Files support 100 MB", /100\s*\*\s*1024\s*\*\s*1024/.test(filesApi));
pass("File storage bucket self-heals", /ensureBucket/.test(filesApi));

const clientApi = read("app/api/clients/route.ts");
pass("Accountant can create clients", clientApi.includes('"ACCOUNTANT"'));
pass("Client creation remains role-gated", /SUPER_ADMIN/.test(clientApi) && /ACCOUNT_MANAGER/.test(clientApi));

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
