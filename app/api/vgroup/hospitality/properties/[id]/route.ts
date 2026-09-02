import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const noStore={"Cache-Control":"private, no-store"};
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:noStore});
    const body=await request.json() as {ownerId?:string|null;reason?:string};
    const ownerId=body.ownerId?String(body.ownerId):null;
    if(ownerId&&!/^[0-9a-f-]{36}$/i.test(ownerId))return NextResponse.json({error:"Invalid owner id"},{status:400,headers:noStore});
    const sql=getVGroupSql();
    const [exists]=await sql`select id::text from hospitality.properties where id=${id}::uuid and archived_at is null`;
    if(!exists)return NextResponse.json({error:"Property not found"},{status:404,headers:noStore});
    await sql`select hospitality.set_property_owner(${id}::uuid,${ownerId}::uuid,${session.userId}::uuid,${body.reason??'owner assignment update'})`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) select business_unit_id,${session.userId}::uuid,'property.owner.change','property',id,jsonb_build_object('owner_id',${ownerId},'reason',${body.reason??null}) from hospitality.properties where id=${id}::uuid`;
    return NextResponse.json({ok:true,ownerId},{headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}
