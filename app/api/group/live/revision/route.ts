import {NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

type Row={revision:number|string;updated_at:string|Date|null};

export async function GET(){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"private, no-store"}});
  const sql=getVGroupSql();
  const [row]=await sql<Row[]>`select revision,updated_at from vgroup.live_revision where id=1 limit 1`;
  return NextResponse.json({revision:String(row?.revision??0),updatedAt:row?.updated_at?new Date(row.updated_at).toISOString():null},{headers:{"Cache-Control":"private, no-store"}});
}
