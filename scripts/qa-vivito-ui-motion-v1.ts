import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");
const layout = read("app/dashboard/layout.tsx");
const css = read("app/dashboard/vivito-ui-motion-v1.css");
const runtime = read("components/experience/VivitoUiMotionRuntime.tsx");
const vivito = read("components/experience/VivitVivito.tsx");

const checks: Array<[string, boolean]> = [
  ["dashboard wires VIVITO motion runtime", layout.includes("<VivitoUiMotionRuntime/>")],
  ["dashboard loads motion CSS last", layout.includes('import "./vivito-ui-motion-v1.css"')],
  ["ERP cards receive perspective 3D depth", css.includes("perspective(1100px)") && css.includes("translateZ(8px)")],
  ["3D system covers generic and campaign cards", css.includes(".card,") && css.includes(".campaign-card") && css.includes(".creative-card")],
  ["ambient card motion is continuous", css.includes("vivitoCardBreath") && css.includes("infinite")],
  ["client heroes receive marketing typewriter", runtime.includes(".cw-hero, .portal-hero") && runtime.includes("MARKETING_QUOTES")],
  ["typewriter writes letter by letter", runtime.includes("letterIndex + 1") && runtime.includes("quote.slice(0, letterIndex)")],
  ["marketing quotes rotate continuously", runtime.includes("quoteIndex = (quoteIndex + 1) % MARKETING_QUOTES.length")],
  ["campaign runtime supports four health states", ["good","excellent","warning","critical"].every((x)=>runtime.includes(`vivito-campaign-${x}`) || css.includes(`vivito-campaign-${x}`))],
  ["good campaigns use soft green signal", css.includes(".vivito-campaign-good") && css.includes("34,197,94")],
  ["excellent campaigns pulse green", css.includes(".vivito-campaign-excellent") && css.includes("vivitoExcellentGlow")],
  ["warning campaigns pulse amber", css.includes(".vivito-campaign-warning") && css.includes("245,158,11")],
  ["critical campaigns pulse red", css.includes(".vivito-campaign-critical") && css.includes("239,68,68")],
  ["VIVITO uses social-spectrum colors", ["#1877f2","#25f4ee","#fe2c55","#25d366","#ffd800"].every((x)=>vivito.toLowerCase().includes(x))],
  ["VIVITO core has perpetual orbit motion", vivito.includes("vivitoOrbitA") && vivito.includes("infinite")],
  ["reduced-motion accessibility is preserved", css.includes("prefers-reduced-motion") && vivito.includes("prefers-reduced-motion")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} VIVITO UI Motion V1 checks passed.`);
if (failed) process.exit(1);
