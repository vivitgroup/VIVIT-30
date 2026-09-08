import {test,expect} from "@playwright/test";

const password=process.env.E2E_PASSWORD||"";
const base=process.env.E2E_BASE_URL||"http://127.0.0.1:3000";
const matrix=[
 {role:"SUPER_ADMIN",email:"e2e.super@vivit.local",routes:["/dashboard","/dashboard/universe","/dashboard/media/control-center","/dashboard/creative","/dashboard/finance","/dashboard/analytics","/dashboard/ai-studio","/dashboard/settings"]},
 {role:"ACCOUNT_MANAGER",email:"e2e.account@vivit.local",routes:["/dashboard/universe","/dashboard/media/control-center","/dashboard/creative","/dashboard/calendar","/dashboard/reports","/dashboard/ai-studio","/dashboard/files","/dashboard/settings"]},
 {role:"MEDIA_BUYER",email:"e2e.media@vivit.local",routes:["/dashboard/universe","/dashboard/media/control-center","/dashboard/media/sync","/dashboard/creative","/dashboard/calendar","/dashboard/ai-studio","/dashboard/files","/dashboard/settings"]},
 {role:"CREATOR",email:"e2e.creator@vivit.local",routes:["/dashboard/creative","/dashboard/calendar","/dashboard/ai-studio","/dashboard/files","/dashboard/notifications","/dashboard/settings"]},
 {role:"ACCOUNTANT",email:"e2e.accountant@vivit.local",routes:["/dashboard/clients","/dashboard/finance","/dashboard/clients/accounts-payment","/dashboard/contracts","/dashboard/forecast","/dashboard/reports","/dashboard/files","/dashboard/settings"]},
 {role:"SALES",email:"e2e.sales@vivit.local",routes:["/dashboard/sales","/dashboard/whatsapp","/dashboard/calendar","/dashboard/reports","/dashboard/ai-studio","/dashboard/files","/dashboard/settings"]},
 {role:"CLIENT",email:"e2e.client@vivit.local",routes:["/dashboard/portal","/dashboard/calendar","/dashboard/ai-studio","/dashboard/files","/dashboard/notifications","/dashboard/settings"]},
];

async function login(page,email){
 await page.goto(`${base}/login`,{waitUntil:"domcontentloaded"});
 await page.getByLabel("Email address").fill(email);
 await page.getByLabel("Password").fill(password);
 await page.getByRole("button",{name:/Enter Marketing/i}).click();
 await page.waitForURL(url=>url.pathname.startsWith("/apps")||url.pathname.startsWith("/dashboard"),{timeout:15000});
 await expect(page).not.toHaveURL(/\/login/);
}
async function certifyPage(page,route){
 const response=await page.goto(`${base}${route}`,{waitUntil:"domcontentloaded",timeout:20000});
 expect(response?.status()??200,`${route} should not return 5xx`).toBeLessThan(500);
 await expect(page).not.toHaveURL(/\/login/);
 await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
 await expect(page.locator("main")).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow,`${route} must not cause page-level horizontal overflow`).toBeLessThanOrEqual(4);
}

test.describe.configure({mode:"serial"});
for(const entry of matrix){
 test(`${entry.role} authenticates and renders its core workspace`,async({page})=>{
  await login(page,entry.email);
  for(const route of entry.routes)await certifyPage(page,route);
 });
}

test("settings persist Arabic RTL and return cleanly to English",async({page})=>{
 await login(page,"e2e.super@vivit.local");
 await certifyPage(page,"/dashboard/settings");
 const language=page.getByLabel("Language");
 await language.selectOption("ar");
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
 await expect(page.locator(".app-main-shell")).toHaveAttribute("dir","rtl");
 expect(await page.evaluate(()=>localStorage.getItem("vivit-lang"))).toBe("ar");
 await page.reload({waitUntil:"domcontentloaded"});
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
 expect(await page.evaluate(()=>localStorage.getItem("vivit-lang"))).toBe("ar");
 await page.locator('select').filter({has:page.locator('option[value="ar"]')}).first().selectOption("en");
 await expect(page.locator("html")).toHaveAttribute("dir","ltr");
 expect(await page.evaluate(()=>localStorage.getItem("vivit-lang"))).toBe("en");
});

test("global search keyboard lifecycle traps and restores focus",async({page})=>{
 await login(page,"e2e.super@vivit.local");
 await certifyPage(page,"/dashboard");
 const trigger=page.getByRole("button",{name:"Open global search"});
 await trigger.focus();
 await page.keyboard.press("Control+k");
 const dialog=page.getByRole("dialog",{name:"Global search"});
 await expect(dialog).toBeVisible();
 await expect(page.getByLabel("Search clients, tasks, leads and more")).toBeFocused();
 await page.keyboard.press("Tab");
 await page.keyboard.press("Shift+Tab");
 await expect(page.getByLabel("Search clients, tasks, leads and more")).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(dialog).not.toBeVisible();
 await expect(trigger).toBeFocused();
});

test("Sales creates updates advances and archives a lead",async({page},testInfo)=>{
 await login(page,"e2e.sales@vivit.local");
 await certifyPage(page,"/dashboard/sales");
 const company=`E2E ${testInfo.project.name} Prospect`;
 const add=page.locator("#add form");
 await add.locator('input[name="companyName"]').fill(company);
 await add.locator('input[name="contactPerson"]').fill("Enterprise Buyer");
 await add.locator('input[name="phone"]').fill("+201000000001");
 await add.locator('input[name="email"]').fill(`buyer-${testInfo.project.name}@example.test`);
 await add.locator('input[name="estimatedValue"]').fill("42000");
 await add.locator('select[name="source"]').selectOption("REFERRAL");
 await add.locator('input[name="industry"]').fill("Technology");
 await add.locator('textarea[name="notes"]').fill("Created by isolated enterprise browser certification");
 await add.getByRole("button",{name:"Add to Pipeline"}).click();
 let card=page.locator(".lead-card").filter({hasText:company});
 await expect(card).toBeVisible({timeout:10000});
 await card.getByRole("button",{name:/Contacted/}).click();
 const contacted=page.locator(".stage").filter({hasText:"Contacted"}).locator(".lead-card").filter({hasText:company});
 await expect(contacted).toBeVisible({timeout:10000});
 card=contacted;
 await card.locator('input[name="phone"]').fill("+201000000099");
 await card.locator('textarea[name="notes"]').fill("E2E contact updated");
 await card.getByRole("button",{name:"Save Contact & Notes"}).click();
 await expect(page.locator(".lead-card").filter({hasText:company}).locator('input[name="phone"]')).toHaveValue("+201000000099");
 card=page.locator(".lead-card").filter({hasText:company});
 await card.getByRole("button",{name:"Archive Lead"}).click();
 await expect(page.locator(".lead-card").filter({hasText:company})).toHaveCount(0,{timeout:10000});
});

test("mobile authenticated shell keeps navigation usable",async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await login(page,"e2e.creator@vivit.local");
 await certifyPage(page,"/dashboard/creative");
 const menu=page.getByRole("button",{name:/Open full menu/i});
 await expect(menu).toBeVisible();await menu.click();
 const drawer=page.getByRole("dialog",{name:"Full navigation"});
 await expect(drawer).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(drawer).not.toBeVisible();
 await menu.click();
 await drawer.getByRole("link",{name:/Files/i}).click();
 await page.waitForURL(/\/dashboard\/files/);
 await expect(drawer).not.toBeVisible();
 await certifyPage(page,"/dashboard/files");
 await context.close();
});
