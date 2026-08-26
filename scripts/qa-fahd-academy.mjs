import fs from "node:fs";

const academy=fs.readFileSync("lib/fahd/academy.ts","utf8");
const batch01=fs.readFileSync("lib/fahd/ingested-batch-01.ts","utf8");
const batch02=fs.readFileSync("lib/fahd/ingested-batch-02.ts","utf8");
const notes=fs.readFileSync("lib/fahd/source-notes-batch-03.ts","utf8");
const route=fs.readFileSync("app/api/assistant/route.ts","utf8");
let failed=0,passed=0;
function check(name,ok){if(ok){console.log(`PASS  ${name}`);passed++}else{console.error(`FAIL  ${name}`);failed++}}

const domains=[...academy.matchAll(/name:\"([^\"]+)\",sources:/g)].map(x=>x[1]);
const sourceRows=[...notes.matchAll(/source:\"([^\"]+)\"/g)].map(x=>x[1]);
const batch01Lessons=[...batch01.matchAll(/lessons:\[/g)].length;
const batch02Lessons=[...batch02.matchAll(/lessons:\[/g)].length;
check("FAHD Academy covers at least 14 disciplines",domains.length>=14);
check("FAHD Academy disciplines are unique",new Set(domains).size===domains.length);
check("Academy includes Business Development",/Business & Business Development/.test(academy));
check("Academy includes Performance Marketing",/Performance Marketing & Media Buying/.test(academy));
check("Academy includes Content Creation",/Content Creation & Social/.test(academy));
check("Academy includes Graphic Design",/Graphic Design & Visual Communication/.test(academy));
check("Academy includes Video Editing",/Video Editing & Motion/.test(academy));
check("Academy includes Account Management",/Account Management & Client Success/.test(academy));
check("Academy includes Analytics/CRO",/Analytics, Tracking & CRO/.test(academy));
check("Academy includes E-commerce",/E-commerce, DTC & Retention/.test(academy));
check("Batch 01 contains ingested lessons",batch01Lessons>=5);
check("Batch 02 contains ingested lessons",batch02Lessons>=3);
check("Academy wires ingested Batch 01 into runtime context",/FAHD_INGESTED_BATCH_01_CONTEXT/.test(academy));
check("Academy wires ingested Batch 02 into runtime context",/FAHD_INGESTED_BATCH_02_CONTEXT/.test(academy));
check("Validated source notes include multiple independent sources",new Set(sourceRows).size>=10);
check("Validated notes include official Meta guidance",/source:\"Meta for Business\"/.test(notes)&&/sourceType:\"official\"/.test(notes));
check("Validated notes include official Google Ads guidance",/source:\"Google Ads\"/.test(notes));
check("Validated notes include official YouTube guidance",/source:\"YouTube Creator Academy\"/.test(notes));
check("Validated notes include measurement knowledge",/MeasureSchool/.test(notes)&&/Conversion tracking/.test(notes));
check("Validated notes include design hierarchy",/Satori Graphics/.test(notes)&&/Visual hierarchy/.test(notes));
check("Validated notes include founder sales/business knowledge",/Y Combinator/.test(notes)&&/Founder-led selling/.test(notes));
check("Validated notes include performance creative",/Dara Denney/.test(notes)&&/Creative testing/.test(notes));
check("FAHD runtime consumes Academy",/FAHD_ACADEMY_CONTEXT/.test(route));
check("FAHD runtime consumes validated source notes",/FAHD_SOURCE_NOTES_CONTEXT/.test(route));
check("Messages definition is explicit",/Messages campaign: primary result = messaging conversations/.test(route));
check("ATC definition is explicit",/ATC campaign: primary result = Add to Cart/.test(route));
check("Sales definition is explicit",/Sales campaign: primary result = purchases\/orders/.test(route));
check("Lead definition is explicit",/Lead campaign: primary result = leads/.test(route));
check("Mixed Cost per Result is forbidden",/Never combine different result definitions into one Cost per Result/.test(route));
check("FAHD must verify measurement before optimization",/verify measurement integrity before optimizing media/.test(route));
check("FAHD protects role-scoped finance",/Finance is visible only when explicitly supplied in authorized context/.test(route));

console.log(`\n${passed}/${passed+failed} FAHD Academy checks passed.`);
if(failed)process.exit(1);
