import fs from 'node:fs';
import path from 'node:path';

const ROOTS=['app/api','app/dashboard','lib'];
const files=[];
for(const root of ROOTS){if(!fs.existsSync(root))continue;const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs)$/.test(ent.name))files.push(p)}};walk(root)}

const findings=[];
const add=(sev,domain,file,msg,evidence='')=>findings.push({sev,domain,file,msg,evidence});
const writeRe=/\b(?:db|tx)\.(?:insert|update|delete)\s*\(/g;
const directStatusFromRequest=/(?:status|stage|state)\s*:\s*(?:body|data|payload|input|json)\.(?:status|stage|state)\b/;
const reqNumber=/Number\s*\(\s*(?:body|data|payload|input|json|fd\.get\([^)]*\))/g;
const rawUpdateWhere=/\.update\([^)]*\)[\s\S]{0,700}?\.where\(([^;]+)\)/g;
const rawDeleteWhere=/\.delete\([^)]*\)[\s\S]{0,700}?\.where\(([^;]+)\)/g;
const highRiskHints=/(finance|payment|invoice|expense|payroll|salary|contract|client|lead|task|campaign|media|archive|approve|reject|delete|bulk)/i;
const auditHint=/(auditLogs|audit_log|audit trail|logAction|activityLog|eventLog)/i;

function matchBrace(source,open){let depth=0,quote=null,escape=false;for(let i=open;i<source.length;i++){const c=source[i];if(quote){if(escape){escape=false;continue}if(c==='\\'){escape=true;continue}if(c===quote)quote=null;continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return i}}return source.length-1}
function functionsOf(source){
  const out=[];
  const re=/(?:export\s+)?async\s+function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{|(?:export\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g;
  for(const m of source.matchAll(re)){const name=m[1]||m[2]||'anonymous',open=(m.index??0)+m[0].lastIndexOf('{'),close=matchBrace(source,open);out.push({name,body:source.slice(open+1,close),start:m.index??0,end:close+1})}
  return out;
}

for(const file of files){
  const s=fs.readFileSync(file,'utf8');
  const funcs=functionsOf(s);
  const businessCritical=highRiskHints.test(file+s);
  const mutationFuncs=funcs.filter(f=>['POST','PUT','PATCH','DELETE'].includes(f.name)||/"use server"|'use server'/.test(f.body));

  for(const fn of mutationFuncs){
    const body=fn.body,writes=[...body.matchAll(writeRe)].length,hasTx=/\bdb\.transaction\s*\(/.test(body);
    if(writes>=2&&!hasTx&&highRiskHints.test(file+fn.name+body))add('HIGH','atomicity',file,`${fn.name} performs ${writes} database writes without an obvious transaction`,fn.name);
    if(directStatusFromRequest.test(body))add('HIGH','state-machine',file,`${fn.name} appears to write status/stage/state directly from request data`,fn.name);
    if(businessCritical&&writes>0&&!auditHint.test(body)&&/(approve|reject|paid|payment|invoice|expense|payroll|archive|delete|status|stage|assign)/i.test(body))add('MED','auditability',file,`${fn.name} is a sensitive business mutation with no obvious audit-trail write`,fn.name);
    if(reqNumber.test(body)&&!/(Number\.isFinite|Number\.isInteger|\.min\(|>=\s*0|>\s*0|Math\.max)/.test(body))add('MED','numeric-validation',file,`${fn.name} converts request-derived numeric data without obvious finite/range validation`,fn.name);
    if(/(invoice|payment|expense|lead|client|task|campaign)/i.test(file+body)&&/\.insert\s*\(/.test(body)&&!/duplicate|idempot|unique|onConflict|existing|already exists|already processed/i.test(body))add('LOW','duplicate-control',file,`${fn.name} has a create-like mutation with no obvious duplicate/idempotency guard`,fn.name);
    if(/(paid|approve|reject|archive|complete|completed|cancel|close|won|lost)/i.test(body)&&!/transition|allowed|can[A-Z]|state machine|validStatus|allowedStatus|includes\(/i.test(body))add('LOW','transition-guard',file,`${fn.name} changes a business-significant state with no obvious transition guard`,fn.name);
  }

  for(const m of s.matchAll(rawUpdateWhere)){const where=m[1]||'';if(businessCritical&&!/workspaceId|workspace_id|tenantId|tenant_id/.test(where))add('MED','tenant-scope',file,'update WHERE clause may not explicitly include workspace/tenant scope',where.slice(0,180))}
  for(const m of s.matchAll(rawDeleteWhere)){const where=m[1]||'';if(businessCritical&&!/workspaceId|workspace_id|tenantId|tenant_id/.test(where))add('MED','tenant-scope',file,'delete WHERE clause may not explicitly include workspace/tenant scope',where.slice(0,180))}
}

const requiredScripts=[['clients','scripts/qa-clients.mjs'],['task archive','scripts/qa-tasks-archive.mjs'],['finance reports','scripts/qa-finance-reports.mjs'],['finance recurring','scripts/qa-finance-recurring.mjs'],['data integrity','scripts/qa-data-integrity.mjs'],['hr/payroll','scripts/qa-hr-payroll.mjs'],['sales lifecycle','scripts/qa-sales-lifecycle.mjs'],['operations security','scripts/qa-operations-security.mjs'],['RBAC/security','scripts/qa-rbac-security.mjs'],['VIVITO actions','scripts/qa-vivito-actions.mjs']];
for(const [name,p] of requiredScripts)if(!fs.existsSync(p))add('HIGH','coverage',p,`required ${name} business regression suite is missing`);

const counts={HIGH:0,MED:0,LOW:0};for(const f of findings)counts[f.sev]++;
console.log(`Business Logic Hardcore Audit scanned ${files.length} source files.`);
console.log(`Findings: HIGH ${counts.HIGH} | MED ${counts.MED} | LOW ${counts.LOW}`);
for(const sev of ['HIGH','MED','LOW']){const group=findings.filter(f=>f.sev===sev);console.log(`\n${sev} (${group.length})`);for(const f of group.slice(0,160))console.log(`${f.domain.padEnd(20)} ${f.file} :: ${f.msg}${f.evidence?` :: ${f.evidence}`:''}`);if(group.length>160)console.log(`... ${group.length-160} more`)}
if(counts.HIGH)process.exit(2);
