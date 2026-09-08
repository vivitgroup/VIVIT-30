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

test("mobile authenticated shell keeps navigation usable",async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await login(page,"e2e.creator@vivit.local");
 await certifyPage(page,"/dashboard/creative");
 const menu=page.getByRole("button",{name:/Open full menu/i});
 await expect(menu).toBeVisible();await menu.click();
 await expect(page.getByRole("dialog",{name:"Full navigation"})).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(page.getByRole("dialog",{name:"Full navigation"})).not.toBeVisible();
 await context.close();
});
