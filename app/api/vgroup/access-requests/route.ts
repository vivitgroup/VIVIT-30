import {NextRequest,NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {requireVGroupSession} from "@/lib/vgroup/session";

const valid=new Set(["group","marketing","tech","hospitality"]);

export async function POST(request:NextRequest){
  const session=await requireVGroupSession();
  const form=await request.formData();
  const workspace=String(form.get("workspace")??"").trim();
  if(!valid.has(workspace))return NextResponse.json({error:{code:"INVALID_WORKSPACE",message:"Invalid workspace"}},{status:400,headers:{"Cache-Control":"no-store"}});
  const sql=getVGroupSql();
  let businessUnitId:string|null=null;
  if(workspace!=="group"){
    const [unit]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code=${workspace} and status='active' limit 1`;
    businessUnitId=unit?.id??null;
  }
  const [existing]=await sql<{id:string}[]>`select id::text from vgroup.approval_requests where entity_type='workspace_access' and entity_id=${session.userId}::uuid and requested_by=${session.userId}::uuid and action=${`request_${workspace}_access`} and status='pending' limit 1`;
  if(!existing){
    await sql`insert into vgroup.approval_requests(business_unit_id,entity_type,entity_id,action,requested_by,status,metadata) values(${businessUnitId}::uuid,'workspace_access',${session.userId}::uuid,${`request_${workspace}_access`},${session.userId}::uuid,'pending',${JSON.stringify({workspace})}::jsonb)`;
  }
  const url=new URL(`/group/access?workspace=${encodeURIComponent(workspace)}&reason=permission&requested=1`,request.url);
  const response=NextResponse.redirect(url,303);
  response.headers.set("Cache-Control","no-store");
  return response;
}
