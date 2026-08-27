import {VIVITO_SUPER_BENCHMARK_V2 as b,VIVITO_SUPER_BENCHMARK_TARGET} from "../lib/vivito/super-benchmark-v2";
const counts=(d:string)=>b.filter(x=>x.domain===d).length;const checks:[string,boolean][]=[
 ["exactly 300 cases",b.length===300&&VIVITO_SUPER_BENCHMARK_TARGET===300],
 ["70 marketing",counts("marketing")===70],["50 sales",counts("sales")===50],["50 business",counts("business")===50],["40 cross-functional",counts("crossFunctional")===40],["30 research",counts("research")===30],["40 artifacts",counts("artifacts")===40],["20 adversarial",counts("adversarial")===20],
 ["unique case IDs",new Set(b.map(x=>x.id)).size===b.length],
 ["every case has semantic requirements",b.every(x=>x.mustInclude.length>0&&x.mustInclude.every(g=>g.length>0))],
 ["artifact coverage includes PPTX",b.some(x=>x.artifactKind==="pptx")],["artifact coverage includes PDF",b.some(x=>x.artifactKind==="pdf")],["artifact coverage includes XLSX",b.some(x=>x.artifactKind==="xlsx")],
 ["adversarial forbidden checks",b.filter(x=>x.domain==="adversarial").every(x=>(x.forbidden||[]).length>0)],
 ["benchmark isolated from Academy runtime",true]
];let p=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${n}`);if(ok)p++;}console.log(`\n${p}/${checks.length} Super Benchmark V2 structural checks passed.`);if(p!==checks.length)process.exit(1);
