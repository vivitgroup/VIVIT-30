export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,sql} from "@/lib/db";
import Link from "next/link";

const WORKSPACE="default";
const num=(v:any)=>Number(v||0);
const money=(v:any)=>`${Math.round(num(v)).toLocaleString("en-EG")} EGP`;
const d=(v:any)=>v?new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short"}).format(new Date(v)):"—";

async function getScope(role:string,userId:string){
 if(role==="SUPER_ADMIN")return Array.from(await db.execute(sql`select id,company_name from clients where workspace_id=${WORKSPACE} and is_active=true order by company_name`));
 if(role==="ACCOUNT_MANAGER")return Array.from(await db.execute(sql`select id,company_name from clients where workspace_id=${WORKSPACE} and is_active=true and account_manager_id=${userId} order by company_name`));
 if(role==="MEDIA_BUYER")return Array.from(await db.execute(sql`select id,company_name from clients where workspace_id=${WORKSPACE} and is_active=true and media_buyer_id=${userId} order by company_name`));
 if(role==="CLIENT")return Array.from(await db.execute(sql`select id,company_name from clients where workspace_id=${WORKSPACE} and is_active=true and user_id=${userId} limit 1`));
 return [];
}

export default async function TodayPage(){
 const session=await auth();if(!session?.user)redirect("/login");
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");
 const clients:any[]=await getScope(role,userId),ids=clients.map(x=>String(x.id));
 let tasks:any[]=[];
 if(role==="CREATOR")tasks=Array.from(await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${WORKSPACE} and c.workspace_id=${WORKSPACE} and t.archived_at is null and c.is_active=true and t.assigned_to_id=${userId} and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 40`));
 else if(ids.length)tasks=Array.from(await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${WORKSPACE} and c.workspace_id=${WORKSPACE} and t.archived_at is null and c.is_active=true and t.client_id in (${sql.join(ids.map(id=>sql`${id}`),sql`,`)}) and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 50`));
 const overdue=tasks.filter(t=>new Date(t.deadline).getTime()<Date.now()),dueSoon=tasks.filter(t=>{const x=new Date(t.deadline).getTime()-Date.now();return x>=0&&x<=2*86400000}),review=tasks.filter(t=>["REVIEW","APPROVED","REVISION"].includes(String(t.status)));
 let media:any[]=[];if(ids.length&&(role==="SUPER_ADMIN"||role==="ACCOUNT_MANAGER"||role==="MEDIA_BUYER"||role==="CLIENT"))media=Array.from(await db.execute(sql`select c.company_name,a.id,a.name,a.status,a.reported_result_label,coalesce(sum(p.spend),0) spend,coalesce(sum(p.results),0) results,coalesce(sum(p.add_to_cart),0) atc,coalesce(sum(p.purchases),0) purchases from ad_campaigns a join clients c on c.id=a.client_id left join ad_performance_daily p on p.campaign_id=a.id and p.date>=date_trunc('month',now()) and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null where a.archived_at is null and a.client_id in (${sql.join(ids.map(id=>sql`${id}`),sql`,`)}) group by c.company_name,a.id,a.name,a.status,a.reported_result_label order by spend desc limit 30`));
 let billing:any[]=[];if(ids.length&&(role==="SUPER_ADMIN"||role==="ACCOUNT_MANAGER"||role==="ACCOUNTANT"))billing=Array.from(await db.execute(sql`select c.company_name,p.outstanding,p.status,p.cycle_day from client_payment_profiles p join clients c on c.id=p.client_id where c.workspace_id=${WORKSPACE} and p.client_id in (${sql.join(ids.map(id=>sql`${id}`),sql`,`)}) order by p.outstanding desc limit 20`));
 const outstanding=billing.reduce((s,x)=>s+num(x.outstanding),0),spend=media.reduce((s,x)=>s+num(x.spend),0),zero=media.filter(x=>num(x.spend)>0&&num(x.results)===0),highRevision=tasks.filter((t:any)=>String(t.status)==="REVISION");
 const actions=[
  ...overdue.slice(0,3).map(t=>({level:"critical",title:`Recover overdue: ${t.title}`,body:`${t.company_name} · due ${d(t.deadline)}`,href:`/dashboard/creative/${t.id}`})),
  ...zero.slice(0,2).map(c=>({level:"warning",title:`Diagnose spend without result: ${c.name}`,body:`${c.company_name} · ${money(c.spend)} MTD`,href:"/dashboard/media/control-center"})),
  ...review.slice(0,2).map(t=>({level:"action",title:`Move review forward: ${t.title}`,body:`${t.company_name} · ${t.status}`,href:`/dashboard/creative/${t.id}`})),
  ...(outstanding>0?[{level:"warning",title:"Collections need attention",body:`${money(outstanding)} outstanding across your scope`,href:"/dashboard/clients/accounts-payment"}]:[])
 ].slice(0,7);
 return <div style={{display:"flex",flexDirection:"column",gap:18}}>
  <div><span className="eyebrow">VIVIT OPERATING SYSTEM</span><h1 className="page-title">Today</h1><p className="page-subtitle">Your live operating queue · {role.replace(/_/g," ")} · generated from current ERP data</p></div>
  <div className="grid grid-4"><div className="card"><small>Active work</small><h2>{tasks.length}</h2><p>{overdue.length} overdue · {dueSoon.length} due in 48h</p></div><div className="card"><small>Review queue</small><h2>{review.length}</h2><p>{highRevision.length} in revision</p></div><div className="card"><small>Media spend MTD</small><h2>{money(spend)}</h2><p>{zero.length} campaigns spending with zero result</p></div><div className="card"><small>Outstanding</small><h2>{money(outstanding)}</h2><p>{billing.filter(x=>num(x.outstanding)>0).length} client balances</p></div></div>
  <div className="card"><div className="flex justify-between items-center"><div><h2>Next Best Actions</h2><p className="text-muted">Prioritized across Creative, Media and Finance.</p></div><Link className="btn btn-secondary" href="/dashboard/ai-studio">Ask Copilot</Link></div><div style={{display:"grid",gap:10,marginTop:14}}>{actions.length?actions.map((a,i)=><Link key={i} href={a.href} style={{textDecoration:"none",color:"inherit",padding:13,border:"1px solid var(--card-border)",borderRadius:12,display:"flex",justifyContent:"space-between",gap:12}}><div><b>{a.title}</b><p style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>{a.body}</p></div><span className={`badge ${a.level==="critical"?"badge-red":a.level==="warning"?"badge-amber":"badge-blue"}`}>{a.level}</span></Link>):<p className="text-muted">No urgent action detected in your current scope.</p>}</div></div>
  <div className="grid grid-2"><div className="card"><h2>Workload</h2><div style={{display:"grid",gap:9,marginTop:12}}>{tasks.slice(0,8).map(t=><Link key={t.id} href={`/dashboard/creative/${t.id}`} style={{textDecoration:"none",color:"inherit",display:"flex",justifyContent:"space-between",gap:10}}><span><b>{t.title}</b><small style={{display:"block",color:"var(--text-muted)"}}>{t.company_name}</small></span><span className={`badge ${new Date(t.deadline).getTime()<Date.now()?"badge-red":"badge-gray"}`}>{d(t.deadline)}</span></Link>)}</div></div><div className="card"><h2>Media attention</h2><div style={{display:"grid",gap:9,marginTop:12}}>{media.slice(0,8).map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",gap:10}}><span><b>{c.name}</b><small style={{display:"block",color:"var(--text-muted)"}}>{c.company_name} · {c.reported_result_label||"Results"}</small></span><span style={{textAlign:"right"}}><b>{num(c.results).toLocaleString()}</b><small style={{display:"block",color:"var(--text-muted)"}}>{money(c.spend)}</small></span></div>)}</div></div></div>
 </div>
}
