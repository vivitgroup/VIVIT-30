import {NextRequest,NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};

type Body={
  action?:string;
  businessUnit?:"marketing"|"hospitality"|"tech"|"group";
  id?:string;
  decisionId?:string;
  title?:string;
  decisionType?:"STRATEGIC"|"FINANCIAL"|"OPERATIONAL"|"RISK"|"PEOPLE"|"INVESTMENT";
  decisionText?:string;
  status?:string;
  priority?:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  dueAt?:string;
};

async function businessUnitId(code:Body["businessUnit"]){
  if(!code||code==="group")return null;
  const sql=getVGroupSql();
  const [row]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code=${code} and status='active' limit 1`;
  if(!row)throw new Error("BUSINESS_UNIT_NOT_FOUND");
  return row.id;
}

export async function POST(request:NextRequest){
  const session=await requireGroupSuperAdmin();
  const body=await request.json().catch(()=>null) as Body|null;
  if(!body?.action)return NextResponse.json({error:"Action is required"},{status:400,headers:NO_STORE});
  const sql=getVGroupSql();
  try{
    if(body.action==="decision_create"){
      if(!body.title?.trim()||!body.decisionType)return NextResponse.json({error:"Title and decision type are required"},{status:400,headers:NO_STORE});
      const bu=await businessUnitId(body.businessUnit);
      const [row]=await sql<{id:string}[]>`
        insert into vgroup.board_decisions(business_unit_id,title,decision_type,decision_text,created_by)
        values(${bu}::uuid,${body.title.trim()},${body.decisionType},${body.decisionText?.trim()||null},${session.userId}::uuid)
        returning id::text`;
      return NextResponse.json({ok:true,id:row.id},{headers:NO_STORE});
    }
    if(body.action==="decision_status"){
      const allowed=new Set(["OPEN","APPROVED","REJECTED","DEFERRED","CLOSED"]);
      if(!body.id||!body.status||!allowed.has(body.status))return NextResponse.json({error:"Valid id and status are required"},{status:400,headers:NO_STORE});
      await sql`update vgroup.board_decisions set status=${body.status},decided_by=${session.userId}::uuid,decided_at=case when ${body.status} in ('APPROVED','REJECTED','DEFERRED','CLOSED') then now() else decided_at end,updated_at=now() where id=${body.id}::uuid`;
      return NextResponse.json({ok:true},{headers:NO_STORE});
    }
    if(body.action==="action_create"){
      if(!body.title?.trim())return NextResponse.json({error:"Title is required"},{status:400,headers:NO_STORE});
      const bu=await businessUnitId(body.businessUnit);
      const [row]=await sql<{id:string}[]>`
        insert into vgroup.board_action_items(decision_id,business_unit_id,title,priority,due_at,created_by)
        values(${body.decisionId||null}::uuid,${bu}::uuid,${body.title.trim()},${body.priority||"MEDIUM"},${body.dueAt||null}::date,${session.userId}::uuid)
        returning id::text`;
      return NextResponse.json({ok:true,id:row.id},{headers:NO_STORE});
    }
    if(body.action==="action_status"){
      const allowed=new Set(["OPEN","IN_PROGRESS","BLOCKED","DONE","CANCELLED"]);
      if(!body.id||!body.status||!allowed.has(body.status))return NextResponse.json({error:"Valid id and status are required"},{status:400,headers:NO_STORE});
      await sql`update vgroup.board_action_items set status=${body.status},completed_at=case when ${body.status}='DONE' then now() else null end,updated_at=now() where id=${body.id}::uuid`;
      return NextResponse.json({ok:true},{headers:NO_STORE});
    }
    return NextResponse.json({error:"Unsupported action"},{status:400,headers:NO_STORE});
  }catch(error){
    const message=error instanceof Error?error.message:"Board operation failed";
    return NextResponse.json({error:message},{status:500,headers:NO_STORE});
  }
}
