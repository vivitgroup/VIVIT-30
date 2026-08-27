import type { VivitoBenchmarkCase } from "./benchmark";

export type VivitoCaseScore={id:string;dimension:string;score:number;maxScore:number;passed:boolean;requiredMatched:string[];requiredMissing:string[];forbiddenFound:string[]};
export type VivitoBenchmarkScore={score:number;maxScore:number;percent:number;passed:number;failed:number;dimensions:Record<string,{score:number;maxScore:number;percent:number;passed:number;failed:number}>;cases:VivitoCaseScore[]};

const normalizeArabic=(s:string)=>s.replace(/[\u064B-\u065F\u0670]/g,"").replace(/ـ/g,"").replace(/[أإآ]/g,"ا").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ى/g,"ي");
const normalize=(s:string)=>normalizeArabic(s.toLowerCase()).replace(/[“”"'`*_#()[\]{}:;,.!?/\\|<>+=~]/g," ").replace(/\s+/g," ").trim();

const ALIASES:Record<string,string[]>={
  no:["no","not","do not","don't","shouldn't","لا","مش","مينفعش","ماينفعش"],
  evidence:["evidence","proof","data","signal","دليل","اثبات","داتا","بيانات"],
  source:["source","evidence","مصدر","دليل"],
  tracking:["tracking","measurement","pixel","capi","تتبع","قياس","بيكسل"],
  diagnosis:["diagnosis","diagnose","root cause","تشخيص","سبب جذري"],
  "do not scale":["do not scale","don't scale","should not scale","وقف التوسيع","متعملش scale","ما تزودش","ماتزودش"],
  "not automatic":["not automatic","do not apply blindly","ليس تلقائيا","مش تلقائي","متطبقش تلقائي"],
  cannot:["cannot","can't","not enough","insufficient","مش ممكن","مقدرش","لا يمكن","غير كافي"],
  unknown:["unknown","not known","missing","غير معروف","مش معروف","ناقص"],
  insufficient:["insufficient","not enough","too little","غير كافي","مش كفاية"],
  refuse:["refuse","cannot provide","not authorized","ارفض","مقدرش","غير مسموح"],
  authorization:["authorization","authorized","permission","role","صلاحية","صلاحيات","مسموح"],
  unauthorized:["unauthorized","not authorized","forbidden","غير مصرح","غير مسموح","مش مسموح"],
  confidence:["confidence","certainty","ثقة","تاكد","تأكد"],
  quality:["quality","qualified","جوده","جودة","مؤهل"],
  response:["response","contact","follow up","رد","تواصل","متابعة"],
  followup:["follow up","follow-up","متابعة","فولو اب"],
  follow:["follow up","follow-up","متابعة","فولو اب"],
  metric:["metric","kpi","result definition","مقياس","مؤشر"],
  definition:["definition","result definition","تعريف","نوع النتيجة"],
  baseline:["baseline","comparison","previous period","خط اساس","مقارنة","الفترة السابقة"],
  objective:["objective","goal","business goal","هدف","هدف العمل"],
  goal:["goal","objective","business goal","business outcome","commercial outcome","success criteria","target outcome","هدف","هدف العمل","الهدف","النتيجة التجارية","نتيجة العمل"],
  offer:["offer","proposition","value proposition","commercial proposition","عرض","اوفر","عرض القيمة","القيمة المقدمة"],
  funnel:["funnel","sales funnel","conversion funnel","pipeline","sales pipeline","customer journey","conversion path","فانل","بايبلاين","مسار التحويل","مسار المبيعات","رحلة العميل"],
  creative:["creative","design","hook","كريتيف","تصميم","هوك"],
  sales:["sales","close","pipeline","سيلز","مبيعات"],
  media:["media","campaign","ads","ميديا","اعلان","حملة"],
  margin:["margin","profitability","contribution","مارجن","هامش","ربحية"],
  action:["action","next step","اجراء","خطوة"],
  now:["now","today","immediately","دلوقتي","النهارده","حالا"],
  monitor:["monitor","watch","track","راقب","متابعة"],
  owner:["owner","responsible","مسؤول","اونر"],
  date:["date","deadline","موعد","تاريخ"],
};

function termVariants(term:string){
  const key=normalize(term);
  const stem=key.length>5?key.slice(0,Math.max(4,key.length-2)):key;
  return [...new Set([key,stem,...(ALIASES[key]||[]).map(normalize)])].filter(Boolean);
}

function containsTerm(answer:string,term:string){
  const a=normalize(answer);
  return termVariants(term).some(v=>a.includes(v));
}

export function scoreVivitoAnswer(test:VivitoBenchmarkCase,answer:string):VivitoCaseScore{
  const requiredMatched=test.must.filter(term=>containsTerm(answer,term));
  const requiredMissing=test.must.filter(term=>!containsTerm(answer,term));
  const forbiddenFound=(test.mustNot||[]).filter(term=>containsTerm(answer,term));
  const requiredRatio=test.must.length?requiredMatched.length/test.must.length:1;
  const forbiddenPenalty=forbiddenFound.length?1:0;
  const score=Math.max(0,Math.min(1,requiredRatio-forbiddenPenalty));
  return{id:test.id,dimension:test.dimension,score,maxScore:1,passed:score>=0.999,requiredMatched,requiredMissing,forbiddenFound};
}

export function scoreVivitoBenchmark(results:Array<{test:VivitoBenchmarkCase;answer:string}>):VivitoBenchmarkScore{
  const cases=results.map(x=>scoreVivitoAnswer(x.test,x.answer));
  const dimensions:VivitoBenchmarkScore["dimensions"]={};
  for(const c of cases){
    const d=dimensions[c.dimension]||{score:0,maxScore:0,percent:0,passed:0,failed:0};
    d.score+=c.score;d.maxScore+=c.maxScore;c.passed?d.passed++:d.failed++;dimensions[c.dimension]=d;
  }
  for(const d of Object.values(dimensions))d.percent=d.maxScore?Math.round((d.score/d.maxScore)*1000)/10:0;
  const score=Math.round(cases.reduce((s,c)=>s+c.score,0)*100)/100;
  const maxScore=cases.reduce((s,c)=>s+c.maxScore,0);
  return{score,maxScore,percent:maxScore?Math.round((score/maxScore)*1000)/10:0,passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,dimensions,cases};
}
