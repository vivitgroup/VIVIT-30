import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=[
  'docs/vivit-group/PRE-INTEGRATION-QA-EVIDENCE.md',
  'docs/vivit-group/HANDOVER.md',
  'docs/vivit-group/RELEASE-NOTES-PRE-INTEGRATION.md',
  'docs/vivit-group/FINAL-ACCEPTANCE-CHECKLIST.md',
  'docs/vivit-group/BACKUP-RESTORE-EVIDENCE.md',
  'docs/vivit-group/PRE-INTEGRATION-CTO-ACCEPTANCE.md',
  'docs/vivit-group/RELEASE-RUNBOOK.md',
];
for(const file of files){if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing handover artifact: ${file}`)}
const qa=read(files[0]);
for(const phrase of ['Status: PASS','Marketing integration is intentionally not executed','Negative inventory quantities = 0','Overpaid Tech installments = 0']){
  if(!qa.includes(phrase))throw new Error(`QA evidence incomplete: ${phrase}`);
}
const handover=read(files[1]);
for(const phrase of ['Security model','Data integrity','Final controlled change']){
  if(!handover.includes(phrase))throw new Error(`Handover incomplete: ${phrase}`);
}
const acceptance=read(files[3]);
if(!acceptance.includes('Execute Marketing integration only after explicit approval'))throw new Error('Final acceptance no longer keeps integration last');
if(!acceptance.includes('Mandatory post-integration validation'))throw new Error('Post-integration verification matrix missing');
console.log('handover: pre-integration QA, release notes, runbook and acceptance package verified');
