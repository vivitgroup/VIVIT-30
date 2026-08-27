import {renderVivitoPptx} from "../lib/vivito/pptx-renderer";
import {requestedArtifactKind,buildVivitoArtifactPlannerSystem,parseVivitoArtifactProposal} from "../lib/vivito/artifact-router";
const sample={title:"Growth Decision",subtitle:"Executive review",author:"VIVITO",audience:"CEO",objective:"Choose growth plan",slides:[{title:"Profitable growth is constrained by conversion, not traffic",body:["Hold acquisition budget until checkout diagnosis is complete","Protect contribution margin while testing the bottleneck"],metrics:[{label:"CAC",value:"EGP 420"}],sources:["ERP snapshot — 2026-08-27"]},{title:"Fix the bottleneck before scaling",body:["Owner: Growth Lead","Decision gate: checkout CVR recovers above baseline"],sources:["VIVITO decision model"]}]};
const bytes=renderVivitoPptx(sample);
const text=new TextDecoder().decode(bytes);
const checks:[string,boolean][]=[
 ["PPTX is ZIP binary",bytes[0]===0x50&&bytes[1]===0x4b],
 ["PPTX contains presentation.xml",text.includes("ppt/presentation.xml")],
 ["PPTX contains slide XML",text.includes("ppt/slides/slide1.xml")&&text.includes("ppt/slides/slide2.xml")],
 ["PPTX contains slide master",text.includes("ppt/slideMasters/slideMaster1.xml")],
 ["PPTX contains theme",text.includes("ppt/theme/theme1.xml")],
 ["presentation intent routes to pptx",requestedArtifactKind("اعمل برزنتيشن PowerPoint للـ CEO")==="pptx"],
 ["deck intent routes to pptx",requestedArtifactKind("Create a strategy deck")==="pptx"],
 ["pdf remains pdf",requestedArtifactKind("Generate a board PDF")==="pdf"],
 ["xlsx remains xlsx",requestedArtifactKind("Build an Excel model")==="xlsx"],
 ["planner demands assertion headlines",buildVivitoArtifactPlannerSystem("pptx").includes("assertion headline")],
 ["planner demands low density",buildVivitoArtifactPlannerSystem("pptx").includes("density")],
 ["parser accepts presentation",!!parseVivitoArtifactProposal(JSON.stringify({kind:"pptx",title:"T",fileName:"t",summary:"s",presentation:sample}),"pptx")],
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} Artifact Runtime V3 checks passed.`);if(pass!==checks.length)process.exit(1);
