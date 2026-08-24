const n=v=>Number(v||0),delta=(a,b)=>b?((a-b)/Math.abs(b))*100:0;
function classify({m={},p={},ads=2}){const cost=n(m.costPerResult)||(n(m.results)?n(m.spend)/n(m.results):0),prevCost=n(p.costPerResult)||(n(p.results)?n(p.spend)/n(p.results):0),cd=delta(cost,prevCost),ctr=n(m.ctr),ctrd=delta(ctr,n(p.ctr)),freq=n(m.frequency),roas=n(m.roas),spend=n(m.spend),results=n(m.results);if(prevCost>0&&cd>=45)return"critical-cost";if(prevCost>0&&cd>=20)return"rising-cost";if(n(p.ctr)>0&&ctrd<=-18)return"creative-fatigue";if(freq>=3.5&&ctr<1.2)return"audience-fatigue";if(spend>0&&results===0)return"zero-results";if(ads<=1&&spend>0)return"creative-diversification";if(prevCost>0&&cd<=-15&&roas>=2.5)return"scaling-opportunity";return"healthy"}
const cases=[
 ["critical cost +60%",{m:{costPerResult:160,results:10,spend:1600,ctr:2},p:{costPerResult:100,ctr:2},ads:3},"critical-cost"],
 ["moderate cost +25%",{m:{costPerResult:125,results:10,spend:1250,ctr:2},p:{costPerResult:100,ctr:2},ads:3},"rising-cost"],
 ["CTR drop -30%",{m:{costPerResult:100,results:10,spend:1000,ctr:1.4},p:{costPerResult:100,ctr:2},ads:3},"creative-fatigue"],
 ["high frequency low CTR",{m:{costPerResult:100,results:10,spend:1000,ctr:.9,frequency:4.2},p:{costPerResult:100,ctr:.9},ads:3},"audience-fatigue"],
 ["spend no results",{m:{spend:800,results:0,ctr:1.8},p:{},ads:3},"zero-results"],
 ["single creative",{m:{spend:600,results:6,ctr:2,costPerResult:100},p:{},ads:1},"creative-diversification"],
 ["cost improves and ROAS strong",{m:{costPerResult:80,results:10,spend:800,ctr:2,roas:3.2},p:{costPerResult:100,ctr:2},ads:3},"scaling-opportunity"],
 ["healthy stable",{m:{costPerResult:101,results:10,spend:1010,ctr:2,roas:1.8},p:{costPerResult:100,ctr:2},ads:3},"healthy"]
];
let fail=0;for(const [name,input,want] of cases){const got=classify(input);const ok=got===want;console.log(`${ok?"PASS":"FAIL"}  ${name}: ${got}`);if(!ok)fail++}console.log(`\n${cases.length-fail}/${cases.length} intelligence fixture cases passed.`);if(fail)process.exit(1);
