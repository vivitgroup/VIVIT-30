import {db,sql} from "@/lib/db";
const WS="default",num=(v:any)=>Number(v||0),clamp=(v:number)=>Math.max(0,Math.min(100,v));
export type IntelligenceScope={role:string;userId:string};
function clientScope(role:string,userId:string){if(["SUPER_ADMIN","ACCOUNTANT"].includes(role))return sql`true`;if(role==="ACCOUNT_MANAGER")return sql`c.account_manager_id=${userId}`;if(role==="MEDIA_BUYER")return sql`c.media_buyer_id=${userId}`;if(role==="CLIENT")return sql`c.user_id=${userId}`;return sql`false`}
export async function buildOperatingIntelligence({role,userId}:IntelligenceScope){
 const scope=clientScope(role,userId),internal=role!=="CLIENT";
 const rows=Array.from(await db.execute(sql`
  with task_stats as (
   select t.client_id,count(*) filter(where t.archived_at is null and t.deleted_at is null and t.status not in ('COMPLETED','REJECTED'))::int active_tasks,
    count(*) filter(where t.archived_at is null and t.deleted_at is null and t.status not in ('COMPLETED','REJECTED') and t.deadline<now())::int overdue_tasks,
    count(*) filter(where t.archived_at is null and t.deleted_at is null and t.status='REVIEW')::int waiting_review,
    coalesce(sum(t.revision_count) filter(where t.created_at>now()-interval '60 days'),0)::int revisions_60d
   from creative_tasks t where t.workspace_id=${WS} group by t.client_id
  ), media_stats as (
   select a.client_id,count(distinct a.id)::int campaigns,max(a.last_sync_at) media_last_sync,
    coalesce(sum(p.spend),0) spend,coalesce(sum(p.results),0) results,coalesce(sum(p.add_to_cart),0) atc,coalesce(sum(p.purchases),0) purchases,
    coalesce(sum(p.revenue),0) revenue,coalesce(sum(p.impressions),0) impressions,coalesce(sum(p.clicks),0) clicks,coalesce(sum(p.reach),0) reach
   from ad_campaigns a left join ad_performance_daily p on p.campaign_id=a.id and p.date>=date_trunc('month',now()) and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null
   where a.workspace_id=${WS} and a.archived_at is null group by a.client_id
  )
  select c.id,c.company_name,c.health_score stored_health,c.churn_risk,c.monthly_retainer,c.account_manager_id,c.media_buyer_id,
   coalesce(pp.amount_remaining,0) outstanding,pp.payment_status,pp.payment_day,
   coalesce(ts.active_tasks,0) active_tasks,coalesce(ts.overdue_tasks,0) overdue_tasks,coalesce(ts.waiting_review,0) waiting_review,coalesce(ts.revisions_60d,0) revisions_60d,
   coalesce(ms.campaigns,0) campaigns,coalesce(ms.spend,0) spend,coalesce(ms.results,0) results,coalesce(ms.atc,0) atc,coalesce(ms.purchases,0) purchases,coalesce(ms.revenue,0) revenue,
   coalesce(ms.impressions,0) impressions,coalesce(ms.clicks,0) clicks,coalesce(ms.reach,0) reach,ms.media_last_sync
  from clients c left join client_payment_profiles pp on pp.client_id=c.id and pp.workspace_id=${WS}
  left join task_stats ts on ts.client_id=c.id left join media_stats ms on ms.client_id=c.id
  where c.workspace_id=${WS} and c.is_active=true and c.archived_at is null and ${scope} order by c.company_name
 `) as any[]);
 const clients=rows.map(r=>{const spend=num(r.spend),results=num(r.results),impressions=num(r.impressions),clicks=num(r.clicks),reach=num(r.reach),ctr=impressions?clicks/impressions*100:0,frequency=reach?impressions/reach:0,roas=spend?num(r.revenue)/spend:0;let score=100;const reasons:string[]=[];
  if(num(r.outstanding)>0){score-=Math.min(25,8+num(r.outstanding)/5000);reasons.push(`${num(r.outstanding).toLocaleString("en-EG")} EGP outstanding`)}
  if(num(r.overdue_tasks)>0){score-=Math.min(25,num(r.overdue_tasks)*6);reasons.push(`${r.overdue_tasks} overdue task(s)`)}
  if(num(r.waiting_review)>2){score-=Math.min(12,(num(r.waiting_review)-2)*3);reasons.push(`${r.waiting_review} waiting internal review`)}
  if(num(r.revisions_60d)>=5){score-=Math.min(15,num(r.revisions_60d));reasons.push(`${r.revisions_60d} revisions in 60 days`)}
  if(spend>500&&results===0&&num(r.atc)===0&&num(r.purchases)===0){score-=18;reasons.push("media spend with no primary conversion signal")}
  if(frequency>=3.5){score-=8;reasons.push(`high frequency ${frequency.toFixed(2)}`)}
  score=Math.round(clamp(score));return{...r,spend,results,ctr,frequency,roas,healthScore:score,healthBand:score>=85?"HEALTHY":score>=70?"ATTENTION":score>=50?"RISK":"CRITICAL",reasons};
 });
 const risks:any[]=[],opportunities:any[]=[];for(const c of clients){if(c.healthScore<70)risks.push({kind:"CLIENT_HEALTH",clientId:c.id,title:`${c.company_name} needs attention`,score:100-c.healthScore,detail:c.reasons.join(" · "),href:`/dashboard/clients/${c.id}`});if(num(c.outstanding)>=25000)risks.push({kind:"CASH",clientId:c.id,title:`Collection risk · ${c.company_name}`,score:90,detail:`${num(c.outstanding).toLocaleString("en-EG")} EGP outstanding`,href:"/dashboard/clients/accounts-payment"});if(c.spend>1000&&c.results>0&&c.frequency<2.5)opportunities.push({kind:"MEDIA_SCALE",clientId:c.id,title:`Scale candidate · ${c.company_name}`,score:76,detail:`Results active · frequency ${c.frequency.toFixed(2)} · ROAS ${c.roas.toFixed(2)}x`,href:"/dashboard/media/control-center"});if(num(c.revisions_60d)>=5)opportunities.push({kind:"CREATIVE_LEARNING",clientId:c.id,title:`Revision learning · ${c.company_name}`,score:82,detail:`${c.revisions_60d} revisions can improve future briefs`,href:`/dashboard/clients/${c.id}`})}
 const workload=role==="SUPER_ADMIN"?Array.from(await db.execute(sql`select u.id,u.name,u.role,count(t.id) filter(where t.archived_at is null and t.deleted_at is null and t.status not in ('COMPLETED','REJECTED'))::int active,count(t.id) filter(where t.archived_at is null and t.deleted_at is null and t.status not in ('COMPLETED','REJECTED') and t.deadline<now())::int overdue from users u left join creative_tasks t on t.assigned_to_id=u.id and t.workspace_id=${WS} where u.workspace_id=${WS} and u.is_active=true and u.role='CREATOR' group by u.id,u.name,u.role order by overdue desc,active desc`) as any[]):[];
 for(const w of workload)if(num(w.overdue)>0||num(w.active)>=10)risks.push({kind:"CAPACITY",title:`Capacity risk · ${w.name}`,score:Math.min(95,70+num(w.overdue)*5),detail:`${w.active} active · ${w.overdue} overdue`,href:"/dashboard/creative"});
 const brandMemory=internal?Array.from(await db.execute(sql`select id,title,content,tags,updated_at from knowledge_base where workspace_id=${WS} and is_published=true and category in ('BRAND_MEMORY','CLIENT_LEARNING') order by updated_at desc limit 100`) as any[]):[];
 const outcomes=internal?Array.from(await db.execute(sql`select id,title,content,tags,updated_at from knowledge_base where workspace_id=${WS} and category='AI_OUTCOME' order by updated_at desc limit 80`) as any[]):[];
 return{clients,risks:risks.sort((a,b)=>b.score-a.score).slice(0,25),opportunities:opportunities.sort((a,b)=>b.score-a.score).slice(0,25),workload,brandMemory,outcomes,summary:{healthy:clients.filter(c=>c.healthScore>=85).length,attention:clients.filter(c=>c.healthScore>=70&&c.healthScore<85).length,risk:clients.filter(c=>c.healthScore<70).length,outstanding:clients.reduce((s,c)=>s+num(c.outstanding),0),overdueTasks:clients.reduce((s,c)=>s+num(c.overdue_tasks),0),spendMTD:clients.reduce((s,c)=>s+c.spend,0)}};
}
