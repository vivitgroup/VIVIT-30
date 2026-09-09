import {canAccessBusinessUnit,hasPermission} from "@/lib/vgroup/contracts";
import type {BusinessUnitCode,PermissionKey} from "@/lib/vgroup/contracts";
import {getHospitalityDashboard,getTechDashboard} from "@/lib/vgroup/dashboard";
import {getVGroupSql} from "@/lib/vgroup/db";
import type {VGroupSession} from "@/lib/vgroup/session";
import type {VivitoWorkspace} from "@/lib/vgroup/vivito-cross-workspace";

export type VivitoReadToolKey=
  |"group.executive_pulse"
  |"hospitality.overview"
  |"hospitality.operations_summary"
  |"hospitality.properties_list"
  |"hospitality.reservations_list"
  |"tech.overview"
  |"tech.operations_summary"
  |"tech.projects_list"
  |"tech.issues_list";

export type VivitoReadTool={
  key:VivitoReadToolKey;
  workspace:VivitoWorkspace;
  label:string;
  permission?:PermissionKey;
  execute:(session:VGroupSession)=>Promise<unknown>;
};

function canReadUnit(session:VGroupSession,unit:BusinessUnitCode,permission?:PermissionKey){
  if(!canAccessBusinessUnit(session,unit))return false;
  return permission?hasPermission(session,unit,permission):true;
}

async function hospitalityOperationsSummary(){
  const sql=getVGroupSql();
  const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='hospitality' and status='active' limit 1`;
  if(!bu)throw new Error("HOSPITALITY_BUSINESS_UNIT_UNAVAILABLE");
  const [summary]=await sql<Record<string,unknown>[]>`select
    (select count(*)::int from hospitality.housekeeping_tasks where business_unit_id=${bu.id}::uuid and status not in ('passed','cancelled')) housekeeping_open,
    (select count(*)::int from hospitality.guest_complaints where business_unit_id=${bu.id}::uuid and status not in ('resolved','closed')) complaints_open,
    (select count(*)::int from hospitality.guest_conversations where business_unit_id=${bu.id}::uuid and status<>'closed') inbox_open,
    (select count(*)::int from hospitality.preventive_maintenance_plans where business_unit_id=${bu.id}::uuid and active and next_due_on<=current_date+30) maintenance_due,
    (select count(*)::int from hospitality.procurement_rfqs where business_unit_id=${bu.id}::uuid and status in ('open','evaluation')) rfqs_open,
    (select count(*)::int from hospitality.channel_reconciliations where business_unit_id=${bu.id}::uuid and status in ('pending','variance')) channel_reconciliation_open,
    (select count(*)::int from hospitality.lost_found_items where business_unit_id=${bu.id}::uuid and status not in ('returned','disposed')) lost_found_open,
    (select count(*)::int from hospitality.stay_operations where business_unit_id=${bu.id}::uuid and status<>'closed') stay_operations_open`;
  return summary??{};
}

async function hospitalityPropertiesList(){
  const sql=getVGroupSql();
  const rows=await sql<Record<string,unknown>[]>`select p.id::text,p.owner_id::text,o.full_name owner_name,p.name,p.property_type,p.city,p.country,p.bedrooms,p.bathrooms,p.max_guests,p.status,
    coalesce((select count(*)::int from hospitality.property_images i where i.property_id=p.id and i.archived_at is null),0) image_count
    from hospitality.properties p left join hospitality.owners o on o.id=p.owner_id
    where p.archived_at is null order by p.created_at desc limit 100`;
  return {properties:Array.from(rows)};
}

async function hospitalityReservationsList(){
  const sql=getVGroupSql();
  const rows=await sql<Record<string,unknown>[]>`select r.id::text,r.property_id::text,p.name property_name,r.source,r.guest_name,r.check_in,r.check_out,
    r.guests,r.currency,r.gross_amount,r.platform_fee,r.company_commission,r.net_owner_amount,r.status
    from hospitality.reservations r join hospitality.properties p on p.id=r.property_id
    where r.archived_at is null order by r.check_in desc,r.created_at desc limit 100`;
  return {reservations:Array.from(rows)};
}

async function techOperationsSummary(){
  const sql=getVGroupSql();
  const [portfolio]=await sql<Record<string,unknown>[]>`select * from tech.portfolio_summary`;
  const [operations]=await sql<Record<string,unknown>[]>`select
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
  return {portfolio:portfolio??{},operations:operations??{}};
}

async function techProjectsList(){
  const sql=getVGroupSql();
  const rows=await sql<Record<string,unknown>[]>`select p.id::text,p.client_id::text,c.company_name client_name,p.name,p.project_type,p.currency,p.current_price,p.progress_percent,p.current_phase,p.target_end,p.status
    from tech.projects p join tech.clients c on c.id=p.client_id
    where p.archived_at is null order by p.created_at desc limit 100`;
  return {projects:Array.from(rows)};
}

async function techIssuesList(){
  const sql=getVGroupSql();
  const rows=await sql<Record<string,unknown>[]>`select i.id::text,i.project_id::text,p.name project_name,i.issue_type,i.title,i.severity,i.status,i.owner_id::text,i.due_at
    from tech.issues i join tech.projects p on p.id=i.project_id
    where p.archived_at is null and i.status not in ('closed','wont_fix')
    order by case i.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,i.due_at nulls last limit 100`;
  return {issues:Array.from(rows)};
}

