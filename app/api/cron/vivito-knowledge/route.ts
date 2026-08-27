export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {ingestVivitoKnowledgeBatch} from "@/lib/vivito/live-knowledge-fabric";

function authorized(req:NextRequest){const expected=process.env.CRON_SECRET;if(!expected)return false;const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");const supplied=req.headers.get("x-cron-secret")||bearer;return supplied===expected}

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const startedAt=new Date().toISOString();
 const egyptRealEstate=await ingestVivitoKnowledgeBatch({market:"EGYPT",domain:"REAL_ESTATE",limit:10});
 const allDomains=await ingestVivitoKnowledgeBatch({limit:30});
 const merged=new Map<string,any>();for(const item of [...egyptRealEstate,...allDomains])merged.set(String(item.sourceId),item);
 const results=[...merged.values()],ok=results.filter(x=>x.ok).length,changed=results.filter(x=>x.ok&&x.changed).length,failed=results.filter(x=>!x.ok).length;
 return NextResponse.json({ok:failed===0,startedAt,finishedAt:new Date().toISOString(),priority:"EGYPT_REAL_ESTATE_FIRST",sources:results.length,succeeded:ok,changed,failed,results},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
