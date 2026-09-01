import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok)=>{checks.push({name,ok});console.log(`${ok?'✅':'❌'} ${name}`)};

const cron=read('app/api/cron/route.ts');
const competitive=read('app/api/cron/competitive-intelligence/route.ts');
const mediaSync=read('app/api/cron/media-sync/route.ts');
const health=read('app/api/health/route.ts');
const db=read('lib/db.ts');
const proxy=read('proxy.ts');

check('Cron edge gate protects every /api/cron route', /pathname\.startsWith\(["']\/api\/cron["']\)/.test(proxy)&&/!expected\|\|secret!==expected/.test(proxy)&&!/searchParams\.get\(["']secret["']\)/.test(proxy));
check('Competitive cron never accepts secrets from query strings', !/searchParams\.get\(["']secret["']\)/.test(competitive));
check('Main cron is protected even if its legacy inner fallback remains', !/searchParams\.get\(["']secret["']\)/.test(cron)||(/pathname\.startsWith\(["']\/api\/cron["']\)/.test(proxy)&&/!expected\|\|secret!==expected/.test(proxy)));
check('Media sync requires configured CRON_SECRET', /!expected\|\|bearer!==expected/.test(mediaSync));
check('Media sync retries rate-limited provider calls', /attempt<3/.test(mediaSync)&&/isRateLimit/.test(mediaSync)&&/Math\.pow\(2,attempt\)/.test(mediaSync));
check('Media sync serializes campaign persistence', /pg_advisory_xact_lock/.test(mediaSync)&&/db\.transaction/.test(mediaSync));
check('Health check failure response is generic', /status:\s*["']degraded["']/.test(health)&&!/error\.message/.test(health));
check('Health endpoint disables shared caching', /["']Cache-Control["']\s*:\s*["']no-store["']/.test(health));
check('Database connections have a connect timeout', /connect_timeout:\s*10/.test(db));
check('Database statements have a timeout', /statement_timeout:\s*8000/.test(db));
check('Serverless DB pool is bounded', /max:\s*3/.test(db));

const failed=checks.filter(x=>!x.ok);
console.log(`\nReliability source contracts: ${checks.length-failed.length}/${checks.length} passed`);
if(failed.length){console.error(`Failed: ${failed.map(x=>x.name).join('; ')}`);process.exit(1)}