export const VIVITO_READ_TOOLS:readonly VivitoReadTool[]=[
  {key:"hospitality.overview",workspace:"hospitality",label:"Hospitality overview",permission:"properties:view",execute:async()=>getHospitalityDashboard()},
  {key:"hospitality.operations_summary",workspace:"hospitality",label:"Hospitality operations summary",permission:"properties:view",execute:async()=>hospitalityOperationsSummary()},
  {key:"hospitality.properties_list",workspace:"hospitality",label:"Hospitality properties",permission:"properties:view",execute:async()=>hospitalityPropertiesList()},
  {key:"hospitality.reservations_list",workspace:"hospitality",label:"Hospitality reservations",permission:"reservations:view",execute:async()=>hospitalityReservationsList()},
  {key:"tech.overview",workspace:"tech",label:"Tech overview",permission:"projects:view",execute:async()=>getTechDashboard()},
  {key:"tech.operations_summary",workspace:"tech",label:"Tech operations summary",permission:"projects:view",execute:async()=>techOperationsSummary()},
  {key:"tech.projects_list",workspace:"tech",label:"Tech projects",permission:"projects:view",execute:async()=>techProjectsList()},
  {key:"tech.issues_list",workspace:"tech",label:"Tech open issues",permission:"projects:view",execute:async()=>techIssuesList()},
  {key:"group.executive_pulse",workspace:"group",label:"Group executive pulse",execute:async(session)=>{
    const data:Record<string,unknown>={};
    if(canReadUnit(session,"hospitality","properties:view")){
      data.hospitality={overview:await getHospitalityDashboard(),operations:await hospitalityOperationsSummary()};
    }
    if(canReadUnit(session,"tech","projects:view")){
      data.tech={overview:await getTechDashboard(),operations:await techOperationsSummary()};
    }
    return data;
  }},
] as const;

export function findVivitoReadTool(key:VivitoReadToolKey){return VIVITO_READ_TOOLS.find(tool=>tool.key===key)}

export function canUseVivitoReadTool(session:VGroupSession,tool:VivitoReadTool){
  if(tool.workspace==="group")return true;
  return canReadUnit(session,tool.workspace as BusinessUnitCode,tool.permission);
}

const OPERATIONS_INTENT=/(operation|operations|risk|risks|problem|problems|attention|today|housekeeping|maintenance|complaint|inbox|release|uat|capacity|timesheet|deliverable|تشغيل|عمليات|مشكلة|مشاكل|مخاطر|اليوم|هاوس كيبنج|صيانة|شكوى|شكاوى|اصدار|إصدار)/i;
const PROPERTY_INTENT=/(property|properties|unit|units|villa|apartment|owner property|عقار|عقارات|وحدة|وحدات|فيلا|شقة|شقق)/i;
const RESERVATION_INTENT=/(reservation|reservations|booking|bookings|guest|guests|check.?in|check.?out|حجز|حجوزات|ضيف|ضيوف|تشيك.?ان|تشيك.?اوت)/i;
const PROJECT_INTENT=/(project|projects|portfolio|progress|phase|deadline|delivery|مشروع|مشاريع|بروجكت|بروجكتات|تقدم|مرحلة|تسليم)/i;
const ISSUE_INTENT=/(issue|issues|bug|bugs|incident|incidents|defect|defects|problem|problems|مشكلة|مشاكل|باج|باجات|عطل|اعطال|أعطال)/i;

function unique(keys:VivitoReadToolKey[]){return [...new Set(keys)]}

export function selectVivitoReadTools(workspace:VivitoWorkspace,question:string):VivitoReadToolKey[]{
  if(workspace==="group")return ["group.executive_pulse"];
  if(workspace==="hospitality"){
    const keys:VivitoReadToolKey[]=["hospitality.overview"];
    if(OPERATIONS_INTENT.test(question))keys.push("hospitality.operations_summary");
    if(PROPERTY_INTENT.test(question))keys.push("hospitality.properties_list");
    if(RESERVATION_INTENT.test(question))keys.push("hospitality.reservations_list");
    return unique(keys);
  }
  if(workspace==="tech"){
    const keys:VivitoReadToolKey[]=["tech.overview"];
    if(OPERATIONS_INTENT.test(question))keys.push("tech.operations_summary");
    if(PROJECT_INTENT.test(question))keys.push("tech.projects_list");
    if(ISSUE_INTENT.test(question))keys.push("tech.issues_list");
    return unique(keys);
  }
  return [];
}

export async function buildVivitoLiveReadContext(session:VGroupSession,workspace:VivitoWorkspace,question:string){
  const selected=selectVivitoReadTools(workspace,question);
  const tools:Record<string,unknown>={};
  const denied:string[]=[];
  const failed:string[]=[];
  for(const key of selected){
    const tool=findVivitoReadTool(key);
    if(!tool)continue;
    if(!canUseVivitoReadTool(session,tool)){denied.push(key);continue}
    try{tools[key]=await tool.execute(session)}catch{failed.push(key)}
  }
  return {tools,denied,failed};
}
