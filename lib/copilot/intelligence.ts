import {db,sql} from "@/lib/db";
const WS="default";
export type IntelligenceScope={role:string;userId:string};
function clientScope(role:string,userId:string){if(role==="SUPER_ADMIN"||role==="ACCOUNTANT")return sql`true`;if(role==="ACCOUNT_MANAGER")return sql`c.account_manager_id=${userId}`;if(role==="MEDIA_BUYER")return sql`c.media_buyer_id=${userId}`;if(role==="CLIENT")return sql`c.user_id=${userId}`;return sql`false`}
const num=(v:any)=>Number(v||0),clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export async function buildOperatingIntelligence({role,userId}:IntelligenceScope){const sc=clientScope(role,userId),internal=role!=="CLIENT";
 const rows=Array.from(await db.execute(sql`select c.id,c.company_name,c.monthly_retainer,c.health_score stored_health,c.churn_risk,
 coalesce(p.amount_remaining,0) outstanding,p.payment_status,p.payment_day,
 count(distinct t.id) filter(where t.archived_at is null and t.status not in ('COMPLETED','APPROVED','REJECTED'))::int active_tasks,
 count(distinct t.id) filter(where t.archived_at is null and t.status not in ('COMPLETED','APPROVED','REJECTED') and t.deadline<now())::int overdue_tasks,
 coalesce(sum(t.revision_count) filter(where t.created_at>now()-interval '60 days'),0)::int revisions_60d,
 count(distinct t.id) filter(where t.status='REVIEW')::int waiting_review,
 count(distinct ac.id)::int campaigns,
 coalesce(sum((ac.reported_metrics->>'spend')::numeric),0) spend,
 coalesce(sum((ac.reported_metrics->>'results')::numeric),0) results,
 coalesce(sum((ac.reported_metrics->>'purchases')::numeric),0) purchases,
 coalesce(sum((ac.reported_metrics->>'addToCart')::numeric),0) atc,
 coalesce(avg(nullif((ac.reported_metrics->>'frequency')::numeric,0)),0) avg_frequency,
 max(ac.last_sync_at) media_last_sync
 from clients c left join client_payment_profiles p on p.client_id=c.id
 left join creative_tasks t on t.client_id=c.id and t.deleted_at is null
 left join ad_campaigns ac on ac.client_id=c.id and ac.archived_at is null
 where c.workspace_id=${WS} and c.is_active=true and ${sc}
 group by c.id,c.company_name,c.monthly_retainer,c.health_score,c.churn_risk,p.amount_remaining,p.payment_status,p.payment_day order by c.company_name`) as any[]);
 const clients=rows.map(r=>{let score=100;const reasons:string[]=[];if(num(r.outstanding)>0){const p=Math.min(24,8+num(r.outstanding)/5000);score-=p;reasons.push(`${num(r.outstanding).toLocaleString("en-EG")} EGP outstanding`)}if(num(r.overdue_tasks)>0){score-=Math.min(25,num(r.overdue_tasks)*7);reasons.push(`${r.overdue_tasks} overdue task(s)`)}if(num(r.waiting_review)>2){score-=Math.min(12,(num(r.waiting_review)-2)*3);reasons.push(`${r.waiting_review} items waiting review`)}if(num(r.revisions_60d)>=5){score-=Math.min(15,num(r.revisions_60d));reasons.push(`${r.revisions_60d} revisions in 60d`)}if(num(r.spend)>500&&num(r.results)===0){score-=18;reasons.push("paid media spend with zero reported results")}if(num(r.avg_frequency)>=3.5){score-=8;reasons.push(`high media frequency ${num(r.avg_frequency).toFixed(2)}`)}score=Math.round(clamp(score));return{...r,healthScore:score,healthBand:score>=85?"HEALTHY":score>=70?"ATTENTION":score>=50?"RISK":"CRITICAL",reasons}});
 const brandMemory=internal?Array.from(await db.execute(sql`select title,content,tags,updated_at from knowledge_base where workspace_id=${WS} and is_published=true and category in ('BRAND_MEMORY','CLIENT_LEARNING') order by updated_at desc limit 120`) as any[]):[];
 const outcomes=internal?Array.from(await db.execute(sql`select title,content,tags,updated_at from knowledge_base where workspace_id=${WS} and category='AI_OUTCOME' order by updated_at desc limit 80`) as any[]):[];
 const risks:any[]=[],opportunities:any[]=[];for(const c of clients){if(c.healthScore<70)risks.push({kind:"client_health",clientId:c.id,title:`${c.company_name} needs attention`,score:100-c.healthScore,detail:c.reasons.join(" · "),href:`/dashboard/clients/${c.id}`});if(num(c.outstanding)>=25000)risks.push({kind:"cash",clientId:c.id,title:`Collection risk · ${c.company_name}`,score:90,detail:`${num(c.outstanding).toLocaleString("en-EG")} EGP outstanding`,href:"/dashboard/clients/accounts-payment"});if(num(c.spend)>1000&&num(c.results)>0&&num(c.avg_frequency)<2.5)opportunities.push({kind:"media_scale",clientId:c.id,title:`Scale candidate · ${c.company_name}`,score:74,detail:`Active results with frequency ${num(c.avg_frequency).toFixed(2)}`,href:"/dashboard/media/control-center"});if(num(c.revisions_60d)>=5)opportunities.push({kind:"creative_learning",clientId:c.id,title:`Learn from revision pattern · ${c.company_name}`,score:80,detail:`${c.revisions_60d} revisions can improve future briefs`,href:`/dashboard/clients/${c.id}`})}
 const workload=role==="SUPER_ADMIN"?Array.from(await db.execute(sql`select u.id,u.name,u.role,count(t.id) filter(where t.archived_at is null and t.status not in ('COMPLETED','APPROVED','REJECTED'))::int active,count(t.id) filter(where t.archived_at is null and t.status not in ('COMPLETED','APPROVED','REJECTED') and t.deadline<now())::int overdue from users u left join creative_tasks t on t.assigned_to_id=u.id where u.workspace_id=${WS} and u.is_active=true and u.role in ('CREATOR','ACCOUNT_MANAGER','MEDIA_BUYER') group by u.id,u.name,u.role order by overdue desc,active desc`) as any[]):[];
 for(const w of workload)if(num(w.overdue)>0||num(w.active)>=10)risks.push({kind:"capacity",title:`Capacity risk · ${w.name}`,score:Math.min(95,70+num(w.overdue)*5),detail:`${w.active} active · ${w.overdue} overdue`,href:"/dashboard/creative"});
 return{clients,brandMemory,outcomes,risks:risks.sort((a,b)=>b.score-a.score).slice(0,20),opportunities:opportunities.sort((a,b)=>b.score-a.score).slice(0,20),workload,summary:{healthy:clients.filter(c=>c.healthScore>=85).length,attention:clients.filter(c=>c.healthScore>=70&&c.healthScore<85).length,risk:clients.filter(c=>c.healthScore<70).length,outstanding:clients.reduce((s,c)=>s+num(c.outstanding),0),overdueTasks:clients.reduce((s,c)=>s+num(c.overdue_tasks),0)}}}
