// VIVITO task parsing regression — 50 executable cases.
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
async function bootstrap(){await req(`${BASE}/?_vercel_share=${SHARE}`);const health=await api('/api/health'),hb=await json(health);if(health.status!==200||hb.status!=='healthy')throw new Error(`health:${health.status}`);const csrfRes=await api('/api/auth/csrf'),csrf=await json(csrfRes);if(!csrf.csrfToken)throw new Error('csrf');const login=await api('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email:EMAIL,password:PASSWORD,callbackUrl:BASE+'/dashboard',redirect:'false'})});const sessionRes=await api('/api/auth/session'),session=await json(sessionRes);if(!session?.user?.id||session?.user?.authValid!==true)throw new Error(`auth:${login.status}:${sessionRes.status}`)}
async function propose(question){const started=Date.now(),res=await api('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,attachments:[]})}),body=await json(res);return{res,body,ms:Date.now()-started}}
async function execute(proposal,i){const res=await api('/api/assistant/actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:proposal.op,args:proposal.args,confirm:true,requestId:`task-parsing-regression-v6-${i}`})}),body=await json(res);return{res,body}}
const failures=[];let passed=0;
await bootstrap();
for(let i=1;i<=40;i++){
 const title=`Exam Task ${String(i).padStart(2,'0')}`,deadline=`2026-09-${String(5+(i%19)).padStart(2,'0')}`,priority=i%9===0?'HIGH':'MEDIUM';
 const question=i%2?`Create a graphic task for client QA Exam Client titled ${title}. Brief: Production QA certification case ${String(i).padStart(2,'0')}. Deadline ${deadline}. Assign it to QA Creator with ${priority} priority.`:`اعمل تاسك للعميل QA Exam Client باسم ${title}. البريف Production QA certification case ${String(i).padStart(2,'0')}. الديدلاين ${deadline}. اسندها لـ QA Creator والأولوية ${priority}.`;
 const p=await propose(question),a=p.body?.actionProposal;
 if(p.res.status!==200||p.body?.mode!=='action-proposal'||a?.op!=='create_task'||a?.args?.clientName!=='QA Exam Client'||a?.args?.title!==title||a?.args?.priority!==priority||a?.args?.assigneeName!=='QA Creator'||a?.missingFields?.length){failures.push({i,phase:'proposal',status:p.res.status,mode:p.body?.mode,proposal:a});continue}
 const ex=await execute(a,i);if(ex.res.status===200&&ex.body?.success===true)passed++;else failures.push({i,phase:'execute',status:ex.res.status,error:ex.body?.error})
}
for(let i=41;i<=50;i++){
 const n=i-40,title=`Exam Task ${String(n).padStart(2,'0')}`,priority=i%2?'HIGH':'LOW';
 const question=i%2?`Update ${title} for client QA Exam Client and set priority to ${priority}.`:`عدّل ${title} للعميل QA Exam Client وخلي الأولوية ${priority}.`;
 const p=await propose(question),a=p.body?.actionProposal;
 if(p.res.status!==200||p.body?.mode!=='action-proposal'||a?.op!=='update_task'||a?.args?.clientName!=='QA Exam Client'||String(a?.args?.taskTitle||a?.args?.title)!==title||a?.args?.priority!==priority||a?.missingFields?.length){failures.push({i,phase:'proposal',status:p.res.status,mode:p.body?.mode,proposal:a});continue}
 const ex=await execute(a,i);if(ex.res.status===200&&ex.body?.success===true)passed++;else failures.push({i,phase:'execute',status:ex.res.status,error:ex.body?.error})
}
console.log('VIVITO_TASK_PARSING_RESULT '+JSON.stringify({passed,total:50,failures:failures.slice(0,20)}));
if(passed!==50)process.exit(1);
