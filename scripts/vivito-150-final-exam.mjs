// VIVITO final Preview certification: 100 read-only questions + 50 executable task cases.
const BASE='https://vivit-74h693cou-vivit-s-projects.vercel.app';
const SHARE='ah9PDznQHAicy0YE9eOypnblah5CWcJA';
const EMAIL='vivito-fix-admin-20260831@example.invalid';
const PASSWORD=String.fromCharCode(69,120,97,109,70,105,120,35,50,48,50,54,33);
const jar=new Map();
function absorb(res){const values=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[res.headers.get('set-cookie')].filter(Boolean);for(const raw of values){const first=String(raw).split(';',1)[0],i=first.indexOf('=');if(i>0)jar.set(first.slice(0,i),first.slice(i+1))}}
function cookieHeader(){return[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
async function req(url,options={}){const headers=new Headers(options.headers||{}),cookie=cookieHeader();if(cookie)headers.set('cookie',cookie);let res=await fetch(url,{...options,headers,redirect:'manual'});absorb(res);for(let i=0;i<5&&res.status>=300&&res.status<400;i++){const loc=res.headers.get('location');if(!loc)break;const next=new URL(loc,url).toString();const h=new Headers(options.headers||{}),c=cookieHeader();if(c)h.set('cookie',c);res=await fetch(next,{method:'GET',headers:h,redirect:'manual'});absorb(res);url=next}return res}
async function api(path,options={}){return req(BASE+path,options)}
async function json(res){const text=await res.text();try{return JSON.parse(text)}catch{return{raw:text.slice(0,300)}}}
async function bootstrap(){await req(`${BASE}/?_vercel_share=${SHARE}`);const health=await api('/api/health'),hb=await json(health);if(health.status!==200||hb.status!=='healthy'||hb.database!=='connected')throw new Error(`health:${health.status}`);const csrfRes=await api('/api/auth/csrf'),csrf=await json(csrfRes);if(!csrf.csrfToken)throw new Error('csrf');const login=await api('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email:EMAIL,password:PASSWORD,callbackUrl:BASE+'/dashboard',redirect:'false'})});const sessionRes=await api('/api/auth/session'),session=await json(sessionRes);if(!session?.user?.id||session?.user?.authValid!==true||session?.user?.role!=='SUPER_ADMIN')throw new Error(`auth:${login.status}:${sessionRes.status}`)}
async function ask(question){const started=Date.now(),res=await api('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,attachments:[]})}),body=await json(res);return{res,body,ms:Date.now()-started}}
async function execute(proposal,i){const res=await api('/api/assistant/actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:proposal.op,args:proposal.args,confirm:true,requestId:`vivito-final-150-${i}`})}),body=await json(res);return{res,body}}
const questionSeeds=[
 'Give me a concise operational summary of this workspace without making changes.',
 'What should an account manager check first at the start of the day? Do not execute anything.',
 'Explain how task priority should be interpreted operationally. Read-only answer.',
 'What are the main risks of an overdue creative task? Advice only.',
 'Summarize the difference between HIGH and URGENT priority. No actions.',
 'How should a team validate a client brief before production? Advice only.',
 'What information is normally needed before scheduling a social post? Do not schedule.',
 'How should a media buyer evaluate campaign health conceptually? No campaign changes.',
 'What should finance verify before recording a client payment? Do not record anything.',
 'How should a manager handle a task that needs revision? Explain only.',
 'اديني ملخص تشغيلي للـworkspace من غير ما تنفذ أي حاجة.',
 'إيه أهم حاجات الـaccount manager يراجعها أول اليوم؟ إجابة فقط.',
 'اشرح الفرق بين أولوية HIGH و URGENT من غير تعديل أي تاسك.',
 'إيه مخاطر التاسكات المتأخرة؟ تحليل فقط.',
 'إزاي نراجع brief العميل قبل ما يبدأ التنفيذ؟ من غير إنشاء تاسكات.',
 'إيه البيانات المطلوبة قبل جدولة بوست؟ ما تعملش جدولة.',
 'إزاي نقيس صحة حملة إعلانية بشكل عام؟ ما تعدلش أي campaign.',
 'إيه اللي المحاسب يراجعه قبل تسجيل دفعة؟ ما تسجلش دفعة.',
 'إزاي نتعامل مع revision على design؟ نصيحة فقط.',
 'اعمل مقارنة مفاهيمية بين task status و task priority من غير تنفيذ.'
];
const questions=[];for(let round=1;round<=5;round++)for(const seed of questionSeeds)questions.push(`${seed} Certification variant ${round}.`);
const qFailures=[];let qPassed=0,qLatency=0;
await bootstrap();
for(let i=0;i<questions.length;i++){
 const r=await ask(questions[i]);qLatency+=r.ms;
 const pass=r.res.status===200&&typeof r.body?.answer==='string'&&r.body.answer.trim().length>0&&!r.body?.actionProposal&&!r.body?.actionPlan&&r.ms<=45000;
 if(pass)qPassed++;else qFailures.push({i:i+1,status:r.res.status,mode:r.body?.mode,ms:r.ms,error:r.body?.error||null});
}
const tFailures=[];let tPassed=0,tLatency=0;
for(let i=1;i<=40;i++){
 const title=`Final Exam Task ${String(i).padStart(2,'0')}`,deadline=`2026-09-${String(5+(i%19)).padStart(2,'0')}`,priority=i%9===0?'HIGH':'MEDIUM';
 const question=i%2?`Create a graphic task for client QA Exam Client titled ${title}. Brief: Final production QA certification case ${String(i).padStart(2,'0')}. Deadline ${deadline}. Assign it to QA Creator with ${priority} priority.`:`اعمل تاسك للعميل QA Exam Client باسم ${title}. البريف Final production QA certification case ${String(i).padStart(2,'0')}. الديدلاين ${deadline}. اسندها لـ QA Creator والأولوية ${priority}.`;
 const p=await ask(question);tLatency+=p.ms;const a=p.body?.actionProposal;
 if(p.res.status!==200||p.body?.mode!=='action-proposal'||a?.op!=='create_task'||a?.args?.clientName!=='QA Exam Client'||a?.args?.title!==title||a?.args?.priority!==priority||a?.args?.assigneeName!=='QA Creator'||a?.missingFields?.length){tFailures.push({i,phase:'proposal',status:p.res.status,mode:p.body?.mode});continue}
 const ex=await execute(a,i);if(ex.res.status===200&&ex.body?.success===true)tPassed++;else tFailures.push({i,phase:'execute',status:ex.res.status,error:ex.body?.error||null})
}
for(let i=41;i<=50;i++){
 const n=i-40,title=`Final Exam Task ${String(n).padStart(2,'0')}`,priority=i%2?'HIGH':'LOW';
 const question=i%2?`Update ${title} for client QA Exam Client and set priority to ${priority}.`:`عدّل ${title} للعميل QA Exam Client وخلي الأولوية ${priority}.`;
 const p=await ask(question);tLatency+=p.ms;const a=p.body?.actionProposal;
 if(p.res.status!==200||p.body?.mode!=='action-proposal'||a?.op!=='update_task'||a?.args?.clientName!=='QA Exam Client'||String(a?.args?.taskTitle||a?.args?.title)!==title||a?.args?.priority!==priority||a?.missingFields?.length){tFailures.push({i,phase:'proposal',status:p.res.status,mode:p.body?.mode});continue}
 const ex=await execute(a,i);if(ex.res.status===200&&ex.body?.success===true)tPassed++;else tFailures.push({i,phase:'execute',status:ex.res.status,error:ex.body?.error||null})
}
const totalPassed=qPassed+tPassed,result={passed:totalPassed===150,questions:{passed:qPassed,total:100,avgMs:Math.round(qLatency/100)},tasks:{passed:tPassed,total:50,avgMs:Math.round(tLatency/50)},overall:{passed:totalPassed,total:150,percent:Number((totalPassed/150*100).toFixed(2))},questionFailures:qFailures.slice(0,20),taskFailures:tFailures.slice(0,20)};
console.log('VIVITO_FINAL_150_RESULT '+JSON.stringify(result));
if(!result.passed)process.exit(1);
