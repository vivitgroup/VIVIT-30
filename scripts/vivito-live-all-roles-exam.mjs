const BASE='https://vivit-erp-theta.vercel.app';
const PASSWORD=['Qav','!v1t0','-31-RoleTest-9x'].join('');
const roles=[
 ['SUPER_ADMIN','qa-live-sa-20260831@example.invalid'],['ACCOUNT_MANAGER','qa-live-am-20260831@example.invalid'],['MEDIA_BUYER','qa-live-mb-20260831@example.invalid'],['CREATOR','qa-live-cr-20260831@example.invalid'],['ACCOUNTANT','qa-live-ac-20260831@example.invalid'],['SALES','qa-live-sales-20260831@example.invalid'],['CLIENT','qa-live-client-20260831@example.invalid']
];
const seeds=[
'Give me a concise operational summary for my role. Read-only; do not execute anything.',
'What should I review first today in my role? Advice only; no actions.',
'Explain what information I am allowed to see about clients in my role. Read-only.',
'Explain task priorities HIGH versus URGENT and when each should be used. No actions.',
'How should overdue tasks be handled operationally? Advice only.',
'What should be checked before creating or updating a creative task? Do not create anything.',
'What should be checked before scheduling a social post? Do not schedule anything.',
'Explain how client lifecycle archive, restore, and delete should work safely. No actions.',
'Explain how role scoping protects one client from another. Read-only.',
'What should a media buyer inspect when campaign performance drops? No campaign changes.',
'Explain CTR, CPC, CPM, cost per result, frequency and ROAS. Read-only.',
'What tracking health checks matter for Pixel, CAPI, UTM and landing pages? Analysis only.',
'What should finance verify before recording a payment? Do not record anything.',
'Explain invoice, paid amount, outstanding balance and payment status. Read-only.',
'What should sales check before moving a lead to another stage? No actions.',
'Explain the safe lead stages and why stages should not be skipped. Read-only.',
'What should be checked before attaching a file to a client or task? Do not attach anything.',
'Explain safe archive and restore behavior for files and tasks. Read-only.',
'What should HR verify before a leave or payroll change? Do not change anything.',
'Explain what a useful management report should contain for my authorized scope. Read-only.'
];
function cookieJar(){const jar=new Map();return{absorb(res){const a=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[res.headers.get('set-cookie')].filter(Boolean);for(const raw of a){const first=String(raw).split(';',1)[0],i=first.indexOf('=');if(i>0)jar.set(first.slice(0,i),first.slice(i+1))}},header(){return[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}}}
async function login(email,expectedRole){const jar=cookieJar();const req=async(path,opt={})=>{const h=new Headers(opt.headers||{}),c=jar.header();if(c)h.set('cookie',c);const r=await fetch(BASE+path,{...opt,headers:h,redirect:'manual'});jar.absorb(r);return r};const csrfR=await req('/api/auth/csrf'),csrf=await csrfR.json();const body=new URLSearchParams({csrfToken:csrf.csrfToken,email,password:PASSWORD,callbackUrl:BASE+'/dashboard',redirect:'false'});await req('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});const sr=await req('/api/auth/session'),s=await sr.json();if(!s?.user?.id||s.user.role!==expectedRole||s.user.authValid!==true)throw new Error(`auth ${expectedRole}`);return req}
async function parse(r){const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}}
const results=[];
for(const [role,email] of roles){const req=await login(email,role);let qPass=0,tPass=0;const qFail=[],tFail=[];const questions=[];for(let round=1;round<=5;round++)for(const s of seeds)questions.push(`${s} Certification ${role} variant ${round}.`);for(let i=0;i<questions.length;i++){const st=Date.now(),r=await req('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:questions[i],attachments:[]})}),b=await parse(r),ms=Date.now()-st;const ok=r.status===200&&typeof b.answer==='string'&&b.answer.trim().length>0&&!b.actionProposal&&!b.actionPlan&&ms<=45000;if(ok)qPass++;else qFail.push({i:i+1,status:r.status,mode:b.mode,error:b.error||null,ms})}
 for(let i=1;i<=50;i++){const text=`Remind me on 2026-09-${String(2+(i%25)).padStart(2,'0')} at 10:00 to review VIVITO live role certification item ${role}-${String(i).padStart(2,'0')}.`;const p=await req('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:text,attachments:[]})}),pb=await parse(p),a=pb.actionProposal;if(p.status!==200||pb.mode!=='action-proposal'||a?.op!=='remind_me'||a?.missingFields?.length){tFail.push({i,phase:'proposal',status:p.status,mode:pb.mode,error:pb.error||null});continue}const ex=await req('/api/assistant/actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:a.op,args:a.args,confirm:true,requestId:`live-role-${role}-${Date.now()}-${i}`})}),eb=await parse(ex);if(ex.status===200&&eb.success===true)tPass++;else tFail.push({i,phase:'execute',status:ex.status,error:eb.error||null})}
 results.push({role,questions:{passed:qPass,total:100},tasks:{passed:tPass,total:50},questionFailures:qFail.slice(0,10),taskFailures:tFail.slice(0,10)});console.log('ROLE_RESULT '+JSON.stringify(results.at(-1)))}
const qp=results.reduce((a,x)=>a+x.questions.passed,0),tp=results.reduce((a,x)=>a+x.tasks.passed,0),qt=results.length*100,tt=results.length*50;const out={passed:qp===qt&&tp===tt,roles:results,overall:{questions:`${qp}/${qt}`,tasks:`${tp}/${tt}`,passed:qp+tp,total:qt+tt,percent:Number(((qp+tp)/(qt+tt)*100).toFixed(2))}};console.log('VIVITO_LIVE_ALL_ROLES_RESULT '+JSON.stringify(out));if(!out.passed)process.exit(1);