import fs from "node:fs";

function patch(path, edits){let s=fs.readFileSync(path,"utf8");for(const [from,to,label] of edits){if(s.includes(to))continue;if(!s.includes(from))throw new Error(`${path}: missing ${label}`);s=s.replace(from,to)}fs.writeFileSync(path,s)}

patch("app/api/assistant/actions/route.ts",[[
'connectionAccessToken({id:row.connection_id,accessTokenEncrypted:row.access_token_encrypted,refreshTokenEncrypted:row.refresh_token_encrypted,tokenExpiresAt:row.token_expires_at?new Date(row.token_expires_at):null,platform:row.connection_platform||row.platform,adAccountId:row.ad_account_id})',
'connectionAccessToken({id:row.connection_id,workspaceId,accessTokenEncrypted:row.access_token_encrypted,refreshTokenEncrypted:row.refresh_token_encrypted,tokenExpiresAt:row.token_expires_at?new Date(row.token_expires_at):null,platform:row.connection_platform||row.platform,adAccountId:row.ad_account_id})',
'assistant oauth workspace'
]]);
patch("lib/vivito/executor-operator.ts",[[
'connectionAccessToken({id:conn.id,accessTokenEncrypted:conn.access_token_encrypted,refreshTokenEncrypted:conn.refresh_token_encrypted,tokenExpiresAt:conn.token_expires_at?new Date(conn.token_expires_at):null,platform:conn.platform,adAccountId:conn.ad_account_id})',
'connectionAccessToken({id:conn.id,workspaceId:tenantId(),accessTokenEncrypted:conn.access_token_encrypted,refreshTokenEncrypted:conn.refresh_token_encrypted,tokenExpiresAt:conn.token_expires_at?new Date(conn.token_expires_at):null,platform:conn.platform,adAccountId:conn.ad_account_id})',
'operator oauth workspace'
]]);

const p="app/api/performance-score/route.ts";let s=fs.readFileSync(p,"utf8");
const r=(from,to,label)=>{if(s.includes(to))return;if(!s.includes(from))throw new Error(`performance-score: missing ${label}`);s=s.replace(from,to)};
r('const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));','const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));\ntype PerfTx=Parameters<Parameters<typeof db.transaction>[0]>[0];','tx type');
r('async function calcClientHealth(clientId:string,workspaceId:string){','async function calcClientHealth(q:PerfTx,clientId:string,workspaceId:string){','client helper signature');
r('async function calcAgencyHealth(workspaceId:string){','async function calcAgencyHealth(q:PerfTx,workspaceId:string){','agency helper signature');
r('async function calcCommissions(period:string,workspaceId:string){','async function calcCommissions(q:PerfTx,period:string,workspaceId:string){','commission helper signature');
// Helper bodies are compact one-liners; once signatures are changed, replace DB access in those three helper regions only.
const a=s.indexOf('async function calcClientHealth(q:PerfTx');const b=s.indexOf('async function calcAgencyHealth(q:PerfTx');const c=s.indexOf('async function calcCommissions(q:PerfTx');const d=s.indexOf('export async function POST');
if([a,b,c,d].some(x=>x<0))throw new Error('performance-score helper boundaries missing');
const h1=s.slice(a,b).replaceAll('db.','q.');const h2=s.slice(b,c).replaceAll('db.','q.');const h3=s.slice(c,d).replaceAll('db.','q.');s=s.slice(0,a)+h1+h2+h3+s.slice(d);
const postStart=s.indexOf('export async function POST');
if(postStart<0)throw new Error('performance POST missing');
const oldPost=s.slice(postStart);
const marker='export async function POST(req:NextRequest){';
if(!oldPost.startsWith(marker))throw new Error('unexpected POST format');
const newPost=`export async function POST(req:NextRequest){const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(session.user.role!=="SUPER_ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");if(!workspaceId||!userId)return NextResponse.json({error:"Workspace unavailable"},{status:403});const body=await req.json().catch(()=>({})),targetId=String(body?.clientId||"").trim()||undefined;const outcome=await db.transaction(async tx=>{await tx.execute(sql\`select pg_advisory_xact_lock(hashtext(\${\`performance-score:\${workspaceId}\`}))\`);const allClients=await tx.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true)));if(targetId&&!allClients.some(c=>c.id===targetId))return{notFound:true as const};const toProcess=targetId?allClients.filter(c=>c.id===targetId):allClients,results:Array<{id:string;name:string;score:number;risk:"HIGH"|"MEDIUM"|"LOW";churnProb:number}>=[];for(const cl of toProcess){const{score,churnProb,risk}=await calcClientHealth(tx,cl.id,workspaceId);await tx.update(clients).set({healthScore:score,churnProbability:churnProb,churnRisk:risk,updatedAt:new Date()}).where(and(eq(clients.workspaceId,workspaceId),eq(clients.id,cl.id)));results.push({id:cl.id,name:cl.companyName,score,risk,churnProb})}const agencyHealth=await calcAgencyHealth(tx,workspaceId),now=new Date(),period=\`\${now.getFullYear()}-\${String(now.getMonth()+1).padStart(2,"0")}\`,commissionUsers=await calcCommissions(tx,period,workspaceId);await tx.insert(auditLogs).values({workspaceId,userId,action:"performance_scores_recalculated",entity:"workspace",entityId:workspaceId,newValues:JSON.stringify({targetClientId:targetId||null,processedClients:results.length,commissionUsers,period,agencyOverallScore:agencyHealth.overallScore})});return{notFound:false as const,results,agencyHealth}});if(outcome.notFound)return NextResponse.json({error:"Client not found in workspace"},{status:404});for(const p of["/dashboard","/dashboard/clients","/dashboard/analytics","/dashboard/finance"])revalidatePath(p);return NextResponse.json({success:true,processed:outcome.results.length,results:outcome.results,agencyHealth:outcome.agencyHealth,message:"Health scores, agency health and commissions recalculated"},{headers:{"Cache-Control":"private, no-store"}})}\n`;
s=s.slice(0,postStart)+newPost;
fs.writeFileSync(p,s);
console.log('performance atomicity and OAuth callers hardened');
