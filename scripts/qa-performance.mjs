import fs from "node:fs";
import path from "node:path";

const read=(file)=>fs.readFileSync(file,"utf8").replace(/\s+/g," ");
const clients=read("app/api/clients/route.ts");
const media=read("app/api/media-control/route.ts");
const files=read("app/api/files/route.ts");
const notifications=read("app/api/notifications/poll/route.ts");

const checks=[
  ["Client list has an explicit hard cap",clients.includes("const CLIENT_LIST_LIMIT=250")&&clients.includes(".limit(CLIENT_LIST_LIMIT)")],
  ["Creator client-scope scan is bounded",clients.includes("const CREATOR_TASK_SCOPE_LIMIT=1000")&&clients.includes(".limit(CREATOR_TASK_SCOPE_LIMIT)")],
  ["Client API exposes its response cap",clients.includes("limit:CLIENT_LIST_LIMIT")],
  ["Media client scope is bounded",media.includes("const CLIENT_LIMIT=250")&&media.includes(".limit(CLIENT_LIMIT)")],
  ["Media campaigns are bounded",media.includes("const CAMPAIGN_LIMIT=500")&&media.includes(".limit(CAMPAIGN_LIMIT)")],
  ["Media connections are bounded",media.includes("const CONNECTION_LIMIT=500")&&media.includes(".limit(CONNECTION_LIMIT)")],
  ["Media performance window is time-bounded",media.includes("31*86400000")],
  ["Media performance rows are bounded",media.includes("const PERFORMANCE_LIMIT=5000")&&media.includes(".limit(PERFORMANCE_LIMIT)")],
  ["Media plans are bounded",media.includes("const PLAN_LIMIT=300")&&media.includes(".limit(PLAN_LIMIT)")],
  ["Media tracking rows are bounded",media.includes("const TRACKING_LIMIT=500")&&media.includes(".limit(TRACKING_LIMIT)")],
  ["Independent media datasets are loaded concurrently",media.includes("Promise.all([")],
  ["File listing is bounded",files.includes(".limit(150)")],
  ["File read signing is concurrent rather than serial",files.includes("Promise.all(list.map(async f")],
  ["Notification polling is bounded",notifications.includes(".limit(100)")],
  ["Notification polling disables shared caching",notifications.includes('"Cache-Control":"private, no-store"')],
];

let passed=0;
for(const [name,ok] of checks){if(ok){console.log(`✅ ${name}`);passed++;}else console.error(`❌ ${name}`);}
console.log(`\nPerformance source contracts: ${passed}/${checks.length} passed`);
if(passed!==checks.length)process.exit(1);

if(fs.existsSync(".next/static/chunks")){
  const js=[];
  const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith(".js"))js.push({path:p,size:fs.statSync(p).size});}};
  walk(".next/static/chunks");
  const total=js.reduce((n,f)=>n+f.size,0);
  const largest=js.sort((a,b)=>b.size-a.size)[0]??{path:"none",size:0};
  const mib=n=>(n/1024/1024).toFixed(2);
  console.log(`Largest static JS chunk: ${mib(largest.size)} MiB (${largest.path})`);
  console.log(`Total static JS chunks: ${mib(total)} MiB across ${js.length} files`);
  const largestOk=largest.size<=1.5*1024*1024;
  const totalOk=total<=10*1024*1024;
  console.log(`${largestOk?"✅":"❌"} Largest chunk <= 1.50 MiB`);
  console.log(`${totalOk?"✅":"❌"} Total static JS <= 10.00 MiB`);
  if(!largestOk||!totalOk)process.exit(1);
}
