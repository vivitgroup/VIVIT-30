import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {fetchAirbnbIcal,parseAirbnbIcal,validateAirbnbIcalUrl} from "@/lib/vgroup/airbnb-ical";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

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
    if(!channel.token_ref)return NextResponse.json({error:"Airbnb iCal source is not configured"},{status:409,headers:NO_STORE});
    try{validateAirbnbIcalUrl(channel.token_ref)}catch{return NextResponse.json({error:"Airbnb iCal source is not configured"},{status:409,headers:NO_STORE})}
    const syncStarted=new Date().toISOString();
    try{
      const text=await fetchAirbnbIcal(channel.token_ref);
      const events=parseAirbnbIcal(text);
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
