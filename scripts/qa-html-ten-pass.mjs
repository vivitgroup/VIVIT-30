// Ten-pass HTML/JSX/CSS regression audit for dashboard UI hardening.
import fs from 'node:fs';
import path from 'node:path';

const roots=['app','components'];
const files=[];
for(const root of roots){
  const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p);else if(/\.(tsx|jsx|css)$/.test(ent.name))files.push(p)}};
  walk(root);
}
const findings=[];
const add=(sev,pass,file,msg)=>findings.push({sev,pass,file,msg});
for(const file of files){
  const s=fs.readFileSync(file,'utf8');
  if(/<img\b(?![^>]*\balt=)[^>]*>/g.test(s)) add('HIGH',1,file,'img without alt');
  if(/target=["']_blank["'](?![^>]*\brel=)/g.test(s)) add('HIGH',2,file,'target=_blank without rel');
  if(/<(div|span)\b[^>]*onClick=/.test(s)&&!/(role=|tabIndex=)/.test(s)) add('MED',3,file,'clickable div/span may lack keyboard semantics');
  if(/<button\b(?![^>]*\btype=)/g.test(s)) add('LOW',4,file,'button without explicit type');
  if(/outline\s*:\s*none/.test(s)&&!/:focus-visible/.test(s)) add('MED',5,file,'outline removed without local focus-visible');
  if(/font-size\s*:\s*(?:[0-8](?:\.\d+)?)px/.test(s)) add('MED',6,file,'very small text <=8px');
  if(/(?:width|height)\s*:\s*(?:[12]\d|3\d|4[0-3])px/.test(s)&&/(button|btn|icon|control|nav)/i.test(s)) add('MED',7,file,'possible touch target below 44px');
  if(/position\s*:\s*fixed/.test(s)&&!/(safe-area-inset|100dvh|calc\()/i.test(s)&&/mobile|nav|panel|drawer|fab/i.test(file+s)) add('LOW',8,file,'fixed UI lacks obvious safe-area/dvh handling');
  if(/overflow\s*:\s*hidden/.test(s)&&/(table|calendar|grid|board)/i.test(file+s)&&!/overflow-x\s*:\s*auto/.test(s)) add('LOW',9,file,'dense content may clip instead of scroll');
  if(/aria-hidden=\{!?open\}/.test(s)&&!/(inert|tabIndex=\{-1\})/.test(s)) add('MED',10,file,'hidden interactive region may remain focusable');
}
const high=findings.filter(x=>x.sev==='HIGH');
const med=findings.filter(x=>x.sev==='MED');
console.log(`Scanned ${files.length} TSX/JSX/CSS files across 10 passes.`);
for(let p=1;p<=10;p++){
  const f=findings.filter(x=>x.pass===p);
  console.log(`\nPASS ${p}: ${f.length} finding(s)`);
  for(const x of f.slice(0,80)) console.log(`${x.sev.padEnd(4)} ${x.file} :: ${x.msg}`);
  if(f.length>80) console.log(`... ${f.length-80} more`);
}
console.log(`\nTOTAL ${findings.length}; HIGH ${high.length}; MED ${med.length}; LOW ${findings.length-high.length-med.length}`);
if(high.length) process.exit(2);
