import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const noStore={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;
const statuses=new Set(["active","maintenance","inactive","archived"]);
const propertyTypes=new Set(["apartment","villa","studio","chalet","hotel_unit","other"]);

type PatchBody={ownerId?:string|null;reason?:string;name?:string;propertyType?:string;addressLine1?:string|null;addressLine2?:string|null;city?:string|null;country?:string;timezone?:string;bedrooms?:number;bathrooms?:number;maxGuests?:number;status?:string};

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","properties:update");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"Invalid property id"},{status:400,headers:noStore});
    const body=await request.json() as PatchBody;
    const ownerSpecified=Object.prototype.hasOwnProperty.call(body,"ownerId");
    const ownerId=body.ownerId?String(body.ownerId):null;
    if(ownerSpecified&&ownerId&&!uuid.test(ownerId))return NextResponse.json({error:"Invalid owner id"},{status:400,headers:noStore});
    const detailsSpecified=["name","propertyType","addressLine1","addressLine2","city","country","timezone","bedrooms","bathrooms","maxGuests","status"].some(key=>Object.prototype.hasOwnProperty.call(body,key));
    if(!ownerSpecified&&!detailsSpecified)return NextResponse.json({error:"No property changes supplied"},{status:400,headers:noStore});

    const name=body.name?.trim();
    const propertyType=body.propertyType?.trim();
    const country=body.country?.trim().toUpperCase();
    const timezone=body.timezone?.trim();
    const status=body.status?.trim();
    const bedrooms=body.bedrooms==null?undefined:Number(body.bedrooms);
    const bathrooms=body.bathrooms==null?undefined:Number(body.bathrooms);
    const maxGuests=body.maxGuests==null?undefined:Number(body.maxGuests);
    if(name!==undefined&&name.length<2)return NextResponse.json({error:"Property name is too short"},{status:400,headers:noStore});
    if(propertyType!==undefined&&!propertyTypes.has(propertyType))return NextResponse.json({error:"Invalid property type"},{status:400,headers:noStore});
    if(country!==undefined&&!/^[A-Z]{2,3}$/.test(country))return NextResponse.json({error:"Invalid country code"},{status:400,headers:noStore});
    if(timezone!==undefined&&timezone.length<3)return NextResponse.json({error:"Invalid timezone"},{status:400,headers:noStore});
    if(status!==undefined&&!statuses.has(status))return NextResponse.json({error:"Invalid property status"},{status:400,headers:noStore});
    if(bedrooms!==undefined&&(!Number.isFinite(bedrooms)||bedrooms<0||!Number.isInteger(bedrooms)))return NextResponse.json({error:"Invalid bedrooms"},{status:400,headers:noStore});
    if(bathrooms!==undefined&&(!Number.isFinite(bathrooms)||bathrooms<0))return NextResponse.json({error:"Invalid bathrooms"},{status:400,headers:noStore});
    if(maxGuests!==undefined&&(!Number.isFinite(maxGuests)||maxGuests<1||!Number.isInteger(maxGuests)))return NextResponse.json({error:"Invalid max guests"},{status:400,headers:noStore});

    const sql=getVGroupSql();
    const [existing]=await sql<{id:string;business_unit_id:string}[]>`select id::text,business_unit_id::text from hospitality.properties where id=${id}::uuid and archived_at is null`;
    if(!existing)return NextResponse.json({error:"Property not found"},{status:404,headers:noStore});
    if(ownerSpecified&&ownerId){const [owner]=await sql`select id from hospitality.owners where id=${ownerId}::uuid and business_unit_id=${existing.business_unit_id}::uuid and archived_at is null`;if(!owner)return NextResponse.json({error:"Owner unavailable"},{status:404,headers:noStore})}

    await sql.begin(async tx=>{
      if(detailsSpecified){
        await tx`update hospitality.properties set
          name=case when ${name!==undefined} then ${name??null} else name end,
          property_type=case when ${propertyType!==undefined} then ${propertyType??null} else property_type end,
          address_line1=case when ${Object.prototype.hasOwnProperty.call(body,"addressLine1")} then ${body.addressLine1?.trim()||null} else address_line1 end,
          address_line2=case when ${Object.prototype.hasOwnProperty.call(body,"addressLine2")} then ${body.addressLine2?.trim()||null} else address_line2 end,
          city=case when ${Object.prototype.hasOwnProperty.call(body,"city")} then ${body.city?.trim()||null} else city end,
          country=case when ${country!==undefined} then ${country??null} else country end,
          timezone=case when ${timezone!==undefined} then ${timezone??null} else timezone end,
          bedrooms=case when ${bedrooms!==undefined} then ${bedrooms??0} else bedrooms end,
          bathrooms=case when ${bathrooms!==undefined} then ${bathrooms??0} else bathrooms end,
          max_guests=case when ${maxGuests!==undefined} then ${maxGuests??1} else max_guests end,
          status=case when ${status!==undefined} then ${status??null} else status end,
          updated_at=now()
          where id=${id}::uuid`;
      }
      if(ownerSpecified)await tx`select hospitality.set_property_owner(${id}::uuid,${ownerId}::uuid,${session.userId}::uuid,${body.reason??"property edit"})`;
      await tx`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${existing.business_unit_id}::uuid,${session.userId}::uuid,'property.update','property',${id}::uuid,${JSON.stringify({ownerSpecified,ownerId:ownerSpecified?ownerId:undefined,name,propertyType,addressLine1:body.addressLine1,addressLine2:body.addressLine2,city:body.city,country,timezone,bedrooms,bathrooms,maxGuests,status,reason:body.reason??null})}::jsonb)`;
    });
    const [property]=await sql`select id::text,owner_id::text,name,property_type,address_line1,address_line2,city,country,timezone,bedrooms,bathrooms,max_guests,status from hospitality.properties where id=${id}::uuid`;
    return NextResponse.json({ok:true,property},{headers:noStore});
  }catch(error){return apiErrorResponse(error)}
}
