import {getVGroupSql} from "@/lib/vgroup/db";
import {fetchAirbnbIcal,parseAirbnbIcal,validateAirbnbIcalUrl} from "@/lib/vgroup/airbnb-ical";

const uuid=/^[0-9a-f-]{36}$/i;

type ChannelRow={id:string;property_id:string;business_unit_id:string;token_ref:string|null;external_listing_id:string;property_name:string};
export type AirbnbSyncResult={ok:true;channelId:string;propertyId:string;propertyName:string;listing:string;events:number;conflicts:number};

export async function syncAirbnbChannel(channelId:string):Promise<AirbnbSyncResult>{
  if(!uuid.test(channelId))throw new Error("Invalid Airbnb channel id");
  const sql=getVGroupSql();
  const [channel]=await sql<ChannelRow[]>`
    select c.id::text,c.property_id::text,p.business_unit_id::text,c.token_ref,c.external_listing_id,p.name property_name
    from hospitality.channel_connections c
    join hospitality.properties p on p.id=c.property_id
    join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active'
    where c.id=${channelId}::uuid and c.channel='airbnb' and p.archived_at is null limit 1`;
  if(!channel)throw new Error("Airbnb channel not found");
  if(!channel.token_ref)throw new Error("Airbnb iCal source is not configured");
  validateAirbnbIcalUrl(channel.token_ref);
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
    const [conflictRow]=await sql<{conflicts:number}[]>`
      select count(*)::int conflicts
      from hospitality.calendar_blocks b
      join hospitality.reservations r on r.property_id=b.property_id and r.archived_at is null and r.status in ('pending','confirmed','checked_in')
      where b.channel_connection_id=${channel.id}::uuid and b.archived_at is null
        and daterange(b.starts_on,b.ends_on,'[)') && daterange(r.check_in,r.check_out,'[)')`;
    const conflicts=Number(conflictRow?.conflicts??0);
    const warning=conflicts>0?`${conflicts} Airbnb availability conflict${conflicts===1?"":"s"} with active VIVIT reservations`:null;
    await sql`update hospitality.channel_connections set status='connected',last_sync_at=now(),last_error=${warning},updated_at=now() where id=${channel.id}::uuid`;
    return {ok:true,channelId:channel.id,propertyId:channel.property_id,propertyName:channel.property_name,listing:channel.external_listing_id,events:events.length,conflicts};
  }catch(error){
    const message=error instanceof Error?error.message:"Airbnb calendar sync failed";
    await sql`update hospitality.channel_connections set status='error',last_error=${message.slice(0,500)},updated_at=now() where id=${channel.id}::uuid`;
    throw new Error(message);
  }
}

export async function syncAllAirbnbChannels(){
  const sql=getVGroupSql();
  const channels=await sql<{id:string}[]>`
    select c.id::text
    from hospitality.channel_connections c
    join hospitality.properties p on p.id=c.property_id
    join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active'
    where c.channel='airbnb' and p.archived_at is null and c.token_ref is not null and btrim(c.token_ref)<>''
    order by c.created_at`;
  const results:{channelId:string;ok:boolean;events?:number;conflicts?:number;listing?:string;propertyName?:string;error?:string}[]=[];
  for(const row of channels){
    try{const result=await syncAirbnbChannel(row.id);results.push({channelId:row.id,ok:true,events:result.events,conflicts:result.conflicts,listing:result.listing,propertyName:result.propertyName})}
    catch(error){results.push({channelId:row.id,ok:false,error:error instanceof Error?error.message:"Airbnb calendar sync failed"})}
  }
  return {total:channels.length,synced:results.filter(item=>item.ok).length,failed:results.filter(item=>!item.ok).length,conflicts:results.reduce((sum,item)=>sum+(item.conflicts??0),0),results};
}
