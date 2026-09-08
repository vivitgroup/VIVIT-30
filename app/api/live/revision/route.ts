import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";

export const dynamic="force-dynamic";

type RevisionRow={revision:number|string;updated_at:string|Date|null};

export async function GET(){
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"private, no-store"}});
  const workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:409,headers:{"Cache-Control":"private, no-store"}});

  const [row]=Array.from(await db.execute<RevisionRow>(sql`
    select revision,updated_at
    from live_workspace_revisions
    where workspace_id=${workspaceId}
    limit 1
  `));

  return NextResponse.json({
    revision:String(row?.revision??0),
    updatedAt:row?.updated_at?new Date(row.updated_at).toISOString():null,
  },{headers:{"Cache-Control":"private, no-store"}});
}
