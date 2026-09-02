import fs from 'node:fs';
import path from 'node:path';
const read=(p)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const pages=['app/group/page.tsx','app/group/hospitality/page.tsx','app/group/tech/page.tsx'];
for(const page of pages){const body=read(page);if(!body.includes('clamp('))throw new Error(`Responsive typography missing: ${page}`);if(!body.includes('flexWrap')&&!body.includes('auto-fit'))throw new Error(`Responsive layout contract missing: ${page}`)}
const group=read('app/group/page.tsx');
if(!group.includes('repeat(auto-fit,minmax('))throw new Error('Business selector responsive grid missing');
console.log('responsive-shell: group, hospitality and tech shell contracts verified');
