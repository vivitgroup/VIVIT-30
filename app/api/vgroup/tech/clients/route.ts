import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

const text=(value:unknown)=>String(value??"").trim();

export async function GET(){
 try{
  await requireApiPermission("tech","clients:view");
  const sql=getVGroupSql();
  const rows=await sql`select c.id::text,c.company_name,c.contact_name,c.email,c.phone,c.status from tech.clients c join vgroup.business_units bu on bu.id=c.business_unit_id where bu.code='tech' and bu.status='active' and c.archived_at is null order by c.company_name asc limit 250`;
  return NextResponse.json({clients:Array.from(rows)},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
 try{
  const session=await requireApiPermission("tech","clients:create");
  const body=await request.json() as Record<string,unknown>;
  const companyName=text(body.companyName),contactName=text(body.contactName),email=text(body.email).toLowerCase(),phone=text(body.phone);
  if(companyName.length<2)return NextResponse.json({error:{code:"INVALID_CLIENT_NAME",message:"Company name must be at least 2 characters."}},{status:400});
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:{code:"INVALID_EMAIL",message:"Enter a valid client email."}},{status:400});
  const sql=getVGroupSql();
  const [duplicate]=email?await sql`select c.id::text,c.company_name from tech.clients c join vgroup.business_units bu on bu.id=c.business_unit_id where bu.code='tech' and bu.status='active' and lower(c.email)=lower(${email}) and c.archived_at is null limit 1`:[];
  if(duplicate)return NextResponse.json({error:{code:"CLIENT_EMAIL_EXISTS",message:"A Tech client with this email already exists."}},{status:409});
  const [row]=await sql`insert into tech.clients(business_unit_id,company_name,contact_name,email,phone,status) select bu.id,${companyName},${contactName||null},${email||null},${phone||null},'active' from vgroup.business_units bu where bu.code='tech' and bu.status='active' returning id::text,company_name,contact_name,email,phone,status`;
  if(!row)return NextResponse.json({error:{code:"TECH_UNIT_UNAVAILABLE",message:"Tech business unit is unavailable."}},{status:503});
  await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) select id,${session.userId}::uuid,'client.create','client',${row.id}::uuid,jsonb_build_object('company_name',${companyName}::text,'email',${email||null}::text) from vgroup.business_units where code='tech' and status='active'`;
  return NextResponse.json({client:row},{status:201});
 }catch(error){return apiErrorResponse(error)}
}
