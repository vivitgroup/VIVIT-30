import {NextRequest,NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {syncAirbnbChannel} from "@/lib/vgroup/airbnb-sync-service";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIVE_REFRESH_MS=2*60*1000;

type Block={id:string;property_id:string;property_name:string;summary:string;starts_on:string;ends_on:string;source:string};

export async function GET(req:NextRequest){
  try{
    const session=await requireApiPermission("hospitality","reservations:view");
    const propertyId=req.nextUrl.searchParams.get("propertyId")||"";
    if(propertyId&&!uuid.test(propertyId))return NextResponse.json({error:"Invalid propertyId"},{status:400});
    const sql=getVGroupSql();
    let syncWarning:string|null=null;
    if(propertyId){
      const [channel]=await sql<{id:string;last_sync_at:string|null}[]>`
        select id::text,last_sync_at::text
        from hospitality.channel_connections
        where property_id=${propertyId}::uuid and channel='airbnb' and status<>'disabled'
          and token_ref is not null and btrim(token_ref)<>''
        order by created_at limit 1`;
      const lastSync=channel?.last_sync_at?new Date(channel.last_sync_at).getTime():0;
      if(channel&&(!lastSync||Date.now()-lastSync>LIVE_REFRESH_MS)){
        try{await syncAirbnbChannel(channel.id,session.userId)}
        catch(error){syncWarning=error instanceof Error?error.message:"Airbnb calendar refresh failed"}
      }
    }
    const blocks=propertyId
      ?await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and p.archived_at is null and b.property_id=${propertyId}::uuid and b.ends_on>=current_date order by b.starts_on limit 300`
      :await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and p.archived_at is null and b.ends_on>=current_date order by b.starts_on limit 300`;
    return NextResponse.json({blocks:Array.from(blocks),syncWarning},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
