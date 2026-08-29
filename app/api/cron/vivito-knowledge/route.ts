export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,sql} from "@/lib/db";
import {ingestVivitoKnowledgeBatch} from "@/lib/vivito/live-knowledge-fabric";

function authorized(req:NextRequest){const expected=process.env.CRON_SECRET;if(!expected)return false;const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");const supplied=req.headers.get("x-cron-secret")||bearer;return supplied===expected}
type DbRow=Record<string,unknown>;
type KnowledgeItem=Awaited<ReturnType<typeof ingestVivitoKnowledgeBatch>>[number];
type WorkspaceKnowledgeResult={workspaceId:string;sources:number;succeeded:number;changed:number;failed:number;results:KnowledgeItem[]};
const rows=(value:unknown):DbRow[]=>Array.from(value as Iterable<DbRow>);

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const startedAt=new Date().toISOString();
 const workspaces=rows(await db.execute(sql`select distinct workspace_id from users where workspace_id is not null and workspace_id<>'' and is_active=true order by workspace_id`)).map(r=>String(r.workspace_id||"").trim()).filter(Boolean);
 if(!workspaces.length)return NextResponse.json({ok:true,startedAt,finishedAt:new Date().toISOString(),workspaces:0,sources:0,succeeded:0,changed:0,failed:0,results:[]},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 const workspaceResults:WorkspaceKnowledgeResult[]=[];
 for(const workspaceId of workspaces){
  const egyptRealEstate=await ingestVivitoKnowledgeBatch(workspaceId,{market:"EGYPT",domain:"REAL_ESTATE",limit:10});
  const allDomains=await ingestVivitoKnowledgeBatch(workspaceId,{limit:30});
  const merged=new Map<string,KnowledgeItem>();for(const item of [...egyptRealEstate,...allDomains])merged.set(String(item.sourceId),item);
  const results=[...merged.values()],succeeded=results.filter(x=>x.ok).length,changed=results.filter(x=>x.ok&&x.changed).length,failed=results.filter(x=>!x.ok).length;
  workspaceResults.push({workspaceId,sources:results.length,succeeded,changed,failed,results});
 }
 const sources=workspaceResults.reduce((n,w)=>n+w.sources,0),succeeded=workspaceResults.reduce((n,w)=>n+w.succeeded,0),changed=workspaceResults.reduce((n,w)=>n+w.changed,0),failed=workspaceResults.reduce((n,w)=>n+w.failed,0);
 return NextResponse.json({ok:failed===0,startedAt,finishedAt:new Date().toISOString(),priority:"EGYPT_REAL_ESTATE_FIRST",workspaces:workspaceResults.length,sources,succeeded,changed,failed,results:workspaceResults},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
