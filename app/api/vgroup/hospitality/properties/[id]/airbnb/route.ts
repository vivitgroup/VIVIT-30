import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {validateAirbnbIcalUrl} from "@/lib/vgroup/airbnb-ical";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;
const listing=/^[A-Za-z0-9_-]{2,160}$/;

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireApiPermission("hospitality","properties:view");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [property]=await sql<{id:string;name:string}[]>`select id::text,name from hospitality.properties where id=${id}::uuid and archived_at is null limit 1`;
    if(!property)return NextResponse.json({error:"Property not found"},{status:404,headers:NO_STORE});
    const [connection]=await sql<{id:string;external_listing_id:string;status:string;last_sync_at:string|null;last_error:string|null;has_feed:boolean}[]>`
      select id::text,external_listing_id,status,last_sync_at::text,last_error,(token_ref is not null and btrim(token_ref)<>'') has_feed
      from hospitality.channel_connections where property_id=${id}::uuid and channel='airbnb' order by created_at limit 1`;
    return NextResponse.json({property,connection:connection??null},{headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:NO_STORE});
    const body=await request.json().catch(()=>null) as {externalListingId?:string;icalUrl?:string}|null;
    const externalListingId=String(body?.externalListingId??"").trim();
    const icalUrl=String(body?.icalUrl??"").trim();
    if(!listing.test(externalListingId))return NextResponse.json({error:"Invalid Airbnb listing id"},{status:400,headers:NO_STORE});
    if(icalUrl)validateAirbnbIcalUrl(icalUrl);
    const sql=getVGroupSql();
    const [property]=await sql<{business_unit_id:string}[]>`select business_unit_id::text from hospitality.properties where id=${id}::uuid and archived_at is null limit 1`;
    if(!property)return NextResponse.json({error:"Property not found"},{status:404,headers:NO_STORE});
    const [duplicate]=await sql<{id:string;property_id:string}[]>`select id::text,property_id::text from hospitality.channel_connections where channel='airbnb' and external_listing_id=${externalListingId} and property_id<>${id}::uuid limit 1`;
    if(duplicate)return NextResponse.json({error:"This Airbnb listing is already linked to another property"},{status:409,headers:NO_STORE});
    const [existing]=await sql<{id:string;token_ref:string|null}[]>`select id::text,token_ref from hospitality.channel_connections where property_id=${id}::uuid and channel='airbnb' order by created_at limit 1`;
    let connection:{id:string;external_listing_id:string;status:string};
    if(existing){
      const nextFeed=icalUrl||existing.token_ref;
      if(!nextFeed)return NextResponse.json({error:"Airbnb iCal URL is required"},{status:400,headers:NO_STORE});
      [connection]=await sql<{id:string;external_listing_id:string;status:string}[]>`
        update hospitality.channel_connections set external_listing_id=${externalListingId},token_ref=${nextFeed},status='pending',last_error=null,last_sync_at=null,updated_at=now() where id=${existing.id}::uuid returning id::text,external_listing_id,status`;
    }else{
      if(!icalUrl)return NextResponse.json({error:"Airbnb iCal URL is required"},{status:400,headers:NO_STORE});
      [connection]=await sql<{id:string;external_listing_id:string;status:string}[]>`
        insert into hospitality.channel_connections(property_id,channel,external_listing_id,status,token_ref) values(${id}::uuid,'airbnb',${externalListingId},'pending',${icalUrl}) returning id::text,external_listing_id,status`;
    }
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${property.business_unit_id}::uuid,${session.userId}::uuid,'property.airbnb.connection.save','property',${id}::uuid,jsonb_build_object('connection_id',${connection.id},'external_listing_id',${externalListingId},'feed_replaced',${Boolean(icalUrl)}))`;
    return NextResponse.json({connection},{status:existing?200:201,headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [property]=await sql<{business_unit_id:string}[]>`select business_unit_id::text from hospitality.properties where id=${id}::uuid and archived_at is null limit 1`;
    if(!property)return NextResponse.json({error:"Property not found"},{status:404,headers:NO_STORE});
    const [connection]=await sql<{id:string}[]>`select id::text from hospitality.channel_connections where property_id=${id}::uuid and channel='airbnb' order by created_at limit 1`;
    if(!connection)return NextResponse.json({ok:true,alreadyDisconnected:true},{headers:NO_STORE});
    await sql.begin(async tx=>{
      await tx`update hospitality.channel_connections set status='disabled',token_ref=null,last_error=null,updated_at=now() where id=${connection.id}::uuid`;
      await tx`update hospitality.calendar_blocks set archived_at=now(),updated_at=now() where channel_connection_id=${connection.id}::uuid and archived_at is null and ends_on>=current_date`;
      await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${property.business_unit_id}::uuid,${session.userId}::uuid,'property.airbnb.connection.disable','property',${id}::uuid,jsonb_build_object('connection_id',${connection.id}))`;
    });
    return NextResponse.json({ok:true},{headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}
