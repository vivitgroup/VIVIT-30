import { chromium, firefox, webkit } from '@playwright/test';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000';
const engines = { chromium, firefox, webkit };
const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const failures = [];
const pass = (name) => console.log(`PASS  ${name}`);
const fail = (name, error) => { failures.push(name); console.error(`FAIL  ${name}: ${error instanceof Error ? error.message : String(error)}`); };

for (const [engineName, launcher] of Object.entries(engines)) {
  const browser = await launcher.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const prefix = `${engineName}/${viewportName}`;
      try {
        const response = await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (!response || response.status() >= 500) throw new Error(`login returned ${response?.status() ?? 'no response'}`);
        pass(`${prefix} login renders without server error`);

        const bodyBox = await page.locator('body').boundingBox();
        if (!bodyBox || bodyBox.width > viewport.width + 2) throw new Error(`body width ${bodyBox?.width} exceeds viewport ${viewport.width}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 2) throw new Error(`horizontal overflow ${overflow}px`);
        pass(`${prefix} login has no page-level horizontal overflow`);

        const protectedResponse = await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (!protectedResponse || protectedResponse.status() >= 500) throw new Error(`dashboard returned ${protectedResponse?.status() ?? 'no response'}`);
        const finalUrl = page.url();
        if (!finalUrl.includes('/login')) throw new Error(`anonymous protected route did not redirect to login: ${finalUrl}`);
        pass(`${prefix} anonymous dashboard redirects safely to login`);

        if (viewportName === 'mobile') {
          const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content').catch(() => null);
          if (!viewportMeta || !/width=device-width/i.test(viewportMeta)) throw new Error('missing device-width viewport metadata');
          pass(`${prefix} viewport metadata is mobile-safe`);
        }
      } catch (error) {
        fail(prefix, error);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

if (failures.length) {
  console.error(`\nStage 12 browser E2E failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nStage 12 browser E2E: Chromium + Firefox + WebKit passed on desktop and mobile viewports.');
