import fs from 'node:fs';
const p='lib/vivito/executor-operator.ts';
let s=fs.readFileSync(p,'utf8');
const unsafeBulk=`const affected=rows(await db.execute(sql\`update creative_tasks set status=coalesce(\${status},status),priority=coalesce(\${priority},priority),updated_at=now() where workspace_id=\${W} and archived_at is null \${clientId?sql\`and client_id=\${clientId}\`:sql\`\`} \${overdue?sql\`and deadline<now() and status not in ('COMPLETED','REJECTED')\`:sql\`\`} returning id\`));if(affected.length>200)throw new VivitoActionError("Bulk operation exceeded the 200-record safety cap.",409);`;
const typedBulk=`const candidateRows=rows(await db.execute(sql\`select id from creative_tasks where workspace_id=\${W} and archived_at is null \${clientId?sql\`and client_id=\${clientId}\`:sql\`\`} \${overdue?sql\`and deadline<now() and status not in ('COMPLETED','REJECTED')\`:sql\`\`} order by id limit 201\`));if(candidateRows.length>200)throw new VivitoActionError("Bulk operation exceeded the 200-record safety cap.",409);const ids=candidateRows.map(x=>String(x.id));const idList=sql.join(ids.map(id=>sql\`\${id}\`),sql\`,\`);const affected=ids.length?rows(await db.execute(sql\`update creative_tasks set status=coalesce(\${status},status),priority=coalesce(\${priority},priority),updated_at=now() where workspace_id=\${W} and id in (\${idList}) returning id\`)):[];`;
const oldTyped=/const candidateRows=rows\(await db\.execute\(sql`select id from creative_tasks[\s\S]*?const affected=ids\.length\?rows\(await db\.execute\(sql`update creative_tasks[\s\S]*?returning id`\)\):\[\];/;
if(s.includes(unsafeBulk)) s=s.replace(unsafeBulk,typedBulk);
else if(oldTyped.test(s)) s=s.replace(oldTyped,typedBulk);
if(!s.includes('limit 201')||!s.includes('candidateRows.length>200')||!s.includes('sql.join(ids.map')) throw new Error('typed bulk safety hardening missing');
const beforeReferral=`values(\${id},\${W},\${referred},\${code},'PENDING',\${nonneg(args.discountPct??20)},now())`;
const afterReferral=`values(\${id},\${userId},\${referred},\${code},'PENDING',\${nonneg(args.discountPct??20)},now())`;
if(s.includes(beforeReferral)) s=s.replace(beforeReferral,afterReferral);
if(!s.includes(afterReferral)) throw new Error('referral user attribution hardening missing');
const oldBcrypt='const temp=randomBytes(24).toString("base64url"),hash=await import("bcryptjs").then(m=>m.hash(temp,12));';
const newBcrypt='const temp=randomBytes(24).toString("base64url"),bcryptMod:any=await import("bcryptjs"),bcrypt:any=bcryptMod.default??bcryptMod,hash=await bcrypt.hash(temp,12);';
if(s.includes(oldBcrypt)) s=s.replace(oldBcrypt,newBcrypt);
if(!s.includes('bcryptMod.default??bcryptMod')||!s.includes('hash=await bcrypt.hash(temp,12)')) throw new Error('bcrypt runtime normalization missing');
s=s.replace(/^\/\/ @ts-nocheck\s*/,'');
fs.writeFileSync(p,s);

const routePath='app/api/assistant/actions/route.ts';
let r=fs.readFileSync(routePath,'utf8');
const importLine='import {executeVivitoPlanRuntime} from "@/lib/vivito/plan-runtime";';
if(!r.includes(importLine)) r=r.replace('import {mutateExternalCampaign} from "@/lib/vivito/ad-platform-writes";','import {mutateExternalCampaign} from "@/lib/vivito/ad-platform-writes";\n'+importLine);
const start='  const rootId=requestId||crypto.randomUUID(),results:VivitoExecutionResult[]=[];';
const end='  await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_executed",entity:"vivito_plan",entityId:rootId,newValues:JSON.stringify({requestId:rootId,stepCount:results.length,results})} as any);return NextResponse.json({success:true,requestId:rootId,plan:true,results},{headers:noStore})';
if(r.includes(start)&&r.includes(end)){
  const a=r.indexOf(start),b=r.indexOf(end,a)+end.length;
  const replacement=`  const rootId=requestId||crypto.randomUUID();\n  const execution=await executeVivitoPlanRuntime({steps:normalized,decisions,role,userId,requestId:rootId,executeStep:execute,applyExternal:applyExternalCampaignWrite});\n  if(!execution.success)return NextResponse.json({success:false,partial:execution.partial,requestId:execution.requestId,completedSteps:execution.completedSteps,stoppedAt:execution.stoppedAt,error:execution.error,details:execution.details,duplicateSteps:execution.duplicateSteps},{status:execution.status,headers:noStore});\n  return NextResponse.json(execution,{headers:noStore})`;
  r=r.slice(0,a)+replacement+r.slice(b);
}
if(!r.includes(importLine)||!r.includes('executeVivitoPlanRuntime({steps:normalized')) throw new Error('plan runtime route wiring missing');
fs.writeFileSync(routePath,r);
console.log('VIVITO certification hardening patch applied.');
