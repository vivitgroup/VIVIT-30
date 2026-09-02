import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

type Event={uid:string;summary:string;startsOn:string;endsOn:string};
function unescapeText(value:string){return value.replace(/\\n/gi," ").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\").trim()}
function dateValue(value:string){const v=value.trim();if(/^\d{8}$/.test(v))return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;const m=v.match(/^(\d{4})(\d{2})(\d{2})T/);return m?`${m[1]}-${m[2]}-${m[3]}`:null}
function parseIcs(text:string):Event[]{
  const unfolded=text.replace(/\r?\n[ \t]/g,"");
  const blocks=unfolded.split("BEGIN:VEVENT").slice(1).map(chunk=>chunk.split("END:VEVENT")[0]??"");
  const events:Event[]=[];
  for(const block of blocks){
    let uid="",summary="Unavailable",startsOn:string|null=null,endsOn:string|null=null;
    for(const line of block.split(/\r?\n/)){
      const idx=line.indexOf(":");if(idx<0)continue;
      const key=line.slice(0,idx).toUpperCase(),value=line.slice(idx+1);
      if(key==="UID")uid=value.trim();
      else if(key==="SUMMARY")summary=unescapeText(value)||"Unavailable";
      else if(key.startsWith("DTSTART"))startsOn=dateValue(value);
      else if(key.startsWith("DTEND"))endsOn=dateValue(value);
    }
    if(uid&&startsOn&&endsOn&&endsOn>startsOn)events.push({uid,summary,startsOn,endsOn});
  }
  return events;
}
function allowedAirbnbIcal(value:string){
  try{const u=new URL(value);return u.protocol==="https:"&&u.hostname==="www.airbnb.com"&&u.pathname.startsWith("/calendar/ical/")}catch{return false}
}

export async function POST(request:Request){
  try{
    await requireApiPermission("hospitality","reservations:create");
    const body=await request.json().catch(()=>null) as {channelId?:string}|null;
    const channelId=String(body?.channelId??"");
    if(!uuid.test(channelId))return NextResponse.json({error:"Invalid channel id"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [channel]=await sql<{id:string;property_id:string;business_unit_id:string;token_ref:string|null;external_listing_id:string}[]>`
      select c.id::text,c.property_id::text,p.business_unit_id::text,c.token_ref,c.external_listing_id
      from hospitality.channel_connections c join hospitality.properties p on p.id=c.property_id
      where c.id=${channelId}::uuid and c.channel='airbnb' and p.archived_at is null limit 1`;
    if(!channel)return NextResponse.json({error:"Airbnb channel not found"},{status:404,headers:NO_STORE});
    if(!channel.token_ref||!allowedAirbnbIcal(channel.token_ref))return NextResponse.json({error:"Airbnb iCal source is not configured"},{status:409,headers:NO_STORE});
    const syncStarted=new Date().toISOString();
    try{
      const response=await fetch(channel.token_ref,{headers:{"User-Agent":"Vivit-Hospitality-CalendarSync/1.0","Accept":"text/calendar,text/plain;q=0.9,*/*;q=0.1"},cache:"no-store",signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`Airbnb calendar returned HTTP ${response.status}`);
      const text=await response.text();
      if(!text.includes("BEGIN:VCALENDAR"))throw new Error("Airbnb calendar payload is invalid");
      const events=parseIcs(text);
      for(const event of events){
        await sql`insert into hospitality.calendar_blocks(business_unit_id,property_id,channel_connection_id,external_uid,summary,starts_on,ends_on,source,last_seen_at,archived_at)
          values(${channel.business_unit_id}::uuid,${channel.property_id}::uuid,${channel.id}::uuid,${event.uid},${event.summary},${event.startsOn}::date,${event.endsOn}::date,'airbnb',now(),null)
          on conflict(channel_connection_id,external_uid) do update set summary=excluded.summary,starts_on=excluded.starts_on,ends_on=excluded.ends_on,last_seen_at=now(),archived_at=null,updated_at=now()`;
      }
      await sql`update hospitality.calendar_blocks set archived_at=now(),updated_at=now() where channel_connection_id=${channel.id}::uuid and archived_at is null and last_seen_at<${syncStarted}::timestamptz and ends_on>=current_date`;
      await sql`update hospitality.channel_connections set status='connected',last_sync_at=now(),last_error=null,updated_at=now() where id=${channel.id}::uuid`;
      return NextResponse.json({ok:true,listing:channel.external_listing_id,events:events.length},{headers:NO_STORE});
    }catch(error){
      const message=error instanceof Error?error.message:"Airbnb calendar sync failed";
      await sql`update hospitality.channel_connections set status='error',last_error=${message.slice(0,500)},updated_at=now() where id=${channel.id}::uuid`;
      return NextResponse.json({error:message},{status:502,headers:NO_STORE});
    }
  }catch(error){return apiErrorResponse(error)}
}
