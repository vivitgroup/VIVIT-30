import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests",
 timeout:30000,
 expect:{timeout:7000},
 fullyParallel:false,
 workers:1,
 retries:0,
 reporter:[["line"]],
 outputDir:"test-results/enterprise-e2e",
 use:{baseURL:process.env.E2E_BASE_URL||"http://127.0.0.1:3000",trace:"retain-on-failure",screenshot:"only-on-failure",video:"retain-on-failure"},
 projects:[
  {name:"chromium",use:{...devices["Desktop Chrome"]}},
  {name:"webkit",use:{...devices["Desktop Safari"]}},
  {name:"mobile-webkit",use:{...devices["iPhone 13"]}},
 ],
});
