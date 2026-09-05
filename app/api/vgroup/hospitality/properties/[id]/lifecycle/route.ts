import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const noStore={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

type Body={action?:"archive"|"restore"};

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:noStore});
    const body=await request.json() as Body;
    if(body.action!=="archive"&&body.action!=="restore")return NextResponse.json({error:"Invalid lifecycle action"},{status:400,headers:noStore});
    const sql=getVGroupSql();

    const [property]=await sql<{id:string;business_unit_id:string;name:string;archived_at:string|null}[]>`
      select id::text,business_unit_id::text,name,archived_at::text
      from hospitality.properties where id=${id}::uuid limit 1
    `;
    if(!property)return NextResponse.json({error:"Property not found"},{status:404,headers:noStore});

    if(body.action==="archive"){
      if(property.archived_at)return NextResponse.json({ok:true,alreadyArchived:true},{headers:noStore});
      const [activeStay]=await sql<{count:number}[]>`
        select count(*)::int count
        from hospitality.reservations
        where property_id=${id}::uuid and archived_at is null
          and status not in ('cancelled','no_show','checked_out')
          and check_out>=current_date
      `;
      if(Number(activeStay?.count||0)>0)return NextResponse.json({error:"This property has an active or upcoming booking. Complete or cancel that booking before archiving the property."},{status:409,headers:noStore});
      await sql.begin(async tx=>{
        await tx`update hospitality.properties set archived_at=now(),status='archived',updated_at=now() where id=${id}::uuid and archived_at is null`;
        await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value)
          values(${property.business_unit_id}::uuid,${session.userId}::uuid,'property.archive','property',${id}::uuid,${JSON.stringify({name:property.name,historyPreserved:true})}::jsonb)`;
      });
      return NextResponse.json({ok:true,archived:true},{headers:noStore});
    }

    if(!property.archived_at)return NextResponse.json({ok:true,alreadyActive:true},{headers:noStore});
    await sql.begin(async tx=>{
      await tx`update hospitality.properties set archived_at=null,status='active',updated_at=now() where id=${id}::uuid`;
      await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value)
        values(${property.business_unit_id}::uuid,${session.userId}::uuid,'property.restore','property',${id}::uuid,${JSON.stringify({name:property.name})}::jsonb)`;
    });
    return NextResponse.json({ok:true,restored:true},{headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}
