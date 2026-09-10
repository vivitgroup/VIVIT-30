import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

const password = process.env.E2E_PASSWORD || "";
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const fixturePath = process.env.E2E_USERS_FILE || "/tmp/vivit-e2e-users.json";

async function login(page, email) {
  await page.goto(`${base}/login`, { waitUntil: "load", timeout: 20000 });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  const pending = Promise.race([
    page.waitForResponse(response => response.url().includes("/api/auth/callback/credentials") && response.request().method() === "POST" && response.status() >= 200 && response.status() < 400, { timeout: 20000 }),
    page.waitForURL(url => url.pathname.startsWith("/apps") || url.pathname.startsWith("/dashboard"), { timeout: 20000 }),
  ]);
  await Promise.all([pending, page.getByRole("button", { name: /Enter Marketing/i }).click()]);
  await page.waitForURL(url => url.pathname.startsWith("/apps") || url.pathname.startsWith("/dashboard"), { timeout: 20000 });
  await expect(page).not.toHaveURL(/\/login/);
}

async function assertRouteDenied(page, route) {
  const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await page.waitForFunction(expected => location.pathname !== expected, route, { timeout: 10000 });
  await expect(page).not.toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\?)`));
}

async function mutateFixtureRole(email, role) {
  const raw = await fs.readFile(fixturePath, "utf8");
  const users = JSON.parse(raw);
  const user = users.find(entry => entry.email === email);
  if (!user) throw new Error(`Missing E2E fixture user: ${email}`);
  const previous = user.role;
  user.role = role;
  await fs.writeFile(fixturePath, JSON.stringify(users), "utf8");
  return async () => {
    const latest = JSON.parse(await fs.readFile(fixturePath, "utf8"));
    const target = latest.find(entry => entry.email === email);
    if (target) target.role = previous;
    await fs.writeFile(fixturePath, JSON.stringify(latest), "utf8");
  };
}

test.describe.configure({ mode: "serial" });

test("unauthenticated role and workspace headers cannot create a privileged session", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-user-role": "SUPER_ADMIN",
      "x-vivit-role": "SUPER_ADMIN",
      "x-workspace-role": "SUPER_ADMIN",
      "x-workspace-id": "e2e-workspace",
    },
  });
  const page = await context.newPage();
  await page.goto(`${base}/dashboard/finance`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForURL(/\/login(?:$|\?)/, { timeout: 10000 });
  await expect(page).toHaveURL(/\/login(?:$|\?)/);
  await context.close();
});

test("creator cannot escalate through role headers or role query parameters", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-user-role": "SUPER_ADMIN",
      "x-vivit-role": "SUPER_ADMIN",
      "x-workspace-role": "SUPER_ADMIN",
    },
  });
  const page = await context.newPage();
  await login(page, "e2e.creator@vivit.local");
  await assertRouteDenied(page, "/dashboard/finance");
  await page.goto(`${base}/dashboard/finance?role=SUPER_ADMIN&workspaceId=e2e-workspace`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await expect(page).not.toHaveURL(/\/dashboard\/finance(?:$|\?)/);
  await context.close();
});

test("client cannot escalate into sales through spoofed identity headers", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-user-role": "SALES",
      "x-vivit-role": "SALES",
      "x-workspace-role": "SALES",
      "x-user-id": "e2e-sales",
    },
  });
  const page = await context.newPage();
  await login(page, "e2e.client@vivit.local");
  await assertRouteDenied(page, "/dashboard/sales");
  await context.close();
});

test("a valid session fails closed when its live role becomes unknown", async ({ page }) => {
  const email = "e2e.creator@vivit.local";
  await login(page, email);
  await page.goto(`${base}/dashboard/creative`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await expect(page).not.toHaveURL(/\/login/);
  const restore = await mutateFixtureRole(email, "LEGACY_ADMIN");
  try {
    const sessionResponse = await page.request.get(`${base}/api/auth/session`);
    expect(sessionResponse.status()).toBe(200);
    const session = await sessionResponse.json();
    expect(session?.user?.authValid).toBe(false);
    expect(session?.user?.role ?? null).toBeNull();
    await page.goto(`${base}/dashboard/creative`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForURL(/\/login\?reason=session_revoked/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login\?reason=session_revoked/);
  } finally {
    await restore();
  }
});
