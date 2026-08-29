import fs from "node:fs";
import {createHash} from "node:crypto";
import {renderVivitoPdf} from "../lib/vivito/pdf-renderer";
import {renderVivitoPrintHtml,vivitoPdfNeedsPrintRenderer} from "../lib/vivito/print-renderer";
import {renderVivitoXlsx} from "../lib/vivito/xlsx-renderer";
import {contentPlanToWorkbook,type VivitoContentPlan,type VivitoPdfSpec} from "../lib/vivito/artifact-intelligence";
fs.mkdirSync('.vivito',{recursive:true});
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
let pdfCases=0,xlsxCases=0,arabicRtlPassed=true,structuralPassed=true;
let latinSample:Uint8Array|null=null,arabicSample='',xlsxSample:Uint8Array|null=null;
for(let i=0;i<20;i++){
 const spec:VivitoPdfSpec={title:`Certification Strategy ${i+1}`,pages:[{title:`Decision ${i+1}`,blocks:[{type:"metric",text:`${i+10}%`},{type:"body",text:"Evidence-led recommendation with owner, KPI and next action."}]}]};
 const b=renderVivitoPdf(spec);const head=new TextDecoder().decode(b.slice(0,5));if(head!=="%PDF-"||b.length<200) structuralPassed=false;else pdfCases++;if(i===0)latinSample=b;
}
for(let i=0;i<20;i++){
 const ar:VivitoPdfSpec={title:`استراتيجية ${i+1}`,pages:[{title:`قرار تنفيذي ${i+1}`,blocks:[{type:"callout",text:"توصية مبنية على الدليل"},{type:"chart",title:"الأداء",data:[{label:"وعي",value:30+i},{label:"تحويل",value:60+i}]},{type:"table",headers:["المحور","القرار"],rows:[["النمو","اختبار منضبط"]]}]}]};
 const html=renderVivitoPrintHtml(ar);arabicRtlPassed&&=vivitoPdfNeedsPrintRenderer(ar)&&html.includes('dir="rtl"')&&html.includes('@page{size:A4')&&html.includes('print-color-adjust:exact')&&html.includes('<table')&&html.includes('bar-track');if(i===0)arabicSample=html;
}
for(let i=0;i<10;i++){
 const plan:VivitoContentPlan={brand:`Brand ${i+1}`,period:"2026-09",objectives:["Qualified demand"],audiences:["Priority audience"],pillars:[{name:"Proof",role:"Consideration",share:100}],rows:Array.from({length:12},(_,j)=>({date:`2026-09-${String(j+1).padStart(2,'0')}`,platform:j%2?"TikTok":"Instagram",pillar:"Proof",format:j%2?"Reel":"Carousel",objective:"Trust",topic:`Case ${j+1}`,hook:"Evidence first",captionDirection:"Proof before claim",cta:"Contact us",kpi:"Qualified leads"}))};
 const wb=contentPlanToWorkbook(plan);const x=renderVivitoXlsx(wb);if(wb.sheets.length>=2&&x[0]===0x50&&x[1]===0x4b&&x.length>1000)xlsxCases++;else structuralPassed=false;if(i===0)xlsxSample=x;
}
if(latinSample)fs.writeFileSync('.vivito/artifact-latin-sample.pdf',latinSample);
if(arabicSample)fs.writeFileSync('.vivito/artifact-arabic-sample.html',arabicSample,'utf8');
if(xlsxSample)fs.writeFileSync('.vivito/artifact-xlsx-sample.xlsx',xlsxSample);
const hashes={latinPdf:latinSample?sha(latinSample):'',arabicPrintHtml:arabicSample?sha(arabicSample):'',xlsx:xlsxSample?sha(xlsxSample):''};
let baseline:any=null;try{baseline=JSON.parse(fs.readFileSync('certification/artifact-visual-baseline.json','utf8'))}catch{}
const visualInspectionPassed=!!baseline&&baseline.latinPdf===hashes.latinPdf&&baseline.arabicPrintHtml===hashes.arabicPrintHtml&&baseline.xlsx===hashes.xlsx&&baseline.inspected===true;
const report={passed:structuralPassed&&pdfCases===20&&xlsxCases===10&&arabicRtlPassed,pdfCases,xlsxCases,arabicRtlPassed,visualInspectionPassed,structuralPassed,hashes,note:visualInspectionPassed?"Exact renderer outputs match the inspected visual baseline.":"Structural batch passed. Exact sample hashes require rendered visual inspection before certification."};
fs.writeFileSync('.vivito/artifact-e2e.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exit(1);
