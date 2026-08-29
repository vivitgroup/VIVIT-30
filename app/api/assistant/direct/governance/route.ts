export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql,auditLogs} from "@/lib/db";
import {setKillSwitch} from "@/lib/vivito/enterprise-governance";
type DbRow=Record<string,unknown>;
type GovernanceScope="WORKSPACE"|"CLIENT"|"ACTION";
const scopeTypes:readonly GovernanceScope[]=["WORKSPACE","CLIENT","ACTION"];
const isGovernanceScope=(v:string):v is GovernanceScope=>(scopeTypes as readonly string[]).includes(v);
const rows=(v:unknown):DbRow[]=>Array.from(v as Iterable<DbRow>);
const clean=(v:unknown,n=160)=>String(v||"").trim().slice(0,n);
async function sa(){const s=await auth();if(!s?.user||String(s.user.role)!=="SUPER_ADMIN")return null;const userId=clean(s.user.id,160),workspaceId=clean(s.user.workspaceId,160);return userId&&workspaceId?{userId,workspaceId}:null}
export async function GET(){const s=await sa();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const controls=rows(await db.execute(sql`select scope_type,scope_id,autonomy_enabled,kill_switch,max_daily_actions,max_daily_ai_calls,policy_version,updated_at from vivito_governance_controls where workspace_id=${s.workspaceId} order by scope_type,scope_id nulls first`));const usage=rows(await db.execute(sql`select kind,used from vivito_resource_usage where workspace_id=${s.workspaceId} and usage_date=current_date`));return NextResponse.json({workspaceId:s.workspaceId,controls,usage},{headers:{"Cache-Control":"private, no-store"}})}
export async function POST(req:NextRequest){const s=await sa();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const b=await req.json().catch(()=>null);if(!b||typeof b.enabled!=="boolean")return NextResponse.json({error:"enabled boolean is required."},{status:400});const scopeType=String(b.scopeType||"WORKSPACE").toUpperCase();if(!isGovernanceScope(scopeType))return NextResponse.json({error:"Invalid scope type."},{status:400});const scopeId=scopeType==="WORKSPACE"?null:clean(b.scopeId,160);if(scopeType!=="WORKSPACE"&&!scopeId)return NextResponse.json({error:"scopeId is required."},{status:400});await setKillSwitch({workspaceId:s.workspaceId,scopeType,scopeId,enabled:b.enabled,userId:s.userId});await db.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:b.enabled?"vivito_kill_switch_enabled":"vivito_kill_switch_disabled",entity:"VIVITO_GOVERNANCE",entityId:scopeId||s.workspaceId,newValues:JSON.stringify({scopeType,scopeId,enabled:b.enabled})});return NextResponse.json({ok:true,scopeType,scopeId,killSwitch:b.enabled},{headers:{"Cache-Control":"private, no-store"}})}
