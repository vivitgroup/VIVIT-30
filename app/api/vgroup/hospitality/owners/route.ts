import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f-]{36}$/i;
const allowedStatus=new Set(["active","suspended","archived"]);
const noStore={"Cache-Control":"private, no-store"};

export async function GET(){
  try{
    await requireApiPermission("hospitality","owners:view");
    const sql=getVGroupSql();
    const rows=await sql`select o.id::text,o.full_name,o.email,o.phone,o.status,count(p.id)::int properties from hospitality.owners o left join hospitality.properties p on p.owner_id=o.id and p.archived_at is null where o.archived_at is null group by o.id order by o.created_at desc limit 250`;
    return NextResponse.json({owners:Array.from(rows)},{headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","owners:create");
    const body=await request.json() as Record<string,unknown>;
    const fullName=String(body.fullName??"").trim();
    const email=body.email?String(body.email).trim().toLowerCase():null;
    const phone=body.phone?String(body.phone).trim():null;
    if(fullName.length<2)return NextResponse.json({error:"Owner name is required"},{status:400,headers:noStore});
    const sql=getVGroupSql();
    const [row]=await sql`insert into hospitality.owners(business_unit_id,full_name,email,phone,status) select id,${fullName},${email},${phone},'active' from vgroup.business_units where code='hospitality' returning id::text,full_name,email,phone,status`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) select id,${session.userId}::uuid,'owner.create','owner',${row.id}::uuid,jsonb_build_object('full_name',${fullName},'email',${email}) from vgroup.business_units where code='hospitality'`;
    return NextResponse.json({owner:row},{status:201,headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}

export async function PATCH(request:Request){
  try{
    const session=await requireApiPermission("hospitality","owners:update");
    const body=await request.json() as Record<string,unknown>;
    const id=String(body.id??"");
    const fullName=String(body.fullName??"").trim();
    const email=body.email?String(body.email).trim().toLowerCase():null;
    const phone=body.phone?String(body.phone).trim():null;
    const status=String(body.status??"").trim();
    if(!uuid.test(id))return NextResponse.json({error:"Invalid owner id"},{status:400,headers:noStore});
    if(fullName.length<2||!allowedStatus.has(status))return NextResponse.json({error:"Invalid owner payload"},{status:400,headers:noStore});
    const sql=getVGroupSql();
    const [before]=await sql<{full_name:string;email:string|null;phone:string|null;status:string;business_unit_id:string}[]>`select full_name,email,phone,status,business_unit_id::text from hospitality.owners where id=${id}::uuid and archived_at is null limit 1`;
    if(!before)return NextResponse.json({error:"Owner not found"},{status:404,headers:noStore});
    const [owner]=await sql`update hospitality.owners set full_name=${fullName},email=${email},phone=${phone},status=${status},archived_at=case when ${status}='archived' then coalesce(archived_at,now()) else null end,updated_at=now() where id=${id}::uuid returning id::text,full_name,email,phone,status`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,old_value,new_value) values(${before.business_unit_id}::uuid,${session.userId}::uuid,'owner.update','owner',${id}::uuid,jsonb_build_object('full_name',${before.full_name},'email',${before.email},'phone',${before.phone},'status',${before.status}),jsonb_build_object('full_name',${fullName},'email',${email},'phone',${phone},'status',${status}))`;
    return NextResponse.json({owner},{headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}
