import fs from 'node:fs';
const src=fs.readFileSync(new URL('./vivito-all-roles-live-exam.mjs',import.meta.url),'utf8');
const roles=`const roles={
 SUPER_ADMIN:{email:'vivito-live-audit-admin-0831@example.invalid',password:'ShCGMeuvr4qvx2X7bDTDFv1-_2pZ'},
 ACCOUNT_MANAGER:{email:'vivito-live-audit-am-0831@example.invalid',password:'12XZf5-el3DPqcGpiFvBY7ZB0q5W'},
 MEDIA_BUYER:{email:'vivito-live-audit-mb-0831@example.invalid',password:'A-UOlY1QPiCYKmeFIHY0mY91y1aZ'},
 CREATOR:{email:'vivito-live-audit-creator-0831@example.invalid',password:'MNKwu9Sz0yPJiF13Ltqstxum_mun'},
 ACCOUNTANT:{email:'vivito-live-audit-accountant-0831@example.invalid',password:'MB1_mC7Z8UO_APzcr9KBzm71NIeB'},
 SALES:{email:'vivito-live-audit-sales-0831@example.invalid',password:'ojER9aC-9KdGXWZxrztz1MMqCavw'},
 CLIENT:{email:'vivito-live-audit-client-0831@example.invalid',password:'JKVWPN0KvfaC-1pwiGF3Ln7Lp_jW'}
};`;
const patched=src.replace(/const roles=\{[\s\S]*?\n\};\nconst allOps=/,roles+'\nconst allOps=');
const tmp=new URL('./.vivito-live-audit-temp.mjs',import.meta.url);fs.writeFileSync(tmp,patched);await import(tmp.href);