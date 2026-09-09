import {getVGroupSql} from "@/lib/vgroup/db";

export type VivitoVerification={verified:boolean;code:string;entityId?:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function obj(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function nested(value:unknown,key:string){return obj(obj(value)[key]);}
function idFrom(value:unknown,key?:string){
  const source=key?nested(value,key):obj(value);
  const id=String(source.id??"");
  return uuid.test(id)?id:null;
}
async function exists(table:string,id:string){
  const sql=getVGroupSql();
  const allowed=new Set([
    "vgroup.board_action_items","vgroup.board_decisions","hospitality.owners","hospitality.properties","hospitality.reservations","hospitality.housekeeping_tasks",
    "tech.projects","tech.issues","tech.deliverables","tech.timesheets","tech.release_records",
  ]);
  if(!allowed.has(table))return false;
  const rows=await sql.unsafe<{id:string}[]>(`select id::text from ${table} where id=$1::uuid limit 1`,[id]);
  return rows.length===1;
}

export async function verifyVivitoExecution(capabilityKey:string,result:unknown):Promise<VivitoVerification>{
  let id:string|null=null; let table:string|null=null;
  switch(capabilityKey){
    case "group.board_action_create":id=idFrom(result);table="vgroup.board_action_items";break;
    case "group.board_decision_create":id=idFrom(result);table="vgroup.board_decisions";break;
    case "hospitality.owner_create":id=idFrom(result,"owner");table="hospitality.owners";break;
    case "hospitality.property_create":id=idFrom(result,"property");table="hospitality.properties";break;
    case "hospitality.reservation_create":id=idFrom(result,"reservation");table="hospitality.reservations";break;
    case "hospitality.housekeeping_create":id=idFrom(result);table="hospitality.housekeeping_tasks";break;
    case "tech.project_create":id=idFrom(result,"project");table="tech.projects";break;
    case "tech.issue_create":id=idFrom(result);table="tech.issues";break;
    case "tech.deliverable_create":id=idFrom(result);table="tech.deliverables";break;
    case "tech.timesheet_create":id=idFrom(result);table="tech.timesheets";break;
    case "tech.release_plan":id=idFrom(result);table="tech.release_records";break;
    case "hospitality.reservation_status_update":{
      id=idFrom(result,"reservation");
      if(!id)return {verified:false,code:"VERIFY_ENTITY_ID_MISSING"};
      const expected=String(nested(result,"reservation").status??"");
      if(!expected)return {verified:false,code:"VERIFY_STATUS_MISSING",entityId:id};
      const sql=getVGroupSql();
      const rows=await sql<{id:string}[]>`select id::text from hospitality.reservations where id=${id}::uuid and status=${expected} and archived_at is null limit 1`;
      return rows.length===1?{verified:true,code:"BUSINESS_STATE_VERIFIED",entityId:id}:{verified:false,code:"BUSINESS_STATE_MISMATCH",entityId:id};
    }
    case "marketing.task_execute":{
      const response=obj(result);
      return response.verified===true?{verified:true,code:"REMOTE_VERIFICATION_CONFIRMED"}:{verified:false,code:"REMOTE_VERIFICATION_REQUIRED"};
    }
    default:return {verified:false,code:"VERIFIER_NOT_REGISTERED"};
  }
  if(!id||!table)return {verified:false,code:"VERIFY_ENTITY_ID_MISSING"};
  return await exists(table,id)?{verified:true,code:"BUSINESS_STATE_VERIFIED",entityId:id}:{verified:false,code:"BUSINESS_STATE_NOT_FOUND",entityId:id};
}
