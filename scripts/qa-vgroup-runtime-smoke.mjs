import fs from 'node:fs';
const base=(process.env.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
async function req(path,init={}){return fetch(base+path,{redirect:'manual',...init});}
function noStore(res){return String(res.headers.get('cache-control')||'').toLowerCase().includes('no-store');}
try{
  const login=await req('/group/login');
  const loginText=await login.text();
  check('Group login renders from built artifact',login.status===200&&/VIVIT|Group|login|sign in/i.test(loginText),`status=${login.status}`);

  const health=await req('/api/vgroup/health');
  const healthJson=await health.json().catch(()=>({}));
  check('Group health fails closed against CI placeholder database',health.status===503&&healthJson.isolated===true,`status=${health.status} body=${JSON.stringify(healthJson)}`);
  check('Group health is explicit no-store',noStore(health),String(health.headers.get('cache-control')||''));
  check('Group health does not disclose database credentials',!JSON.stringify(healthJson).match(/postgresql:\/\/|service[_-]?key|auth[_-]?secret/i),JSON.stringify(healthJson));

  for(const [name,path] of [
    ['Tech overview','/api/vgroup/tech/overview'],
    ['Hospitality overview','/api/vgroup/hospitality/overview'],
    ['Group finance','/api/vgroup/finance/summary'],
    ['Tech client portal','/api/vgroup/tech/client-portal'],
    ['Hospitality owner portal','/api/vgroup/hospitality/owner-portal'],
  ]){
    const res=await req(path);
    const body=await res.json().catch(()=>({}));
    check(`${name} rejects anonymous runtime access`,res.status===401,`status=${res.status} body=${JSON.stringify(body)}`);
    check(`${name} anonymous rejection is not publicly cacheable`,!String(res.headers.get('cache-control')||'').toLowerCase().includes('public'),String(res.headers.get('cache-control')||''));
  }

  const marketing=await req('/group/marketing');
  const marketingText=await marketing.text();
  check('Marketing dry-run page never exposes an anonymous authenticated cutover',marketing.status!==200||/login|disabled|not authorized|integration|ready/i.test(marketingText),`status=${marketing.status}`);

  const selector=await req('/group');
  check('Anonymous Group selector does not return an authenticated business selector',selector.status!==200||String(selector.headers.get('location')||'').includes('/group/login'),`status=${selector.status} location=${selector.headers.get('location')}`);
}catch(error){check('Vivit Group runtime smoke runner completed',false,String(error));}
const failed=checks.filter(c=>!c.ok);
const evidence={base,total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks};
fs.writeFileSync('/tmp/vgroup-runtime-smoke.json',JSON.stringify(evidence,null,2));
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?` — ${c.detail}`:''}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Vivit Group runtime smoke checks passed.`);
if(failed.length)process.exit(1);
