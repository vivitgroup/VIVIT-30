import fs from "node:fs";
import {renderVivitoPdf} from "../lib/vivito/pdf-renderer";
import {renderVivitoPrintHtml,vivitoPdfNeedsPrintRenderer} from "../lib/vivito/print-renderer";
import {renderVivitoXlsx} from "../lib/vivito/xlsx-renderer";
import {contentPlanToWorkbook,type VivitoContentPlan,type VivitoPdfSpec} from "../lib/vivito/artifact-intelligence";
fs.mkdirSync('.vivito',{recursive:true});
let pdfCases=0,xlsxCases=0,arabicRtlPassed=true,structuralPassed=true;
for(let i=0;i<20;i++){
 const spec:VivitoPdfSpec={title:`Certification Strategy ${i+1}`,pages:[{title:`Decision ${i+1}`,blocks:[{type:"metric",text:`${i+10}%`},{type:"body",text:"Evidence-led recommendation with owner, KPI and next action."}]}]};
 const b=renderVivitoPdf(spec);const head=new TextDecoder().decode(b.slice(0,5));if(head!=="%PDF-"||b.length<200) structuralPassed=false;else pdfCases++;
}
for(let i=0;i<20;i++){
 const ar:VivitoPdfSpec={title:`استراتيجية ${i+1}`,pages:[{title:`قرار تنفيذي ${i+1}`,blocks:[{type:"callout",text:"توصية مبنية على الدليل"},{type:"chart",title:"الأداء",data:[{label:"وعي",value:30+i},{label:"تحويل",value:60+i}]},{type:"table",headers:["المحور","القرار"],rows:[["النمو","اختبار منضبط"]]}]}]};
 const html=renderVivitoPrintHtml(ar);arabicRtlPassed&&=vivitoPdfNeedsPrintRenderer(ar)&&html.includes('dir="rtl"')&&html.includes('@page{size:A4')&&html.includes('print-color-adjust:exact')&&html.includes('<table')&&html.includes('bar-track');
}
for(let i=0;i<10;i++){
 const plan:VivitoContentPlan={brand:`Brand ${i+1}`,period:"2026-09",objectives:["Qualified demand"],audiences:["Priority audience"],pillars:[{name:"Proof",role:"Consideration",share:100}],rows:Array.from({length:12},(_,j)=>({date:`2026-09-${String(j+1).padStart(2,'0')}`,platform:j%2?"TikTok":"Instagram",pillar:"Proof",format:j%2?"Reel":"Carousel",objective:"Trust",topic:`Case ${j+1}`,hook:"Evidence first",captionDirection:"Proof before claim",cta:"Contact us",kpi:"Qualified leads"}))};
 const wb=contentPlanToWorkbook(plan);const x=renderVivitoXlsx(wb);if(wb.sheets.length>=2&&x[0]===0x50&&x[1]===0x4b&&x.length>1000)xlsxCases++;else structuralPassed=false;
}
const report={passed:structuralPassed&&pdfCases===20&&xlsxCases===10&&arabicRtlPassed,pdfCases,xlsxCases,arabicRtlPassed,visualInspectionPassed:false,structuralPassed,note:"Binary/OOXML/RTL structural batch passed. Human/browser post-render visual inspection remains intentionally uncertified."};
fs.writeFileSync('.vivito/artifact-e2e.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exit(1);
