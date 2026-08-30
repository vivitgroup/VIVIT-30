import fs from "node:fs";
import path from "node:path";
import {renderVivitoPptx} from "../lib/vivito/pptx-renderer";
import {renderVivitoPdf} from "../lib/vivito/pdf-renderer";
import {renderVivitoXlsx} from "../lib/vivito/xlsx-renderer";
import type {VivitoPresentation,VivitoPdfSpec,VivitoWorkbook} from "../lib/vivito/artifact-intelligence";

const outDir=path.resolve(".vivito/artifact-quality-v3");fs.mkdirSync(outDir,{recursive:true});
const deck:VivitoPresentation={title:"Profitable Growth Decision",subtitle:"Executive operating review",author:"VIVITO",audience:"CEO / CFO / CMO",objective:"Choose the next 30-day growth move",slides:[
 {title:"Growth is constrained by conversion, not traffic",subtitle:"Decision framing",body:["Do not scale acquisition until the checkout bottleneck is verified.","Protect contribution margin while the diagnosis runs."],metrics:[{label:"CAC",value:"EGP 420"},{label:"Checkout CVR",value:"1.8%"}],sources:["ERP snapshot — 2026-08-27","Analytics snapshot — 2026-08-27"]},
 {title:"The funnel first breaks between checkout start and purchase",body:["Traffic and product-view volume are stable relative to the supplied baseline.","Checkout completion is the highest-leverage hypothesis to test first."],metrics:[{label:"Checkout abandonment",value:"68%"}],sources:["Analytics funnel — supplied evidence"]},
 {title:"Fixing the bottleneck has better expected value than buying more traffic",body:["Run a reversible checkout-friction experiment before increasing spend.","Keep channel budgets inside the current guardrail until the experiment resolves."],sources:["VIVITO decision model — hypothesis, not observed fact"]},
 {title:"Execute one controlled 14-day experiment with explicit stop rules",body:["Owner: Growth Lead","Dependency: analytics event validation","Success metric: checkout CVR versus baseline","Stop rule: no material lift after the pre-defined sample threshold"],sources:["Experiment plan — generated from supplied context"]},
 {title:"Scale only after conversion and contribution margin both clear the gate",body:["Decision: hold, test, then scale only on verified economics.","Next review: compare experiment result, CAC, contribution margin and sales quality."],sources:["Executive decision synthesis"]}
]};
const pdf:VivitoPdfSpec={title:"Profitable Growth Decision",subtitle:"Executive operating review",author:"VIVITO",pages:[
 {title:"Growth is constrained by conversion, not traffic",eyebrow:"Executive decision",blocks:[{type:"metric",text:"CAC: EGP 420"},{type:"body",text:"Do not scale acquisition until checkout friction is verified."},{type:"callout",text:"Decision: hold spend, test checkout, protect contribution margin."}],footer:"Source: ERP + Analytics supplied snapshot"},
 {title:"The next move is a controlled conversion experiment",eyebrow:"Action plan",blocks:[{type:"bullet",text:"Owner: Growth Lead"},{type:"bullet",text:"Dependency: analytics event validation"},{type:"bullet",text:"Success metric: checkout CVR versus baseline"},{type:"bullet",text:"Stop rule: no material lift after the defined sample threshold"}],footer:"VIVITO decision model — hypotheses explicitly labeled"}
]};
const workbook:VivitoWorkbook={title:"Growth Decision Model",sheets:[
 {name:"Inputs",columns:["Metric","Value","Unit","Source"],rows:[["CAC",420,"EGP","ERP snapshot"],["Checkout CVR",1.8,"%","Analytics snapshot"],["Checkout abandonment",68,"%","Analytics funnel"]]},
 {name:"Decision",columns:["Priority","Action","Owner","Success Metric","Guardrail"],rows:[[1,"Validate checkout events","Analytics Lead","Event integrity confirmed","Do not change spend"],[2,"Run checkout-friction test","Growth Lead","Checkout CVR lift","Protect contribution margin"],[3,"Scale only after gate","CMO","CAC + contribution margin clear threshold","No scale on vanity metrics"]]},
 {name:"Notes",columns:["Type","Statement"],rows:[["Evidence","Only supplied snapshots are treated as observed facts"],["Hypothesis","Checkout friction is a testable explanation, not a claimed fact"]]}
]};
const pptx=renderVivitoPptx(deck),pdfBytes=renderVivitoPdf(pdf),xlsx=renderVivitoXlsx(workbook);
fs.writeFileSync(path.join(outDir,"vivito-executive-decision.pptx"),pptx);fs.writeFileSync(path.join(outDir,"vivito-executive-decision.pdf"),pdfBytes);fs.writeFileSync(path.join(outDir,"vivito-growth-decision-model.xlsx"),xlsx);
const pptxText=new TextDecoder().decode(pptx),pdfText=new TextDecoder().decode(pdfBytes),xlsxText=new TextDecoder().decode(xlsx);
const checks:[string,boolean,string][]=[
 ["PPTX has a valid ZIP signature",pptx[0]===0x50&&pptx[1]===0x4b,"binary"],
 ["PPTX declares 16:9 presentation geometry",pptxText.includes('cx="12192000" cy="6858000"'),"presentation"],
 ["PPTX contains all five decision slides",[1,2,3,4,5].every(i=>pptxText.includes(`ppt/slides/slide${i}.xml`)),"presentation"],
 ["PPTX preserves assertion headlines",deck.slides.every(s=>pptxText.includes(s.title)),"content"],
 ["PPTX preserves evidence/source footers",pptxText.includes("ERP snapshot")&&pptxText.includes("Analytics funnel")&&pptxText.includes("hypothesis"),"evidence"],
 ["PPTX contains slide master and theme",pptxText.includes("ppt/slideMasters/slideMaster1.xml")&&pptxText.includes("ppt/theme/theme1.xml"),"binary"],
 ["PDF has a valid PDF header",pdfText.startsWith("%PDF-1.4"),"binary"],
 ["PDF closes with EOF marker",pdfText.trimEnd().endsWith("%%EOF"),"binary"],
 ["PDF declares exactly two pages",pdfText.includes("/Count 2"),"document"],
 ["PDF preserves executive decision content",pdfText.includes("Growth is constrained by conversion, not traffic")&&pdfText.includes("Owner: Growth Lead"),"content"],
 ["PDF preserves source/evidence footer",pdfText.includes("Source: ERP + Analytics supplied snapshot"),"evidence"],
 ["XLSX has a valid ZIP signature",xlsx[0]===0x50&&xlsx[1]===0x4b,"binary"],
 ["XLSX contains workbook and three worksheets",xlsxText.includes("xl/workbook.xml")&&[1,2,3].every(i=>xlsxText.includes(`xl/worksheets/sheet${i}.xml`)),"workbook"],
 ["XLSX preserves input/output separation",xlsxText.includes('sheet name="Inputs"')&&xlsxText.includes('sheet name="Decision"')&&xlsxText.includes('sheet name="Notes"'),"model"],
 ["XLSX preserves units, source and guardrail columns",["Unit","Source","Guardrail"].every(x=>xlsxText.includes(x)),"model"],
 ["XLSX labels hypothesis separately from evidence",xlsxText.includes("Hypothesis")&&xlsxText.includes("Evidence")&&xlsxText.includes("testable explanation"),"evidence"],
 ["Artifact payloads are non-trivial",pptx.length>5000&&pdfBytes.length>1500&&xlsx.length>2500,"binary"]
];
const passed=checks.filter(([,ok])=>ok).length,score=Math.round(passed/checks.length*100);const report={certification:"VIVITO Artifact Quality V3",score,passed,total:checks.length,artifacts:{pptx:{bytes:pptx.length,slides:deck.slides.length},pdf:{bytes:pdfBytes.length,pages:pdf.pages.length},xlsx:{bytes:xlsx.length,sheets:workbook.sheets.length}},checks:checks.map(([name,ok,category])=>({name,ok,category})),truthfulness:{observedFacts:"Only supplied fixture evidence is labeled observed",hypotheses:"Hypotheses are explicitly labeled",claimPolicy:"Generation is certified only when binary + content checks pass"}};fs.writeFileSync(path.join(outDir,"artifact-quality-report.json"),JSON.stringify(report,null,2));
for(const [name,ok,category] of checks)console.log(`${ok?"PASS":"FAIL"}  [${category}] ${name}`);console.log(`\nArtifact Quality V3: ${score}/100 (${passed}/${checks.length})`);console.log(`Evidence: ${outDir}`);if(passed!==checks.length)process.exit(1);
