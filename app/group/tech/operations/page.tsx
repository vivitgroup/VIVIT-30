import Link from "next/link";
import TechOpsConsole from "./TechOpsConsole";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

type Commercial={leads:number;opportunities:number;weighted_pipeline:number;proposals:number;tickets:number;trial_extensions:number;upsells:number};
export const dynamic="force-dynamic";
const money=(value:number)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(value||0);

export default async function TechOperations(){
  await requireBusinessPermission("tech","projects:view");
  const sql=getVGroupSql();
  const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;
  const [portfolio]=await sql<{projects:number;active_projects:number;contracted_revenue:number;forecast_margin:number;avg_health_score:number;loss_risk_projects:number;collection_risk_projects:number}[]>`select * from tech.portfolio_summary`;
  const [ops]=await sql<{timesheets_pending:number;capacity_hotspots:number;deliverables_pending:number;uat_open:number;issues_open:number;support_contracts:number;collection_cases:number;renewals_open:number;quotations_open:number;releases_open:number}[]>`select
    (select count(*)::int from tech.timesheets where status='submitted') timesheets_pending,
    (select count(*)::int from tech.resource_capacity where status<>'released' and allocation_percent>=90) capacity_hotspots,
    (select count(*)::int from tech.deliverables where status in ('submitted','changes_requested')) deliverables_pending,
    (select count(*)::int from tech.uat_cycles where status not in ('accepted','rejected')) uat_open,
    (select count(*)::int from tech.issues where status not in ('closed','wont_fix')) issues_open,
    (select count(*)::int from tech.support_contracts where status='active') support_contracts,
    (select count(*)::int from tech.collection_cases where status not in ('resolved','written_off')) collection_cases,
    (select count(*)::int from tech.renewal_pipeline where stage not in ('renewed','lost')) renewals_open,
    (select count(*)::int from tech.quotations where status in ('draft','internal_review','approved','sent')) quotations_open,
    (select count(*)::int from tech.release_records where status in ('planned','approved','deploying')) releases_open`;
  const [saas]=await sql<{addons:number;adjustments:number;trials:number;at_risk:number}[]>`select
    (select count(*)::int from tech.subscription_addons where status='active') addons,
    (select count(*)::int from tech.subscription_adjustments where invoiced_at is null) adjustments,
    (select count(*)::int from tech.subscriptions where status='trialing') trials,
    (select count(*)::int from tech.customer_success_health where churn_risk in ('high','elevated')) at_risk`;
  const commercial:Commercial=bu?.id?(await sql<Commercial[]>`select
    (select count(*)::int from tech.sales_leads where business_unit_id=${bu.id}::uuid and status in ('new','qualified')) leads,
    (select count(*)::int from tech.sales_opportunities where business_unit_id=${bu.id}::uuid and stage not in ('won','lost')) opportunities,
    (select coalesce(sum(expected_value*probability/100),0)::numeric from tech.sales_opportunities where business_unit_id=${bu.id}::uuid and stage not in ('won','lost')) weighted_pipeline,
    (select count(*)::int from tech.proposals where business_unit_id=${bu.id}::uuid and status in ('draft','internal_review','approved_internal','sent')) proposals,
    (select count(*)::int from tech.support_tickets where business_unit_id=${bu.id}::uuid and status not in ('resolved','closed')) tickets,
    (select count(*)::int from tech.trial_extension_requests where business_unit_id=${bu.id}::uuid and status='pending') trial_extensions,
    (select count(*)::int from tech.upsell_opportunities where business_unit_id=${bu.id}::uuid and stage not in ('won','lost')) upsells`)[0]:{leads:0,opportunities:0,weighted_pipeline:0,proposals:0,tickets:0,trial_extensions:0,upsells:0};
  const cards=[
    ["Sales → Delivery",`${commercial.leads} leads · ${commercial.opportunities} opportunities`,`Weighted pipeline ${money(Number(commercial.weighted_pipeline||0))}. Proposal, quotation, contract and project conversion controls.`],
    ["Capacity & Timesheets",`${ops.capacity_hotspots} hotspots · ${ops.timesheets_pending} approvals`,`Resource allocation, actual effort, 30/60/90-day utilization and labor cost.`],
    ["Deliverables & UAT",`${ops.deliverables_pending} deliverables · ${ops.uat_open} UAT`,`Client sign-off, testing cycles, delivery handover and acceptance.`],
    ["Issues & Releases",`${ops.issues_open} issues · ${ops.releases_open} releases`,`Bug tracking, environments, deployments and rollback records.`],
    ["Support & Retainers",`${ops.support_contracts} contracts · ${commercial.tickets} tickets`,`Maintenance, warranty, recurring services and SLA escalation.`],
    ["Commercial Control",`${commercial.proposals} proposals · ${ops.collection_cases} collections`,`Internal margin approval, credit control, collections, revenue recognition and credit notes.`],
    ["SaaS Expansion",`${saas.addons} add-ons · ${saas.adjustments} adjustments`,`Proration, usage/overages, seats, pause/resume and customer health.`],
    ["Trials & Growth",`${commercial.trial_extensions} extension approvals · ${commercial.upsells} upsells`,`Trial conversion, controlled extension, renewal and expansion pipeline.`],
    ["Renewals",`${ops.renewals_open} renewals`,`Subscriptions, retainers and support renewal pipeline.`],
    ["Knowledge Loop","Feedback + post-mortems","CSAT/NPS, lessons learned, IP/source handover and portfolio intelligence."],
  ];
  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at 80% 0%,rgba(46,168,255,.18),transparent 30%),#070b12",color:"#eef7ff",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group/tech" style={{color:"#52baff",textDecoration:"none",fontWeight:800}}>← Technology</Link><div style={{margin:"36px 0 24px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#42adf5"}}>TECH BUSINESS OPERATING SYSTEM</div><h1 style={{fontSize:"clamp(34px,5vw,60px)",letterSpacing:"-.05em",margin:"10px 0"}}>Operations Cockpit</h1><p style={{color:"#9eb3c8",maxWidth:820,lineHeight:1.7}}>Sales-to-delivery, capacity, delivery quality, commercial controls, support, recurring revenue, SaaS lifecycle, collections, renewals and customer success in one operational layer.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:28}}>{[["Projects",portfolio.projects],["Active",portfolio.active_projects],["Contracted",money(portfolio.contracted_revenue)],["Forecast margin",money(portfolio.forecast_margin)],["Avg health",Math.round(Number(portfolio.avg_health_score||0))],["Loss risk",portfolio.loss_risk_projects],["Collection risk",portfolio.collection_risk_projects]].map(([label,value])=><article key={String(label)} style={{padding:18,borderRadius:18,border:"1px solid #193650",background:"rgba(46,168,255,.08)"}}><div style={{fontSize:11,color:"#87a9c2",fontWeight:800,textTransform:"uppercase"}}>{label}</div><strong style={{display:"block",fontSize:24,marginTop:8}}>{value}</strong></article>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>{cards.map(([name,value,desc])=><article key={name} style={{padding:24,minHeight:170,borderRadius:24,border:"1px solid #193650",background:"linear-gradient(160deg,rgba(46,168,255,.12),rgba(255,255,255,.025))"}}><h2 style={{fontSize:21,margin:"0 0 8px"}}>{name}</h2><strong style={{display:"block",fontSize:16,color:"#52baff",marginBottom:10}}>{value}</strong><p style={{color:"#99aec2",lineHeight:1.6,margin:0}}>{desc}</p></article>)}</div><TechOpsConsole/></section></main>;
}
