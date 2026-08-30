import {createHash} from "node:crypto";
import {db,sql} from "@/lib/db";

type GovernanceControlRow={scope_type:string;autonomy_enabled?:boolean;kill_switch?:boolean;max_daily_actions?:unknown;max_daily_ai_calls?:unknown;policy_version?:unknown};
type IdRow={id:string};
type UsageRow={used:unknown};
type NegativeLearningRow={id:string;outcome_state?:string|null;lesson?:string|null;confidence?:unknown;created_at?:unknown};
const rows=<T>(x:unknown):T[]=>Array.from(x as Iterable<T>);
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const clean=(v:unknown,n=2000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const clamp=(n:number,min=0,max=1)=>Math.min(max,Math.max(min,n));
const hash=(v:unknown)=>createHash("sha256").update(typeof v==="string"?v:JSON.stringify(v??null)).digest("hex");

export type GovernanceScope={workspaceId:string;clientId?:string|null;actionOp?:string|null};
export type EvidenceAssessment={quality:number;sources:number;stale:boolean;contradictory:boolean;missing:boolean};
export type DecisionRoute={mode:"HUMAN_REVIEW"|"POLICY";reason:string};

function workspaceId(v:string){const x=clean(v,160);if(!x)throw new Error("vivito-workspace-required");return x}

export async function assertAutonomyAllowed(scope:GovernanceScope){
 const w=workspaceId(scope.workspaceId);
 const c=rows<GovernanceControlRow>(await db.execute(sql`select scope_type,scope_id,autonomy_enabled,kill_switch,max_daily_actions,max_daily_ai_calls,policy_version from vivito_governance_controls where workspace_id=${w} and ((scope_type='WORKSPACE' and scope_id is null) or (scope_type='CLIENT' and scope_id=${scope.clientId||null}) or (scope_type='ACTION' and scope_id=${scope.actionOp||null})) order by case scope_type when 'ACTION' then 1 when 'CLIENT' then 2 else 3 end`));
 if(c.some(x=>x.kill_switch||!x.autonomy_enabled))throw new Error("vivito-autonomy-disabled-by-governance");
 const workspace:Partial<GovernanceControlRow>=c.find(x=>x.scope_type==='WORKSPACE')||{};
 return{allowed:true,maxDailyActions:Number(workspace.max_daily_actions??100),maxDailyAiCalls:Number(workspace.max_daily_ai_calls??500),policyVersion:String(workspace.policy_version||'v1')};
}

export function assessEvidence(e:unknown):EvidenceAssessment{
 const data=record(e),sources=Array.isArray(data.sources)?data.sources.filter(Boolean):[];
 const stale=Boolean(data.stale),contradictory=Boolean(data.contradictory),missing=Boolean(data.missing);
 let q=Math.min(1,sources.length?0.45+Math.min(.45,sources.length*.2):0.35);
 if(data.observed===true||data.source||data.profileUrl||data.campaignId)q+=.2;
 if(stale)q-=.3;if(contradictory)q-=.45;if(missing)q-=.5;
 return{quality:clamp(Number(q.toFixed(2))),sources:sources.length,stale,contradictory,missing};
}

export function routeByConfidence(confidence:number,evidenceQuality:number):DecisionRoute{
 if(evidenceQuality<.5)return{mode:"HUMAN_REVIEW",reason:"insufficient-evidence"};
 if(confidence<.7)return{mode:"HUMAN_REVIEW",reason:"low-confidence"};
 return{mode:"POLICY",reason:"confidence-sufficient"};
}

export function simulateDecision(input:{baseline:unknown;action:unknown}){return{mode:"SANDBOX",executed:false,baseline:input.baseline??null,proposed:input.action,warning:"Counterfactual estimate only; no causal claim and no external write."}}

export async function recordProvenance(input:{workspaceId:string;scopeType:string;scopeId?:string|null;sourceType:string;sourceId?:string|null;sourceVersion?:string|null;content:unknown;confidence?:number;expiresAt?:Date|null;metadata?:unknown}){
 const w=workspaceId(input.workspaceId),id=crypto.randomUUID(),contentHash=hash(input.content);
 await db.execute(sql`insert into vivito_knowledge_provenance(id,workspace_id,scope_type,scope_id,source_type,source_id,source_version,content_hash,expires_at,confidence,metadata) values(${id},${w},${clean(input.scopeType,80)},${input.scopeId||null},${clean(input.sourceType,120)},${input.sourceId||null},${input.sourceVersion||null},${contentHash},${input.expiresAt||null},${clamp(Number(input.confidence??1))},${JSON.stringify(input.metadata||{})}::jsonb)`);
 return{id,contentHash};
}

export async function activeProvenance(workspace:string,scopeType:string,scopeId?:string|null){
 const w=workspaceId(workspace);
 return rows<unknown>(await db.execute(sql`select * from vivito_knowledge_provenance where workspace_id=${w} and scope_type=${scopeType} and scope_id is not distinct from ${scopeId||null} and superseded_by is null and (expires_at is null or expires_at>now()) order by created_at desc limit 100`));
}

export async function supersedeProvenance(input:{workspaceId:string;oldId:string;newId:string}){
 const w=workspaceId(input.workspaceId);
 const r=rows<IdRow>(await db.execute(sql`update vivito_knowledge_provenance set superseded_by=${input.newId} where id=${input.oldId} and workspace_id=${w} and superseded_by is null returning id`));
 if(!r.length)throw new Error("vivito-provenance-not-found-or-already-superseded");
 return{ok:true};
}

export async function journal(input:{workspaceId:string;clientId?:string|null;eventId?:string|null;version:string;provider?:string|null;evidence:unknown;decision:unknown;confidence:number;simulation?:unknown;decisionType?:string;signalType?:string;rationale?:string;expectedOutcome?:string|null;status?:string}){
 const w=workspaceId(input.workspaceId),assessment=assessEvidence(input.evidence),id=crypto.randomUUID();
 await db.execute(sql`insert into vivito_decision_journal(id,workspace_id,client_id,event_id,decision_type,signal_type,evidence_summary,rationale_summary,expected_outcome,decision_status,decision_version,model_provider,evidence_quality,confidence,evidence,decision,simulation) values(${id},${w},${input.clientId||null},${input.eventId||null},${input.decisionType||clean(record(input.decision).op||'enterprise_decision',120)},${input.signalType||'ENTERPRISE'},${JSON.stringify(input.evidence||{})}::jsonb,${clean(input.rationale||'Enterprise governance decision.',1800)},${input.expectedOutcome||null},${input.status||'PROPOSED'},${input.version},${input.provider||null},${assessment.quality},${clamp(Number(input.confidence))},${JSON.stringify(input.evidence||{})}::jsonb,${JSON.stringify(input.decision||{})}::jsonb,${JSON.stringify(input.simulation||null)}::jsonb)`);
 return{id,evidenceQuality:assessment.quality};
}

export async function saveCheckpoint(workspace:string,runKey:string,state:unknown,status="RUNNING",lastError?:string|null){
 const w=workspaceId(workspace);
 await db.execute(sql`insert into vivito_runtime_checkpoints(id,workspace_id,run_key,state,status,lease_until,last_error) values(${crypto.randomUUID()},${w},${clean(runKey,240)},${JSON.stringify(state||{})}::jsonb,${status},now()+interval '10 minutes',${lastError||null}) on conflict(workspace_id,run_key) do update set state=excluded.state,status=excluded.status,attempt=vivito_runtime_checkpoints.attempt+1,lease_until=excluded.lease_until,last_error=excluded.last_error,updated_at=now()`);
}

export async function consumeResource(workspace:string,kind:"ACTION"|"AI",amount=1){
 const w=workspaceId(workspace),n=Math.max(1,Math.floor(amount));
 const g=await assertAutonomyAllowed({workspaceId:w});
 const limit=kind==='ACTION'?g.maxDailyActions:g.maxDailyAiCalls;
 const result=rows<UsageRow>(await db.execute(sql`insert into vivito_resource_usage(id,workspace_id,usage_date,kind,used) values(${crypto.randomUUID()},${w},current_date,${kind},${n}) on conflict(workspace_id,usage_date,kind) do update set used=vivito_resource_usage.used+excluded.used,updated_at=now() where vivito_resource_usage.used+excluded.used<=${limit} returning used`));
 if(!result.length){await securityEvent({workspaceId:w,eventType:"RESOURCE_LIMIT_BLOCK",severity:"HIGH",evidence:{kind,amount:n,limit}});throw new Error(`vivito-${kind.toLowerCase()}-daily-limit-exceeded`)}
 return{used:Number(result[0].used),limit};
}

export async function recentNegativeLearning(input:{workspaceId:string;clientId?:string|null;signalType:string;actionOp:string;days?:number}){
 const w=workspaceId(input.workspaceId),days=Math.max(1,Math.min(180,Number(input.days||30)));
 const r=rows<NegativeLearningRow>(await db.execute(sql`select l.id,l.outcome_state,l.lesson,l.confidence,l.created_at from vivito_learning_signals l join vivito_autonomy_events e on e.id=l.event_id and e.workspace_id=l.workspace_id where l.workspace_id=${w} and e.client_id is not distinct from ${input.clientId||null} and e.signal_type=${input.signalType} and e.action_op=${input.actionOp} and l.created_at>=now()-(${days}::text||' days')::interval and coalesce(l.outcome_state,'') in ('NEEDS_REVIEW','FAILED','WORSE','REJECTED') order by l.created_at desc limit 1`));
 return r[0]||null;
}

export async function preflightDecision(input:{workspaceId:string;clientId?:string|null;actionOp:string;signalType:string;evidence:unknown;confidence:number;baseline?:unknown;decisionVersion?:string}){
 const w=workspaceId(input.workspaceId),governance=await assertAutonomyAllowed({workspaceId:w,clientId:input.clientId,actionOp:input.actionOp}),assessment=assessEvidence(input.evidence),route=routeByConfidence(input.confidence,assessment.quality),simulation=simulateDecision({baseline:input.baseline??input.evidence,action:{op:input.actionOp}}),negative=await recentNegativeLearning({workspaceId:w,clientId:input.clientId,signalType:input.signalType,actionOp:input.actionOp});
 const provenance=await recordProvenance({workspaceId:w,scopeType:input.clientId?'CLIENT':'WORKSPACE',scopeId:input.clientId||null,sourceType:'DIRECT_OPERATOR_EVIDENCE',sourceId:`${input.signalType}:${input.actionOp}`,sourceVersion:input.decisionVersion||'direct-v3',content:input.evidence,confidence:assessment.quality,metadata:{signalType:input.signalType,actionOp:input.actionOp}});
 if(negative)return{allowed:false,route:{mode:'HUMAN_REVIEW' as const,reason:'negative-learning-history'},evidenceQuality:assessment.quality,simulation,provenance,policyVersion:governance.policyVersion,negativeLearning:negative};
 return{allowed:route.mode==='POLICY',route,evidenceQuality:assessment.quality,simulation,provenance,policyVersion:governance.policyVersion,negativeLearning:null};
}

export async function recordEval(workspace:string,metric:string,value:number,baseline:number,evidence:unknown={}){
 const w=workspaceId(workspace),drift=baseline>0&&Math.abs(value-baseline)/baseline>.2;
 await db.execute(sql`insert into vivito_eval_metrics(id,workspace_id,metric_name,value,baseline,drift_detected,evidence) values(${crypto.randomUUID()},${w},${clean(metric,160)},${value},${baseline},${drift},${JSON.stringify(evidence||{})}::jsonb) on conflict(workspace_id,metric_date,metric_name) do update set value=excluded.value,baseline=excluded.baseline,drift_detected=excluded.drift_detected,evidence=excluded.evidence`);
 if(drift)await db.execute(sql`insert into vivito_escalations(id,workspace_id,event_id,client_id,assigned_to_id,severity,status,dedupe_key,message) values(${crypto.randomUUID()},${w},null,null,null,'HIGH','OPEN',${`eval-drift:${metric}:${new Date().toISOString().slice(0,10)}`},${`Evaluation drift detected for ${clean(metric,120)}: value ${value}, baseline ${baseline}.`}) on conflict(workspace_id,dedupe_key) do update set message=excluded.message,severity='HIGH',updated_at=now() where vivito_escalations.status<>'RESOLVED'`);
 return{drift};
}

export async function recordValue(workspace:string,eventId:string,cost:number,value:number,currency="EGP",method="OBSERVED"){
 const w=workspaceId(workspace);
 await db.execute(sql`insert into vivito_value_ledger(id,workspace_id,event_id,cost_amount,value_amount,currency,method,evidence) values(${crypto.randomUUID()},${w},${eventId},${Math.max(0,Number(cost||0))},${Math.max(0,Number(value||0))},${clean(currency,12)},${clean(method,40)},${JSON.stringify({roi:cost>0?(value-cost)/cost:null,noCausalClaim:true})}::jsonb)`);
}

export async function claimNotification(workspace:string,dedupeKey:string,ttlHours=24){
 const w=workspaceId(workspace),key=clean(dedupeKey,240),ttl=Math.max(1,Math.min(168,ttlHours));
 await db.execute(sql`delete from vivito_notification_dedupe where workspace_id=${w} and expires_at<=now()`);
 const r=rows<IdRow>(await db.execute(sql`insert into vivito_notification_dedupe(id,workspace_id,dedupe_key,expires_at) values(${crypto.randomUUID()},${w},${key},now()+(${ttl}::text||' hours')::interval) on conflict(workspace_id,dedupe_key) do nothing returning id`));
 return r.length>0;
}

export async function securityEvent(input:{workspaceId:string;actorId?:string|null;eventType:string;severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";fingerprint?:string|null;evidence?:unknown}){
 const w=workspaceId(input.workspaceId);
 await db.execute(sql`insert into vivito_security_events(id,workspace_id,actor_id,event_type,severity,fingerprint,evidence) values(${crypto.randomUUID()},${w},${input.actorId||null},${clean(input.eventType,160)},${input.severity},${input.fingerprint||null},${JSON.stringify(input.evidence||{})}::jsonb)`);
}

export async function recordBackupManifest(input:{workspaceId:string;snapshotKey:string;checksum:string;recordCounts:unknown;status?:string}){
 const w=workspaceId(input.workspaceId);
 await db.execute(sql`insert into vivito_backup_manifests(id,workspace_id,snapshot_key,status,checksum,record_counts,format_version) values(${crypto.randomUUID()},${w},${clean(input.snapshotKey,240)},${input.status||'EXPORTED'},${input.checksum},${JSON.stringify(input.recordCounts||{})}::jsonb,1) on conflict(workspace_id,snapshot_key) do update set status=excluded.status,checksum=excluded.checksum,record_counts=excluded.record_counts`);
}

export async function verifyBackupRestore(input:{workspaceId:string;snapshotKey:string;checksum:string;recordCounts:unknown;details:unknown}){
 const w=workspaceId(input.workspaceId);
 const r=rows<IdRow>(await db.execute(sql`update vivito_backup_manifests set status='RESTORE_VERIFIED',verified_checksum=${input.checksum},restore_record_counts=${JSON.stringify(input.recordCounts||{})}::jsonb,verification_details=${JSON.stringify(input.details||{})}::jsonb,restore_verified_at=now() where workspace_id=${w} and snapshot_key=${clean(input.snapshotKey,240)} and checksum=${input.checksum} returning id`));
 if(!r.length)throw new Error('vivito-backup-manifest-checksum-mismatch');
 return{ok:true};
}

export async function setKillSwitch(input:{workspaceId:string;scopeType:"WORKSPACE"|"CLIENT"|"ACTION";scopeId?:string|null;enabled:boolean;userId:string}){
 const w=workspaceId(input.workspaceId),scopeId=input.scopeType==='WORKSPACE'?null:(input.scopeId||null);
 await db.execute(sql`insert into vivito_governance_controls(id,workspace_id,scope_type,scope_id,autonomy_enabled,kill_switch,updated_by) values(${crypto.randomUUID()},${w},${input.scopeType},${scopeId},${!input.enabled},${input.enabled},${input.userId}) on conflict(workspace_id,scope_type,(coalesce(scope_id,'__WORKSPACE__'))) do update set autonomy_enabled=excluded.autonomy_enabled,kill_switch=excluded.kill_switch,updated_by=excluded.updated_by,updated_at=now()`);
 return{ok:true};
}

export interface VivitoProviderAdapter<TRead=unknown,TWrite=unknown>{name:string;read(input:TRead):Promise<unknown>;write?(input:TWrite):Promise<unknown>;supportsExternalWrites:boolean}
export class InternalOnlyProviderAdapter implements VivitoProviderAdapter{readonly name='internal-db';readonly supportsExternalWrites=false;async read(input:unknown){return input}async write(){throw new Error('external-provider-write-deferred')}}
export const providerBoundary={businessLogicProviderIndependent:true,externalWritesRequireConfiguredExecutor:true,adapterContract:'VivitoProviderAdapter'};
