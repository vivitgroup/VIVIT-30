const BASE='https://vivit-erp-theta.vercel.app';
const roles={
 SUPER_ADMIN:{email:'vivito-role-qa-admin@example.invalid',password:'bqaLPSD-iedml2NVAFOI1oa3'},
 ACCOUNT_MANAGER:{email:'vivito-role-qa-am@example.invalid',password:'dLoSSL6bXNHgrFiMVrjzWX6e'},
 MEDIA_BUYER:{email:'vivito-role-qa-mb@example.invalid',password:'-zgGrWQvCeK_wL5tQrHFk0vp'},
 CREATOR:{email:'vivito-role-qa-creator@example.invalid',password:'gosQxT6_wkokrOeXUpiIQE4t'},
 ACCOUNTANT:{email:'vivito-role-qa-accountant@example.invalid',password:'k5pAH8vX96NgHKnYPHh_lsKb'},
 SALES:{email:'vivito-role-qa-sales@example.invalid',password:'yhHxUOCwR_Ppiq0DS-33jy6t'},
 CLIENT:{email:'vivito-role-qa-client@example.invalid',password:'8LweYchwk2K9-OsfMUqMZRKh'}
};
const seeds=[
'Give me a concise operational summary of what matters today. Read-only; do not execute anything.',
'Explain how HIGH and URGENT task priority differ operationally. Advice only.',
'What should be checked before a creative task starts production? Do not create or change anything.',
'How should overdue creative work be triaged? Analysis only.',
'Explain the safest revision workflow for a rejected design. No actions.',
'How should an account manager review client health and churn risk? Read-only.',
'How should a media buyer judge campaign health using spend, results, CTR, CPC, CPM, frequency and ROAS? Do not change campaigns.',
'Explain how tracking health, Pixel, CAPI, UTM and landing-page issues affect campaign decisions. Analysis only.',
'What should finance verify before recording a payment or invoice? Do not record anything.',
'Explain how outstanding balances, retainers and expenses should be reviewed. Read-only.',
'How should sales prioritize leads, follow-ups, pipeline probability and expected close dates? No actions.',
'Explain the safe client onboarding flow and what must be validated before activation. Advice only.',
'What should be included in an executive client performance report? Do not generate a report.',
'Explain how VIVITO should respect role scope and client ownership when answering questions. Read-only.',
'How should files, briefs, contracts and finance documents be attached safely to the correct client/task? Do not attach anything.',
'Explain leave, payroll and staff-management controls by role. No actions.',
'How should integrations and ad-platform campaign changes be handled safely? Do not connect, disconnect or update anything.',
'Explain when a client or task should be archived versus permanently deleted. Read-only.',
'اديني تحليل تشغيلي للي لازم يتراجع في الشغل من غير ما تنفذ أو تعدل أي حاجة.',
'اشرحلي إزاي VIVITO يفرق بين النصيحة وبين أمر التنفيذ ويحافظ على صلاحيات الرول. إجابة فقط.'
];
const allowed={
 SUPER_ADMIN:['create_client','update_client','add_client_contact','archive_client','restore_client','delete_client','create_task','update_task','reassign_task','archive_task','restore_task','delete_task','schedule_post','mark_posted','create_lead','update_lead','move_lead','archive_lead','log_expense','record_payment','create_invoice','attach_file','remind_me','create_user','update_user','set_user_active','create_leave_request','decide_leave','upsert_payroll','set_payroll_status','create_contract','update_contract','update_workspace_settings','send_email','send_whatsapp','create_api_key','revoke_api_key','create_webhook','revoke_webhook','sync_campaign','update_campaign','start_integration','disconnect_integration','export_data','generate_report','update_onboarding','record_nps','create_referral','bulk_update_tasks','bulk_remind_clients'],
 ACCOUNT_MANAGER:['create_client','update_client','add_client_contact','archive_client','restore_client','create_task','update_task','reassign_task','archive_task','restore_task','schedule_post','mark_posted','attach_file','remind_me','create_leave_request','create_contract','update_contract','send_email','send_whatsapp','sync_campaign','update_campaign','start_integration','disconnect_integration','export_data','generate_report','update_onboarding','record_nps','bulk_update_tasks'],
 MEDIA_BUYER:['create_client','update_client','add_client_contact','archive_client','restore_client','create_task','update_task','reassign_task','archive_task','restore_task','mark_posted','attach_file','remind_me','create_leave_request','sync_campaign','update_campaign','start_integration','disconnect_integration','export_data','generate_report'],
 CREATOR:['attach_file','remind_me','create_leave_request'],
 ACCOUNTANT:['create_client','log_expense','record_payment','create_invoice','attach_file','remind_me','create_leave_request','upsert_payroll','set_payroll_status','send_email','export_data','generate_report','bulk_remind_clients'],
 SALES:['create_lead','update_lead','move_lead','archive_lead','remind_me','create_leave_request','send_email','send_whatsapp','export_data'],
 CLIENT:['attach_file','remind_me']
};
function session(){const jar=new Map();const absorb=res=>{const vals=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[res.headers.get('set-cookie')].filter(Boolean);for(const raw of vals){const first=String(raw).split(';',1)[0],i=first.indexOf('=');if(i>0)jar.set(first.slice(0,i),first.slice(i+1))}};const req=async(path,opt={})=>{const h=new Headers(opt.headers||{});if(jar.size)h.set('cookie',[...jar].map(([k,v])=>`${k}=${v}`).join('; '));let r=await fetch(BASE+path,{...opt,headers:h,redirect:'manual'});absorb(r);for(let i=0;i<4&&r.status>=300&&r.status<400;i++){const loc=r.headers.get('location');if(!loc)break;const u=new URL(loc,BASE);const hh=new Headers();if(jar.size)hh.set('cookie',[...jar].map(([k,v])=>`${k}=${v}`).join('; '));r=await fetch(u,{headers:hh,redirect:'manual'});absorb(r)}return r};return{req};}
async function body(r){const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,240)}}}
async function login(role,cred){const s=session();const c=await body(await s.req('/api/auth/csrf'));if(!c.csrfToken)throw Error(`${role}:csrf`);await s.req('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:c.csrfToken,email:cred.email,password:cred.password,callbackUrl:BASE+'/dashboard',redirect:'false'})});const sr=await s.req('/api/auth/session'),sj=await body(sr);if(sr.status!==200||sj?.user?.role!==role||sj?.user?.authValid!==true)throw Error(`${role}:auth:${sr.status}:${sj?.user?.role}`);return s}
const report={base:BASE,startedAt:new Date().toISOString(),roles:{},passed:true};
for(const [role,cred] of Object.entries(roles)){
 const s=await login(role,cred),rr={questions:{passed:0,total:100,failures:[]},executions:{passed:0,total:50,failures:[]},rbac:{passed:0,total:allowed[role].length,failures:[]}};console.log(`ROLE ${role} START`);
 const questions=[];for(let round=1;round<=5;round++)for(const seed of seeds)questions.push(`${seed} Role=${role}; certification variant ${round}.`);
 for(let i=0;i<questions.length;i++){const r=await s.req('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:questions[i],attachments:[]})}),j=await body(r);const ok=r.status===200&&typeof j.answer==='string'&&j.answer.trim().length>0&&!j.actionProposal&&!j.actionPlan;if(ok)rr.questions.passed++;else rr.questions.failures.push({i:i+1,status:r.status,mode:j.mode,error:j.error||null});if((i+1)%20===0)console.log(`${role} Q ${i+1}/100 pass=${rr.questions.passed}`)}
 for(const op of allowed[role]){const r=await s.req('/api/assistant/actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op,args:{},dryRun:true})}),j=await body(r);const ok=r.status===200&&j?.approval?.mode!=='BLOCK';if(ok)rr.rbac.passed++;else rr.rbac.failures.push({op,status:r.status,approval:j?.approval?.mode,error:j?.error||null})}
 for(let i=1;i<=50;i++){const title=`VIVITO Role QA ${role} ${String(i).padStart(2,'0')}`;const r=await s.req('/api/assistant/actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'remind_me',args:{title,message:`Live role certification ${role} case ${i}`,link:'/dashboard/today'},confirm:true,requestId:`vivito-role-live-${role}-${Date.now()}-${i}`})}),j=await body(r);if(r.status===200&&j.success===true&&j.action==='remind_me')rr.executions.passed++;else rr.executions.failures.push({i,status:r.status,error:j.error||null});if(i%10===0)console.log(`${role} EXEC ${i}/50 pass=${rr.executions.passed}`)}
 rr.passed=rr.questions.passed===100&&rr.executions.passed===50&&rr.rbac.passed===rr.rbac.total;report.roles[role]=rr;if(!rr.passed)report.passed=false;console.log(`ROLE ${role} RESULT ${JSON.stringify(rr)}`)
}
report.finishedAt=new Date().toISOString();report.questions={passed:Object.values(report.roles).reduce((n,r)=>n+r.questions.passed,0),total:700};report.executions={passed:Object.values(report.roles).reduce((n,r)=>n+r.executions.passed,0),total:350};report.rbac={passed:Object.values(report.roles).reduce((n,r)=>n+r.rbac.passed,0),total:Object.values(report.roles).reduce((n,r)=>n+r.rbac.total,0)};console.log('VIVITO_ALL_ROLES_LIVE_RESULT '+JSON.stringify(report));if(!report.passed)process.exit(1);