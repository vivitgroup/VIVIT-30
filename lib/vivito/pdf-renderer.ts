import type {VivitoPdfSpec} from "./artifact-intelligence";

const A4=[595.28,841.89] as const;
const esc=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[\r\n]+/g," ");
const latinOnly=(s:string)=>!/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(s);
const num=(n:number)=>Number(n.toFixed(2));

type Obj={id:number;body:string|Uint8Array};
function joinBytes(parts:(string|Uint8Array)[]){const enc=new TextEncoder();const chunks=parts.map(p=>typeof p==="string"?enc.encode(p):p);const len=chunks.reduce((a,b)=>a+b.length,0),out=new Uint8Array(len);let off=0;for(const c of chunks){out.set(c,off);off+=c.length}return out}

export class VivitoPdfRenderError extends Error{status:number;constructor(message:string,status=422){super(message);this.status=status}}

export function renderVivitoPdf(spec:VivitoPdfSpec):Uint8Array{
 if(!spec?.title||!Array.isArray(spec.pages)||!spec.pages.length)throw new VivitoPdfRenderError("PDF spec requires a title and at least one page.",400);
 const allText=[spec.title,spec.subtitle||"",spec.author||"",...spec.pages.flatMap(p=>[p.title,p.eyebrow||"",p.footer||"",...p.blocks.map(b=>b.text)])].join(" ");
 if(!latinOnly(allText))throw new VivitoPdfRenderError("Arabic/RTL text requires an embedded Unicode font renderer. VIVITO refuses to export corrupted Arabic text.",422);
 if(spec.pages.length>60)throw new VivitoPdfRenderError("PDF page limit is 60 pages.",413);
 const objects:Obj[]=[];let id=1;const catalog=id++,pagesId=id++,fontReg=id++,fontBold=id++;
 objects.push({id:fontReg,body:"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"},{id:fontBold,body:"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"});
 const pageIds:number[]=[];
 const accent=spec.theme?.accent||[0.12,0.22,0.42];
 for(let pi=0;pi<spec.pages.length;pi++){
  const p=spec.pages[pi],pageId=id++,contentId=id++;pageIds.push(pageId);
  const dark=!!spec.theme?.dark;const bg=dark?[0.055,0.065,0.08]:[1,1,1],fg=dark?[0.96,0.97,0.98]:[0.08,0.1,0.13],muted=dark?[0.68,0.72,0.78]:[0.4,0.45,0.52];
  const cmds:string[]=[`${bg.join(" ")} rg 0 0 ${A4[0]} ${A4[1]} re f`,`${accent.join(" ")} rg 0 ${A4[1]-8} ${A4[0]} 8 re f`];
  let y=A4[1]-54;
  if(p.eyebrow){cmds.push(`BT /F2 8 Tf ${muted.join(" ")} rg 48 ${num(y)} Td (${esc(p.eyebrow.toUpperCase())}) Tj ET`);y-=22}
  cmds.push(`BT /F2 23 Tf ${fg.join(" ")} rg 48 ${num(y)} Td (${esc(p.title)}) Tj ET`);y-=32;
  cmds.push(`${accent.join(" ")} RG 1.2 w 48 ${num(y+8)} m 547 ${num(y+8)} l S`);y-=12;
  for(const b of p.blocks.slice(0,24)){
   if(y<72)break;
   if(b.type==="metric") {cmds.push(`BT /F2 28 Tf ${accent.join(" ")} rg 48 ${num(y)} Td (${esc(b.text)}) Tj ET`);y-=42;continue}
   if(b.type==="callout"){cmds.push(`${dark?"0.10 0.12 0.16":"0.95 0.97 1"} rg 48 ${num(y-30)} 499 44 re f`,`BT /F2 11 Tf ${fg.join(" ")} rg 60 ${num(y-8)} Td (${esc(b.text.slice(0,92))}) Tj ET`);y-=58;continue}
   const size=b.type==="subtitle"?14:b.type==="title"?16:10.5,font=b.type==="title"||b.type==="subtitle"?"F2":"F1";
   const prefix=b.type==="bullet"?"• ":"";const max=96,words=(prefix+b.text).split(/\s+/);let line="";const lines:string[]=[];for(const w of words){if((line+" "+w).trim().length>max){lines.push(line.trim());line=w}else line=(line+" "+w).trim()}if(line)lines.push(line);
   for(const ln of lines.slice(0,5)){cmds.push(`BT /${font} ${size} Tf ${b.type==="body"||b.type==="bullet"?muted.join(" "):fg.join(" ")} rg 48 ${num(y)} Td (${esc(ln)}) Tj ET`);y-=size*1.45;if(y<72)break}y-=6;
  }
  const foot=p.footer||`${spec.title}  •  ${pi+1}/${spec.pages.length}`;cmds.push(`BT /F1 7.5 Tf ${muted.join(" ")} rg 48 34 Td (${esc(foot)}) Tj ET`);
  const stream=cmds.join("\n");objects.push({id:contentId,body:`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`},{id:pageId,body:`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`});
 }
 objects.push({id:pagesId,body:`<< /Type /Pages /Kids [${pageIds.map(x=>`${x} 0 R`).join(" ")}] /Count ${pageIds.length} >>`},{id:catalog,body:`<< /Type /Catalog /Pages ${pagesId} 0 R >>`});
 objects.sort((a,b)=>a.id-b.id);const header="%PDF-1.4\n%VIVITO\n";const chunks:(string|Uint8Array)[]=[header];const offsets:number[]=[0];let current=new TextEncoder().encode(header).length;
 for(const o of objects){offsets[o.id]=current;const pre=`${o.id} 0 obj\n`,post="\nendobj\n";chunks.push(pre,o.body,post);current+=new TextEncoder().encode(pre).length+(typeof o.body==="string"?new TextEncoder().encode(o.body).length:o.body.length)+new TextEncoder().encode(post).length}
 const xref=current,maxId=Math.max(...objects.map(o=>o.id));let table=`xref\n0 ${maxId+1}\n0000000000 65535 f \n`;for(let i=1;i<=maxId;i++)table+=`${String(offsets[i]||0).padStart(10,"0")} 00000 n \n`;table+=`trailer\n<< /Size ${maxId+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 chunks.push(table);return joinBytes(chunks)
}
