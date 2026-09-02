import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getVGroupRuntimeConfig} from "@/lib/vgroup/env";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const BUCKET="vgroup-hospitality";
const allowed=new Set(["image/jpeg","image/png","image/webp"]);
const uuid=/^[0-9a-f-]{36}$/i;
function ext(type:string){return type==="image/png"?"png":type==="image/webp"?"webp":"jpg"}
function headers(key:string){return {Authorization:`Bearer ${key}`,apikey:key}}
async function signedUrl(objectPath:string){
  const config=getVGroupRuntimeConfig();
  const response=await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${BUCKET}/${objectPath}`,{method:"POST",headers:{...headers(config.serviceKey),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600}),cache:"no-store"});
  if(!response.ok)return null;
  const data=await response.json() as {signedURL?:string;signedUrl?:string};
  const value=data.signedURL??data.signedUrl;
  return value?`${config.supabaseUrl}/storage/v1${value}`:null;
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireApiPermission("hospitality","properties:view");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400});
    const sql=getVGroupSql();
    const rows=await sql`select id::text,file_name,mime_type,byte_size,caption,alt_text,sort_order,is_cover,object_path from hospitality.property_images where property_id=${id}::uuid and archived_at is null order by is_cover desc,sort_order,created_at`;
    const images=await Promise.all(Array.from(rows).map(async row=>({...row,url:await signedUrl(String(row.object_path))})));
    return NextResponse.json({images},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400});
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({error:"Image file is required"},{status:400});
    if(!allowed.has(file.type)||file.size<=0||file.size>20*1024*1024)return NextResponse.json({error:"Use JPG, PNG or WEBP up to 20MB"},{status:400});
    const sql=getVGroupSql();
    const [property]=await sql`select id::text,business_unit_id::text from hospitality.properties where id=${id}::uuid and archived_at is null`;
    if(!property)return NextResponse.json({error:"Property not found"},{status:404});
    const config=getVGroupRuntimeConfig();
    const objectPath=`properties/${property.business_unit_id}/${id}/${crypto.randomUUID()}.${ext(file.type)}`;
    const upload=await fetch(`${config.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,{method:"POST",headers:{...headers(config.serviceKey),"Content-Type":file.type,"x-upsert":"false"},body:Buffer.from(await file.arrayBuffer())});
    if(!upload.ok)return NextResponse.json({error:"Property image upload failed"},{status:502});
    const coverRequested=String(form.get("isCover")??"")==="true";
    const [count]=await sql`select count(*)::int n from hospitality.property_images where property_id=${id}::uuid and archived_at is null`;
    const isCover=coverRequested||Number(count?.n??0)===0;
    if(isCover)await sql`update hospitality.property_images set is_cover=false,updated_at=now() where property_id=${id}::uuid and archived_at is null and is_cover`;
    try{
      const [image]=await sql`insert into hospitality.property_images(business_unit_id,property_id,object_path,file_name,mime_type,byte_size,caption,alt_text,sort_order,is_cover,created_by) values(${property.business_unit_id}::uuid,${id}::uuid,${objectPath},${file.name.slice(0,250)},${file.type},${file.size},${form.get('caption')?String(form.get('caption')).slice(0,500):null},${form.get('altText')?String(form.get('altText')).slice(0,500):null},${Number(form.get('sortOrder')??count?.n??0)},${isCover},${session.userId}::uuid) returning id::text,file_name,mime_type,byte_size,sort_order,is_cover,object_path`;
      await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${property.business_unit_id}::uuid,${session.userId}::uuid,'property.image.upload','property',${id}::uuid,jsonb_build_object('image_id',${image.id},'is_cover',${isCover},'file_name',${file.name.slice(0,250)}))`;
      return NextResponse.json({image:{...image,url:await signedUrl(objectPath)}},{status:201});
    }catch(error){
      await fetch(`${config.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,{method:"DELETE",headers:headers(config.serviceKey)}).catch(()=>undefined);
      throw error;
    }
  }catch(error){return apiErrorResponse(error)}
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400});
    const body=await request.json() as {imageId?:string};
    if(!body.imageId||!uuid.test(body.imageId))return NextResponse.json({error:"Invalid image id"},{status:400});
    const sql=getVGroupSql();
    const [image]=await sql`select i.id::text,i.object_path,i.is_cover,i.business_unit_id::text from hospitality.property_images i where i.id=${body.imageId}::uuid and i.property_id=${id}::uuid and i.archived_at is null`;
    if(!image)return NextResponse.json({error:"Image not found"},{status:404});
    const config=getVGroupRuntimeConfig();
    const removed=await fetch(`${config.supabaseUrl}/storage/v1/object/${BUCKET}/${image.object_path}`,{method:"DELETE",headers:headers(config.serviceKey)});
    if(!removed.ok&&removed.status!==404)return NextResponse.json({error:"Property image delete failed"},{status:502});
    await sql`update hospitality.property_images set archived_at=now(),is_cover=false,updated_at=now() where id=${body.imageId}::uuid`;
    if(image.is_cover)await sql`update hospitality.property_images set is_cover=true,updated_at=now() where id=(select id from hospitality.property_images where property_id=${id}::uuid and archived_at is null order by sort_order,created_at limit 1)`;
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${image.business_unit_id}::uuid,${session.userId}::uuid,'property.image.delete','property',${id}::uuid,jsonb_build_object('image_id',${body.imageId}))`;
    return NextResponse.json({ok:true});
  }catch(error){return apiErrorResponse(error)}
}
