import fs from 'node:fs';
import path from 'node:path';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok)=>{checks.push({name,ok});console.log(`${ok?'✅':'❌'} ${name}`)};

const activity=read('app/dashboard/activity/page.tsx');
const health=read('app/api/health/route.ts');
const cron=read('app/api/cron/route.ts');
const mediaSync=read('app/api/cron/media-sync/route.ts');
const proxy=read('proxy.ts');
const mediaControl=read('app/api/media-control/route.ts');

check('Activity audit log is workspace scoped', /where\(eq\(auditLogs\.workspaceId,workspaceId\)\)/.test(activity));
check('Activity user identity map is workspace scoped', /where\(eq\(users\.workspaceId,workspaceId\)\)/.test(activity));
check('Activity timeline is bounded', /limit\(200\)/.test(activity));
check('Health endpoint exposes healthy/degraded signal', /status:["']healthy["']/.test(health)&&/status:["']degraded["']/.test(health)&&/status:503/.test(health));
check('Health failures are cache-safe and do not expose raw error messages', /["']Cache-Control["']:["']no-store["']/.test(health)&&!/error\.message/.test(health));
check('Main cron exposes execution duration', /runtime_ms/.test(cron)&&/Date\.now\(\)\s*-\s*startTime/.test(cron));
check('Media sync exposes outcome counters', /synced/.test(mediaSync)&&/failed/.test(mediaSync)&&/alerts/.test(mediaSync)&&/at:new Date\(\)\.toISOString\(\)/.test(mediaSync));
check('Media sync persists bounded failure state for operators', /status:["']ERROR["']/.test(mediaSync)&&/syncError:/.test(mediaSync)&&/slice\(0,700\)/.test(mediaSync));
check('Critical media mutations write audit trail events', /auditLogs/.test(mediaControl)&&/campaign_linked/.test(mediaControl)&&/media_plan_/.test(mediaControl));
check('Cron edge authentication never reads secrets from query strings', !/searchParams\.get\(["']secret["']\)/.test(proxy)&&!/searchParams\.get\(["']secret["']\)/.test(cron));

const roots=['app','lib'];
const sensitiveLog=[];
const dynamicLogArgs=(args)=>args
  .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gs,'')
  .replace(/`([^`]*)`/gs,(_,body)=>[...body.matchAll(/\$\{([^}]*)\}/g)].map(m=>m[1]).join(' '));
const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs)$/.test(entry.name)){const src=read(p);for(const match of src.matchAll(/console\.(?:log|info|warn|error)\s*\(([^;]{0,500}?)\)/gs)){const args=dynamicLogArgs(match[1]);if(/\b(accessToken|refreshToken|authorization|apiKey|password|secret)\b/i.test(args))sensitiveLog.push(p)}}}};
for(const root of roots)if(fs.existsSync(root))walk(root);
check('Runtime logs do not directly print credentials or authorization material', sensitiveLog.length===0);
if(sensitiveLog.length)console.error(`Sensitive log candidates: ${[...new Set(sensitiveLog)].join(', ')}`);

const failed=checks.filter(x=>!x.ok);
console.log(`\nObservability source contracts: ${checks.length-failed.length}/${checks.length} passed`);
if(failed.length){console.error(`Failed: ${failed.map(x=>x.name).join('; ')}`);process.exit(1)}
