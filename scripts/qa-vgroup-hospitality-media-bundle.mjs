import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:!!ok});

const media=read('components/media/MediaIntelligenceWorkspaceV2.tsx');
const hospitalityLayout=read('app/group/hospitality/layout.tsx');
const hospitalityCalendar=read('app/group/hospitality/calendar/page.tsx');
const syncAll=read('components/vgroup/airbnb-sync-all-button.tsx');
const airbnbRoute=read('app/api/vgroup/hospitality/properties/[id]/airbnb/route.ts');

check('Media Control exposes explicit from/to range state',media.includes('[from,setFrom]')&&media.includes('[to,setTo]'));
check('Media Control uses Cairo calendar dates',media.includes('timeZone:"Africa/Cairo"')&&media.includes('cairoDate'));
check('Media Control supports selected range campaign sync',media.includes('op:"sync_campaign",campaignId:id,from,to'));
check('Media Control smart-sync skips fresh matching periods',media.includes('same=ps===a&&pe===b')&&media.includes('recent=')&&media.includes('skipped++'));
check('Media Control auto-refresh remains enabled',media.includes('setInterval')&&media.includes('load(from,to)')&&media.includes('30000'));
check('Hospitality shell uses premium white/gold palette',hospitalityLayout.includes('background:#FFFDF8')&&hospitalityLayout.includes('--vh-gold:#C99A3D')&&!hospitalityLayout.includes('background:#0C1B2A'));
check('Hospitality navigation keeps Calendar & Airbnb entry',hospitalityLayout.includes('Calendar & Airbnb'));
check('Airbnb calendar is backed by real channel connections',hospitalityCalendar.includes("c.channel='airbnb'")&&hospitalityCalendar.includes('hospitality.calendar_blocks'));
check('Airbnb calendar exposes per-listing sync',hospitalityCalendar.includes('<AirbnbSyncButton'));
check('Airbnb calendar exposes sync-all control',hospitalityCalendar.includes('<AirbnbSyncAllButton/>')&&syncAll.includes('/api/vgroup/hospitality/calendar-sync-all'));
check('Airbnb connection persists iCal feed reference',airbnbRoute.includes('token_ref')&&airbnbRoute.includes('icalUrl'));

const failed=checks.filter(item=>!item.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Hospitality + Media bundle checks passed.`);
if(failed.length)process.exit(1);
