import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

export async function GET(){
  try{
    await requireApiPermission("hospitality","properties:view");
    const sql=getVGroupSql();
    const rows=await sql`select p.id::text,p.owner_id::text,o.full_name owner_name,p.name,p.property_type,p.city,p.country,p.bedrooms,p.bathrooms,p.max_guests,p.status,
      coalesce((select count(*)::int from hospitality.property_images i where i.property_id=p.id and i.archived_at is null),0) image_count
      from hospitality.properties p left join hospitality.owners o on o.id=p.owner_id
      where p.archived_at is null order by p.created_at desc limit 250`;
    return NextResponse.json({properties:Array.from(rows)},{headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","properties:create");
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body)return NextResponse.json({error:"Invalid property payload"},{status:400,headers:NO_STORE});
    const ownerId=body.ownerId?String(body.ownerId):null;
    const name=String(body.name??"").trim();
    const propertyType=String(body.propertyType??"apartment").trim()||"apartment";
    const addressLine1=body.addressLine1?String(body.addressLine1).trim():null;
    const addressLine2=body.addressLine2?String(body.addressLine2).trim():null;
    const city=body.city?String(body.city).trim():null;
    const country=String(body.country??"EG").trim();
    const bedrooms=Number(body.bedrooms??0),bathrooms=Number(body.bathrooms??0),maxGuests=Number(body.maxGuests??1);
    const validCounts=[bedrooms,bathrooms,maxGuests].every(Number.isFinite)&&[bedrooms,bathrooms,maxGuests].every(Number.isInteger)&&bedrooms>=0&&bathrooms>=0&&maxGuests>=1&&maxGuests<=100;
    const validText=name.length>=2&&name.length<=200&&propertyType.length>=2&&propertyType.length<=80&&country.length>=2&&country.length<=80&&(!addressLine1||addressLine1.length<=300)&&(!addressLine2||addressLine2.length<=300)&&(!city||city.length<=120);
    if(!validCounts||!validText)return NextResponse.json({error:"Invalid property payload"},{status:400,headers:NO_STORE});
    if(ownerId&&!uuid.test(ownerId))return NextResponse.json({error:"Invalid owner id"},{status:400,headers:NO_STORE});
    const sql=getVGroupSql();
    const [row]=await sql`insert into hospitality.properties(business_unit_id,owner_id,name,property_type,address_line1,address_line2,city,country,bedrooms,bathrooms,max_guests,status)
      select bu.id,case when ${ownerId}::text is null then null else o.id end,${name},${propertyType},${addressLine1},${addressLine2},${city},${country},${bedrooms},${bathrooms},${maxGuests},'active'
      from vgroup.business_units bu left join hospitality.owners o on o.id=${ownerId}::uuid and o.business_unit_id=bu.id and o.archived_at is null
      where bu.code='hospitality' and (${ownerId}::text is null or o.id is not null)
      returning id::text,name,status,owner_id::text`;
    if(!row)return NextResponse.json({error:"Owner unavailable"},{status:404,headers:NO_STORE});
    await sql`select hospitality.set_property_owner(${row.id}::uuid,${ownerId}::uuid,${session.userId}::uuid,'property creation')`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) select id,${session.userId}::uuid,'property.create','property',${row.id}::uuid,jsonb_build_object('owner_id',${ownerId}::text,'name',${name}::text) from vgroup.business_units where code='hospitality'`;
    return NextResponse.json({property:row},{status:201,headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}
