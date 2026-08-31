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

for(const file of files){
  const s=fs.readFileSync(file,'utf8');
  const lower=file.toLowerCase();
  const isMutation=/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b|"use server"|'use server'/.test(s);
  const writes=[...s.matchAll(writeRe)].length;
  const hasTx=/\bdb\.transaction\s*\(/.test(s);
  const businessCritical=highRiskHints.test(file+s);

  if(isMutation&&writes>=2&&!hasTx&&businessCritical) add('HIGH','atomicity',file,`business mutation performs ${writes} database writes without an obvious transaction`);

  if(isMutation&&directStatusFromRequest.test(s)) add('HIGH','state-machine',file,'status/stage/state appears to be written directly from request data without an explicit transition map');

  if(isMutation&&businessCritical&&writes>0&&!auditHint.test(s)&&/(approve|reject|paid|payment|invoice|expense|payroll|archive|delete|status|stage|assign)/i.test(s)) add('MED','auditability',file,'sensitive business mutation has no obvious audit-trail write');

  if(isMutation&&reqNumber.test(s)&&!/(Number\.isFinite|Number\.isInteger|\.min\(|>=\s*0|>\s*0|Math\.max)/.test(s)) add('MED','numeric-validation',file,'request-derived numeric conversion found without obvious finite/range validation');

  for(const m of s.matchAll(rawUpdateWhere)){
    const where=m[1]||'';
    if(businessCritical&&!/workspaceId|workspace_id|tenantId|tenant_id/.test(where)) add('MED','tenant-scope',file,'update WHERE clause may not explicitly include workspace/tenant scope',where.slice(0,180));
  }
  for(const m of s.matchAll(rawDeleteWhere)){
    const where=m[1]||'';
    if(businessCritical&&!/workspaceId|workspace_id|tenantId|tenant_id/.test(where)) add('MED','tenant-scope',file,'delete WHERE clause may not explicitly include workspace/tenant scope',where.slice(0,180));
  }

  if(isMutation&&/(invoice|payment|expense|lead|client|task|campaign)/i.test(file+s)&&/\.insert\s*\(/.test(s)&&!/duplicate|idempot|unique|onConflict|existing|already exists|already processed/i.test(s)) add('LOW','duplicate-control',file,'create-like business mutation has no obvious duplicate/idempotency guard in the same module');

  if(isMutation&&/(paid|approve|reject|archive|complete|completed|cancel|close|won|lost)/i.test(s)&&!/transition|allowed|can[A-Z]|state machine|validStatus|allowedStatus|includes\(/i.test(s)) add('LOW','transition-guard',file,'terminal/business-significant state mutation has no obvious explicit transition guard');
}

// Cross-domain invariants expected in this ERP. These are presence checks, not regex guesses.
const requiredScripts=[
  ['clients','scripts/qa-clients.mjs'],
  ['task archive','scripts/qa-tasks-archive.mjs'],
  ['finance reports','scripts/qa-finance-reports.mjs'],
  ['finance recurring','scripts/qa-finance-recurring.mjs'],
  ['data integrity','scripts/qa-data-integrity.mjs'],
  ['hr/payroll','scripts/qa-hr-payroll.mjs'],
  ['sales lifecycle','scripts/qa-sales-lifecycle.mjs'],
  ['operations security','scripts/qa-operations-security.mjs'],
  ['RBAC/security','scripts/qa-rbac-security.mjs'],
  ['VIVITO actions','scripts/qa-vivito-actions.mjs']
];
for(const [name,p] of requiredScripts)if(!fs.existsSync(p))add('HIGH','coverage',p,`required ${name} business regression suite is missing`);

const counts={HIGH:0,MED:0,LOW:0};for(const f of findings)counts[f.sev]++;
console.log(`Business Logic Hardcore Audit scanned ${files.length} source files.`);
console.log(`Findings: HIGH ${counts.HIGH} | MED ${counts.MED} | LOW ${counts.LOW}`);
for(const sev of ['HIGH','MED','LOW']){
  const group=findings.filter(f=>f.sev===sev);
  console.log(`\n${sev} (${group.length})`);
  for(const f of group.slice(0,120)) console.log(`${f.domain.padEnd(20)} ${f.file} :: ${f.msg}${f.evidence?` :: ${f.evidence}`:''}`);
  if(group.length>120)console.log(`... ${group.length-120} more`);
}
if(counts.HIGH)process.exit(2);
