export type VivitoLearningSignal={kind:string;text:string;createdAt:string;scopeType?:string;scopeId?:string|null;source?:string};
export type VivitoLearningDigest={lessons:string[];wins:string[];failures:string[];corrections:string[];confidence:"LOW"|"MEDIUM"|"HIGH"};

const clean=(v:unknown,n=700)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const uniq=(xs:string[])=>[...new Set(xs.map(x=>clean(x)).filter(Boolean))];
const WIN_RE=/(worked|win|won|improved|increase|lift|better|نجح|تحسن|ارتفع|زادت|كسب)/i;
const FAIL_RE=/(failed|worse|decline|drop|loss|did not work|فشل|اسوأ|أسوأ|انخفض|خسر|منفعش|ما نفعش)/i;

export function buildVivitoLearningDigest(signals:VivitoLearningSignal[]):VivitoLearningDigest{
 const recent=[...signals].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,180);
 const lessons=uniq(recent.filter(s=>["LEARNING","OUTCOME"].includes(s.kind)).map(s=>s.text)).slice(0,24);
 const corrections=uniq(recent.filter(s=>s.kind==="CORRECTION").map(s=>s.text)).slice(0,16);
 const wins=uniq(recent.filter(s=>WIN_RE.test(s.text)).map(s=>s.text)).slice(0,12);
 const failures=uniq(recent.filter(s=>FAIL_RE.test(s.text)).map(s=>s.text)).slice(0,12);
 const count=lessons.length+corrections.length+wins.length+failures.length;
 return{lessons,wins,failures,corrections,confidence:count>=15?"HIGH":count>=5?"MEDIUM":"LOW"};
}

export function vivitoLearningContext(d:VivitoLearningDigest){
 const sections=[
  d.lessons.length?`LEARNINGS\n${d.lessons.map(x=>`- ${x}`).join("\n")}`:"",
  d.wins.length?`REPEATABLE WINS\n${d.wins.map(x=>`- ${x}`).join("\n")}`:"",
  d.failures.length?`FAILURE PATTERNS\n${d.failures.map(x=>`- ${x}`).join("\n")}`:"",
  d.corrections.length?`OPERATOR CORRECTIONS\n${d.corrections.map(x=>`- ${x}`).join("\n")}`:"",
 ].filter(Boolean);
 return sections.length?`Agency learning confidence=${d.confidence}\n${sections.join("\n\n")}`:"No validated agency learning evidence available.";
}

export const VIVITO_LEARNING_LOOP_DOCTRINE=[
 "Do not learn from a single noisy outcome as if it were causal proof.",
 "Separate observed outcome from explanation of why it happened.",
 "Prefer repeated patterns, controlled tests, or explicit operator corrections.",
 "Never convert an unverified assumption into durable client knowledge.",
 "Recent live evidence can invalidate historical lessons.",
] as const;
