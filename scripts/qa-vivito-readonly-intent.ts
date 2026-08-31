import { likelyVivitoActionIntent } from "../lib/vivito/action-engine";

const cases:[string,boolean][]=[
 ["What should finance verify before recording a client payment? Do not record anything.",false],
 ["إيه البيانات المطلوبة قبل جدولة بوست؟ ما تعملش جدولة.",false],
 ["إزاي نقيس صحة حملة إعلانية بشكل عام؟ ما تعدلش أي campaign.",false],
 ["إيه اللي المحاسب يراجعه قبل تسجيل دفعة؟ ما تسجلش دفعة.",false],
 ["Record a client payment for QA Exam Client of 500 EGP.",true],
 ["Schedule a post for QA Exam Client tomorrow.",true],
 ["عدّل Exam Task 01 للعميل QA Exam Client وخلي الأولوية HIGH.",true],
 ["سجّل دفعة للعميل QA Exam Client بقيمة 500 جنيه.",true],
];

const failures=cases.flatMap(([question,expected],index)=>{
 const actual=likelyVivitoActionIntent(question,0);
 return actual===expected?[]:[{index:index+1,question,expected,actual}];
});

console.log("VIVITO_READONLY_INTENT_RESULT "+JSON.stringify({passed:cases.length-failures.length,total:cases.length,failures}));
if(failures.length)process.exit(1);
