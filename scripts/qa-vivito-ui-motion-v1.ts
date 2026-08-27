import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");
const layout = read("app/dashboard/layout.tsx");
const css = read("app/dashboard/vivito-ui-motion-v1.css");
const refineCss = read("app/dashboard/vivito-ui-refinement-v2.css");
const runtime = read("components/experience/VivitoUiMotionRuntime.tsx");
const refineRuntime = read("components/experience/VivitoUiRefinementRuntime.tsx");
const vivito = read("components/experience/VivitVivito.tsx");

const checks: Array<[string, boolean]> = [
  ["dashboard wires VIVITO motion runtime", layout.includes("<VivitoUiMotionRuntime/>")],
  ["dashboard wires refinement runtime", layout.includes("<VivitoUiRefinementRuntime/>")],
  ["dashboard loads motion and refinement CSS", layout.includes('import "./vivito-ui-motion-v1.css"') && layout.includes('import "./vivito-ui-refinement-v2.css"')],
  ["ERP cards receive perspective 3D depth", css.includes("perspective(1100px)") && css.includes("translateZ(8px)")],
  ["3D system still covers generic .card", css.includes(".card,") && refineCss.includes(".card:hover")],
  ["3D system covers campaign and creative cards", css.includes(".campaign-card") && css.includes(".creative-card")],
  ["ambient card motion remains continuous", css.includes("vivitoCardBreath") && css.includes("infinite")],
  ["directional pointer tilt augments 3D", refineRuntime.includes("pointermove") && refineRuntime.includes("--vivito-tilt-x") && refineRuntime.includes("--vivito-tilt-y")],
  ["client heroes receive marketing typewriter", runtime.includes(".cw-hero, .portal-hero") && runtime.includes("MARKETING_QUOTES")],
  ["typewriter writes letter by letter", runtime.includes("letterIndex + 1") && runtime.includes("quote.slice(0, letterIndex)")],
  ["marketing quotes rotate continuously", runtime.includes("quoteIndex = (quoteIndex + 1) % MARKETING_QUOTES.length")],
  ["campaign runtime supports four health states", ["good","excellent","warning","critical"].every((x)=>runtime.includes(`vivito-campaign-${x}`) || css.includes(`vivito-campaign-${x}`))],
  ["campaign state gets explicit status badge", refineRuntime.includes("vivito-campaign-status-badge") && refineRuntime.includes("NEEDS ATTENTION")],
  ["good campaigns use soft green signal", css.includes(".vivito-campaign-good") && css.includes("34,197,94")],
  ["excellent campaigns pulse green", css.includes(".vivito-campaign-excellent") && css.includes("vivitoExcellentGlow")],
  ["warning campaigns stay amber", refineCss.includes("vivitoWarningGlowV2") && refineCss.includes("245,158,11") && !refineCss.includes("vivitoWarningGlowV2{\n  0%,100%{border-color:rgba(239,68,68")],
  ["critical campaigns pulse red", css.includes(".vivito-campaign-critical") && css.includes("239,68,68")],
  ["forms and buttons include micro interaction feedback", refineCss.includes("vivitoFieldError") && refineCss.includes(":active") && refineCss.includes(":focus")],
  ["skeletons use live shimmer", refineCss.includes("vivitoSkeletonFlow") && refineCss.includes("dashboard-skeleton")],
  ["empty states are standardized", refineCss.includes(".empty-state") && refineCss.includes("[data-empty-state]")],
  ["mobile ERP polish is present", refineCss.includes("@media(max-width:760px)") && refineCss.includes("dashboard-skeleton-kpis")],
  ["dark mode polish is present", refineCss.includes(".dark .card") && refineCss.includes(".dark .form-input:focus")],
  ["spacing tokens are standardized", refineCss.includes("--vivito-space-1:8px") && refineCss.includes("--section-gap")],
  ["VIVITO uses social-spectrum colors", ["#1877f2","#25f4ee","#fe2c55","#25d366","#ffd800"].every((x)=>vivito.toLowerCase().includes(x))],
  ["VIVITO core has perpetual orbit motion", vivito.includes("vivitoOrbitA") && vivito.includes("infinite")],
  ["reduced-motion accessibility is preserved", css.includes("prefers-reduced-motion") && refineCss.includes("prefers-reduced-motion") && vivito.includes("prefers-reduced-motion")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} VIVITO UI Motion V1+V2 checks passed.`);
if (failed) process.exit(1);
