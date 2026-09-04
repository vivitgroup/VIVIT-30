import {NextRequest,NextResponse} from "next/server";
import {apiPermissionOrResponse} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";

const ok=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const bad=(code:string,message:string,status=400)=>NextResponse.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
const num=(v:unknown)=>Number(v);
type Sql=ReturnType<typeof getVGroupSql>;

async function techBu(sql:Sql){const [bu]=await sql<{id:string}[]>`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;if(!bu)throw new Error("TECH_BUSINESS_UNIT_UNAVAILABLE");return bu.id}
async function requireProject(sql:Sql,buId:string,projectId:string){const [row]=await sql`select id from tech.projects where id=${projectId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`;return Boolean(row)}
async function requireClient(sql:Sql,buId:string,clientId:string){const [row]=await sql`select id from tech.clients where id=${clientId}::uuid and business_unit_id=${buId}::uuid and archived_at is null`;return Boolean(row)}

export async function GET(){
  const auth=await apiPermissionOrResponse("tech","projects:view"); if(auth instanceof NextResponse)return auth;
  const sql=getVGroupSql();
  const [portfolio]=await sql`select * from tech.portfolio_summary`;
  const [ops]=await sql`select
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
  return ok({portfolio,operations:ops});
}

export async function POST(request:NextRequest){
  const session=await apiPermissionOrResponse("tech","projects:update"); if(session instanceof NextResponse)return session;
  const sql=getVGroupSql();
  const buId=await techBu(sql);
  let body:Record<string,unknown>; try{body=await request.json()}catch{return bad("INVALID_JSON","Invalid JSON body")}
  const operation=str(body.operation);
  try{
    switch(operation){
      case "timesheet": {
        const projectId=str(body.projectId),hours=num(body.hours),workDate=str(body.workDate),hourlyCost=num(body.hourlyCost??0);
        if(!projectId||!workDate||!Number.isFinite(hours)||hours<=0||hours>24)return bad("INVALID_TIMESHEET","projectId, workDate and valid hours are required");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        const [row]=await sql`insert into tech.timesheets(project_id,user_id,work_date,hours,hourly_cost,billable,description,status) values(${projectId}::uuid,${session.userId}::uuid,${workDate}::date,${hours},${Number.isFinite(hourlyCost)?hourlyCost:0},${body.billable!==false},${str(body.description)||null},'submitted') returning id::text,status`;
        return ok(row,201);
      }
      case "capacity": {
        const userId=str(body.userId),projectId=str(body.projectId),start=str(body.periodStart),end=str(body.periodEnd),allocation=num(body.allocationPercent),capacity=num(body.capacityHours??0),allocated=num(body.allocatedHours??0);
        if(!userId||!projectId||!start||!end||!Number.isFinite(allocation)||allocation<0||allocation>100)return bad("INVALID_CAPACITY","Capacity fields are incomplete or invalid");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        const [row]=await sql`insert into tech.resource_capacity(user_id,project_id,period_start,period_end,capacity_hours,allocated_hours,allocation_percent,status) values(${userId}::uuid,${projectId}::uuid,${start}::date,${end}::date,${capacity},${allocated},${allocation},'planned') returning id::text`;
        return ok(row,201);
      }
      case "deliverable": {
        const projectId=str(body.projectId),title=str(body.title),phaseId=str(body.phaseId),milestoneId=str(body.milestoneId); if(!projectId||!title)return bad("INVALID_DELIVERABLE","projectId and title are required");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        if(phaseId){const [phase]=await sql`select id from tech.project_phases where id=${phaseId}::uuid and project_id=${projectId}::uuid`;if(!phase)return bad("PHASE_NOT_FOUND","Phase does not belong to Tech project",404)}
        if(milestoneId){const [milestone]=await sql`select id from tech.project_milestones where id=${milestoneId}::uuid and project_id=${projectId}::uuid`;if(!milestone)return bad("MILESTONE_NOT_FOUND","Milestone does not belong to Tech project",404)}
        const [row]=await sql`insert into tech.deliverables(project_id,phase_id,milestone_id,title,description,version,status,requires_client_signoff) values(${projectId}::uuid,${phaseId||null}::uuid,${milestoneId||null}::uuid,${title},${str(body.description)||null},${str(body.version)||null},'draft',${body.requiresClientSignoff!==false}) returning id::text,status`;
        return ok(row,201);
      }
      case "uat": {
        const projectId=str(body.projectId),deliverableId=str(body.deliverableId); if(!projectId)return bad("INVALID_UAT","projectId is required");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        if(deliverableId){const [deliverable]=await sql`select id from tech.deliverables where id=${deliverableId}::uuid and project_id=${projectId}::uuid`;if(!deliverable)return bad("DELIVERABLE_NOT_FOUND","Deliverable does not belong to Tech project",404)}
        const [row]=await sql`insert into tech.uat_cycles(project_id,deliverable_id,cycle_number,status,starts_at,notes) values(${projectId}::uuid,${deliverableId||null}::uuid,${num(body.cycleNumber)||1},'testing',now(),${str(body.notes)||null}) returning id::text,status`;
        return ok(row,201);
      }
      case "issue": {
        const projectId=str(body.projectId),title=str(body.title),severity=str(body.severity)||"medium",uatCycleId=str(body.uatCycleId),deliverableId=str(body.deliverableId); if(!projectId||!title)return bad("INVALID_ISSUE","projectId and title are required");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        if(uatCycleId){const [uat]=await sql`select id from tech.uat_cycles where id=${uatCycleId}::uuid and project_id=${projectId}::uuid`;if(!uat)return bad("UAT_NOT_FOUND","UAT cycle does not belong to Tech project",404)}
        if(deliverableId){const [deliverable]=await sql`select id from tech.deliverables where id=${deliverableId}::uuid and project_id=${projectId}::uuid`;if(!deliverable)return bad("DELIVERABLE_NOT_FOUND","Deliverable does not belong to Tech project",404)}
        const [row]=await sql`insert into tech.issues(project_id,uat_cycle_id,deliverable_id,issue_type,title,description,severity,status,owner_id,due_at) values(${projectId}::uuid,${uatCycleId||null}::uuid,${deliverableId||null}::uuid,${str(body.issueType)||"bug"},${title},${str(body.description)||null},${severity},'open',${str(body.ownerId)||null}::uuid,${str(body.dueAt)||null}::timestamptz) returning id::text,status`;
        return ok(row,201);
      }
      case "release": {
        const projectId=str(body.projectId),version=str(body.version),environmentId=str(body.environmentId); if(!projectId||!version)return bad("INVALID_RELEASE","projectId and version are required");
        if(!await requireProject(sql,buId,projectId))return bad("PROJECT_NOT_FOUND","Tech project not found",404);
        if(environmentId){const [environment]=await sql`select id from tech.project_environments where id=${environmentId}::uuid and project_id=${projectId}::uuid`;if(!environment)return bad("ENVIRONMENT_NOT_FOUND","Environment does not belong to Tech project",404)}
        const [row]=await sql`insert into tech.release_records(project_id,environment_id,version,release_type,status,release_notes,rollback_reference) values(${projectId}::uuid,${environmentId||null}::uuid,${version},${str(body.releaseType)||"standard"},'planned',${str(body.releaseNotes)||null},${str(body.rollbackReference)||null}) returning id::text,status`;
        return ok(row,201);
      }
      case "support_contract": {
        const clientId=str(body.clientId),name=str(body.name),start=str(body.startDate),projectId=str(body.projectId); if(!clientId||!name||!start)return bad("INVALID_SUPPORT_CONTRACT","clientId, name and startDate are required");
        if(!await requireClient(sql,buId,clientId))return bad("CLIENT_NOT_FOUND","Tech client not found",404);
        if(projectId){const [project]=await sql`select id from tech.projects where id=${projectId}::uuid and business_unit_id=${buId}::uuid and client_id=${clientId}::uuid and archived_at is null`;if(!project)return bad("PROJECT_CLIENT_MISMATCH","Project does not belong to Tech client",409)}
        const [row]=await sql`insert into tech.support_contracts(business_unit_id,client_id,project_id,contract_type,name,currency,monthly_fee,included_hours,overage_hour_rate,start_date,end_date,billing_day,status,sla_rule_id) values(${buId}::uuid,${clientId}::uuid,${projectId||null}::uuid,${str(body.contractType)||"support"},${name},${str(body.currency)||"EGP"},${num(body.monthlyFee)||0},${num(body.includedHours)||0},${num(body.overageHourRate)||0},${start}::date,${str(body.endDate)||null}::date,${num(body.billingDay)||1},'draft',${str(body.slaRuleId)||null}::uuid) returning id::text,status`;
        return ok(row,201);
      }
      case "quotation": {
        const clientId=str(body.clientId),title=str(body.title); if(!clientId||!title)return bad("INVALID_QUOTATION","clientId and title are required");
        if(!await requireClient(sql,buId,clientId))return bad("CLIENT_NOT_FOUND","Tech client not found",404);
        const [row]=await sql`insert into tech.quotations(business_unit_id,client_id,service_id,title,currency,discount,duration_days,status,valid_until,created_by) values(${buId}::uuid,${clientId}::uuid,${str(body.serviceId)||null}::uuid,${title},${str(body.currency)||"EGP"},${num(body.discount)||0},${num(body.durationDays)||0},'draft',${str(body.validUntil)||null}::date,${session.userId}::uuid) returning id::text,status`;
        return ok(row,201);
      }
      case "feedback": {
        const projectId=str(body.projectId),clientId=str(body.clientId),score=num(body.score); if(!projectId||!clientId||score<1||score>5)return bad("INVALID_FEEDBACK","projectId, clientId and score 1..5 are required");
        if(!await requireClient(sql,buId,clientId))return bad("CLIENT_NOT_FOUND","Tech client not found",404);
        const [project]=await sql`select id from tech.projects where id=${projectId}::uuid and business_unit_id=${buId}::uuid and client_id=${clientId}::uuid and archived_at is null`;if(!project)return bad("PROJECT_CLIENT_MISMATCH","Project does not belong to Tech client",409);
        const [row]=await sql`insert into tech.client_feedback(project_id,client_id,feedback_type,score,nps_score,comments) values(${projectId}::uuid,${clientId}::uuid,${str(body.feedbackType)||"delivery"},${score},${body.npsScore==null?null:num(body.npsScore)},${str(body.comments)||null}) returning id::text`;
        return ok(row,201);
      }
      default:return bad("UNSUPPORTED_OPERATION","Unsupported Tech operation");
    }
  }catch(error){const message=error instanceof Error?error.message:"TECH_OPERATION_FAILED"; return bad(message.includes("RESOURCE_OVERALLOCATED")?"RESOURCE_OVERALLOCATED":"TECH_OPERATION_FAILED",message,409)}
}
