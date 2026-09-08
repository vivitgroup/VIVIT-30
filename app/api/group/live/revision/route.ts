import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

type Scope="group"|"hospitality"|"tech";
type Row={revision:number|string;updated_at:string|Date|null};
const SCOPES=new Set<Scope>(["group","hospitality","tech"]);

export async function GET(req:NextRequest){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"private, no-store"}});

  const requested=String(req.nextUrl.searchParams.get("scope")||"group") as Scope;
  const scope:Scope=SCOPES.has(requested)?requested:"group";
  const isGroupAdmin=session.memberships.some(m=>String(m.role)==="GROUP_SUPER_ADMIN");
  if(scope!=="group"&&!isGroupAdmin&&!session.memberships.some(m=>String(m.businessUnit)===scope)){
    return NextResponse.json({error:"Forbidden"},{status:403,headers:{"Cache-Control":"private, no-store"}});
  }

  const sql=getVGroupSql();
  const [row]=await sql<Row[]>`select revision,updated_at from vgroup.live_revision_scopes where scope=${scope} limit 1`;
  return NextResponse.json({scope,revision:String(row?.revision??0),updatedAt:row?.updated_at?new Date(row.updated_at).toISOString():null},{headers:{"Cache-Control":"private, no-store"}});
}
