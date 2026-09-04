import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const helper=read("lib/vgroup/airbnb-ical.ts");
const sync=read("app/api/vgroup/hospitality/calendar-sync/route.ts");
const finance=read("app/api/vgroup/hospitality/airbnb-finance/route.ts");
const blocks=read("db/migrations/20260902_hospitality_airbnb_calendar_blocks.sql");
const financial=read("db/migrations/20260902_hospitality_airbnb_financial_pending.sql");

const successResponse=/NextResponse\.json\(\{ok:true,listing:channel\.external_listing_id,events:events\.length\}/.test(sync);
const errorResponse=/NextResponse\.json\(\{error:message\}/.test(sync);

const checks=[
  ["HTTPS Airbnb host allowlist",helper.includes('url.protocol!=="https:"')&&helper.includes('url.hostname!==AIRBNB_ICAL_HOST')&&helper.includes('AIRBNB_ICAL_HOST="www.airbnb.com"')],
  ["Airbnb calendar path restricted",helper.includes('/calendar/ical/')&&helper.includes('.endsWith(".ics")')],
  ["No credential/port authority fields",helper.includes("url.username||url.password||url.port")],
  ["DNS resolution checked",helper.includes('lookup(url.hostname,{all:true,verbatim:true})')&&helper.includes("isPublicAddress")],
  ["Loopback/private IP ranges blocked",helper.includes("a===127")&&helper.includes("a===10")&&helper.includes("a===192&&b===168")&&helper.includes('value==="::1"')],
  ["Redirects blocked",helper.includes('redirect:"manual"')&&helper.includes("calendar redirect was blocked")],
  ["Fetch timeout enforced",helper.includes("FETCH_TIMEOUT_MS=15_000")&&helper.includes("AbortSignal.timeout(FETCH_TIMEOUT_MS)")],
  ["Response bounded to 2MB",helper.includes("MAX_ICAL_BYTES=2*1024*1024")&&helper.includes("total>MAX_ICAL_BYTES")],
  ["ICS content contract checked",helper.includes("BEGIN:VCALENDAR")&&helper.includes("END:VCALENDAR")],
  ["Parser event cap",helper.includes("MAX_EVENTS=5000")&&helper.includes("rawBlocks.length>MAX_EVENTS")],
  ["Parser line cap",helper.includes("MAX_LINE_LENGTH=16*1024")&&helper.includes("line.length>MAX_LINE_LENGTH")],
  ["DTEND exclusive boundary preserved",helper.includes("endsOn>startsOn")&&blocks.includes("ends_on date not null")],
  ["Calendar event idempotency",blocks.includes("unique (channel_connection_id, external_uid)")&&sync.includes("on conflict(channel_connection_id,external_uid) do update")],
  ["Disappeared future events reconciled",sync.includes("last_seen_at<${syncStarted}::timestamptz")&&sync.includes("archived_at=now()")],
  ["iCal secret not returned",successResponse&&errorResponse&&!/NextResponse\.json\([^\n]*token_ref/.test(sync)],
  ["Calendar table client access revoked",blocks.includes("revoke all on hospitality.calendar_blocks from anon, authenticated")],
  ["Financial completion remains manual",financial.includes("finance_status text not null default 'pending'")&&finance.includes("finance_status='complete'")],
  ["No auto-financial fabrication from iCal",!sync.includes("gross_amount")&&!sync.includes("net_payout")],
  ["Reservation upsert idempotent",finance.includes("on conflict(source,external_reservation_id) do update")],
  ["Reservation overlap surfaces conflict",finance.includes("reservations_no_active_overlap")&&finance.includes("status:409")],
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
if(failed.length){console.error(`Hospitality Airbnb QA failed: ${failed.length}/${checks.length}`);process.exit(1)}
console.log(`Hospitality Airbnb QA passed: ${checks.length}/${checks.length}`);
