import {likelyVivitoActionIntent} from '../lib/vivito/action-engine';

const readonly=[
 'What should I verify before updating an assigned client or task?',
 'What should I verify before updating or syncing a campaign?',
 'What must be verified before recording a payment?',
 'How should I review my assigned clients today using health, tasks, campaigns, files and commercial context?',
 'How do I update a client safely?',
 'What should finance verify before recording a payment or invoice?',
 'إيه اللي أتأكد منه قبل ما أسجل دفعة للعميل؟',
 'إزاي أراجع الكامبين قبل ما أعدلها؟',
 'اشرحلي إزاي أعمل تحديث للعميل بشكل آمن من غير تنفيذ.',
];
const actions=[
 'Update client Orbit Labs.',
 'Can you update client Orbit Labs?',
 'Record a payment for client Orbit Labs amount 1000.',
 'Remind me to review the dashboard.',
 'Archive client Orbit Labs.',
 'عايزك تسجل دفعة للعميل Orbit Labs بمبلغ 1000.',
 'عدل العميل Orbit Labs.',
 'اعمل reminder أراجع الداشبورد.',
];
let failed=0;
for(const q of readonly){const actual=likelyVivitoActionIntent(q);const ok=actual===false;console.log(`${ok?'PASS':'FAIL'} READ_ONLY ${JSON.stringify(q)} => ${actual}`);if(!ok)failed++;}
for(const q of actions){const actual=likelyVivitoActionIntent(q);const ok=actual===true;console.log(`${ok?'PASS':'FAIL'} ACTION ${JSON.stringify(q)} => ${actual}`);if(!ok)failed++;}
console.log(`VIVITO_LIVE_INTENT_REGRESSION ${readonly.length+actions.length-failed}/${readonly.length+actions.length} PASS`);
if(failed)process.exit(1);
