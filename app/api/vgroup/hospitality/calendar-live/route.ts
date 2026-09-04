import {NextRequest,NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Block={id:string;property_id:string;property_name:string;summary:string;starts_on:string;ends_on:string;source:string};

export async function GET(req:NextRequest){
  try{
    await requireApiPermission("hospitality","reservations:view");
    const propertyId=req.nextUrl.searchParams.get("propertyId")||"";
    if(propertyId&&!uuid.test(propertyId))return NextResponse.json({error:"Invalid propertyId"},{status:400});
    const sql=getVGroupSql();
    const blocks=propertyId
      ?await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and p.archived_at is null and b.property_id=${propertyId}::uuid and b.ends_on>=current_date order by b.starts_on limit 300`
      :await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id where b.archived_at is null and p.archived_at is null and b.ends_on>=current_date order by b.starts_on limit 300`;
    return NextResponse.json({blocks:Array.from(blocks)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
