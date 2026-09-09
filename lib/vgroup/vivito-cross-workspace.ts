import type {BusinessUnitCode,PermissionKey} from "@/lib/vgroup/contracts";
import type {VGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit,hasPermission} from "@/lib/vgroup/contracts";

export type VivitoWorkspace="group"|"marketing"|"hospitality"|"tech";
export type VivitoRisk="read"|"write"|"sensitive";
export type VivitoHttpMethod="POST"|"GET"|"PATCH"|"DELETE";
export type VivitoJsonValue=null|boolean|number|string|VivitoJsonValue[]|{[key:string]:VivitoJsonValue};
export type VivitoCapability={
  key:string;workspace:VivitoWorkspace;label:string;risk:VivitoRisk;approvalRequired:boolean;enabled:boolean;endpoint:string|null;method:VivitoHttpMethod;
  permission?:PermissionKey;staticPayload?:Record<string,unknown>;allowedPayloadKeys?:readonly string[];requiredPayloadKeys?:readonly string[];
};
const marketingEnabled=process.env.VGROUP_MARKETING_INTEGRATION_ENABLED==="true";

export const VIVITO_CAPABILITIES:readonly VivitoCapability[]=[
  {key:"group.board_action_create",workspace:"group",label:"Create board action",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/board/operations",method:"POST",staticPayload:{action:"action_create"},allowedPayloadKeys:["businessUnit","decisionId","title","priority","dueAt"],requiredPayloadKeys:["title"]},
  {key:"group.board_decision_create",workspace:"group",label:"Create board decision",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/board/operations",method:"POST",staticPayload:{action:"decision_create"},allowedPayloadKeys:["businessUnit","title","decisionType","decisionText"],requiredPayloadKeys:["title","decisionType"]},
  {key:"hospitality.owner_create",workspace:"hospitality",label:"Create owner",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/hospitality/owners",method:"POST",permission:"owners:create",allowedPayloadKeys:["fullName","email","phone"],requiredPayloadKeys:["fullName"]},
  {key:"hospitality.property_create",workspace:"hospitality",label:"Create property",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/hospitality/properties",method:"POST",permission:"properties:create",allowedPayloadKeys:["ownerId","name","propertyType","addressLine1","addressLine2","city","country","bedrooms","bathrooms","maxGuests"],requiredPayloadKeys:["name"]},
  {key:"hospitality.reservation_create",workspace:"hospitality",label:"Create reservation",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/hospitality/reservations",method:"POST",permission:"reservations:create",allowedPayloadKeys:["propertyId","guestName","checkIn","checkOut","source","guests","grossAmount","platformFee","companyCommission","guestEmail","guestPhone","currency"],requiredPayloadKeys:["propertyId","guestName","checkIn","checkOut"]},
  {key:"hospitality.reservation_status_update",workspace:"hospitality",label:"Update reservation status",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/hospitality/reservations",method:"PATCH",permission:"reservations:update",allowedPayloadKeys:["reservationId","status"],requiredPayloadKeys:["reservationId","status"]},
  {key:"hospitality.housekeeping_create",workspace:"hospitality",label:"Create housekeeping task",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/hospitality/operating-system",method:"POST",permission:"properties:update",staticPayload:{operation:"housekeeping"},allowedPayloadKeys:["propertyId","scheduledStart","dueAt","reservationId","assignedTo","taskType","notes"],requiredPayloadKeys:["propertyId","scheduledStart","dueAt"]},
  {key:"tech.project_create",workspace:"tech",label:"Create project",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/tech/projects",method:"POST",permission:"projects:create",allowedPayloadKeys:["clientId","name","projectType","basePrice","projectManagerId","description","currency","plannedStart","plannedEnd"],requiredPayloadKeys:["clientId","name"]},
  {key:"tech.issue_create",workspace:"tech",label:"Create issue",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"issue"},allowedPayloadKeys:["projectId","title","severity","uatCycleId","deliverableId","issueType","description","ownerId","dueAt"],requiredPayloadKeys:["projectId","title"]},
  {key:"tech.deliverable_create",workspace:"tech",label:"Create deliverable",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"deliverable"},allowedPayloadKeys:["projectId","title","phaseId","milestoneId","description","version","requiresClientSignoff"],requiredPayloadKeys:["projectId","title"]},
  {key:"tech.timesheet_create",workspace:"tech",label:"Create timesheet",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"timesheet"},allowedPayloadKeys:["projectId","hours","workDate","hourlyCost","billable","description"],requiredPayloadKeys:["projectId","hours","workDate"]},
  {key:"tech.release_plan",workspace:"tech",label:"Plan release",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"release"},allowedPayloadKeys:["projectId","version","environmentId","releaseType","releaseNotes","rollbackReference"],requiredPayloadKeys:["projectId","version"]},
  {key:"marketing.task_execute",workspace:"marketing",label:"Execute Marketing task",risk:"sensitive",approvalRequired:true,enabled:marketingEnabled,endpoint:marketingEnabled?"/api/integrations/vgroup-vivito-marketing":null,method:"POST"},
] as const;

export function findVivitoCapability(key:string){return VIVITO_CAPABILITIES.find(item=>item.key===key)}
export function canUseVivitoCapability(session:VGroupSession,cap:VivitoCapability){
  if(cap.workspace==="group")return session.memberships.some(m=>m.role==="GROUP_SUPER_ADMIN");
  if(cap.workspace==="marketing"&&!cap.enabled)return false;
  const unit=cap.workspace as BusinessUnitCode;
  if(!canAccessBusinessUnit(session,unit))return false;
  return cap.permission?hasPermission(session,unit,cap.permission):true;
}
const secretKey=/(token|secret|password|authorization|cookie|token_ref|ical|api[_-]?key)/i;
export function redactVivito(value:unknown):VivitoJsonValue{
  if(value===null||value===undefined)return null;
  if(typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number")return Number.isFinite(value)?value:null;
  if(typeof value==="bigint")return value.toString();
  if(Array.isArray(value))return value.map(redactVivito);
  if(typeof value==="object")return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,secretKey.test(k)?"[REDACTED]":redactVivito(v)]));
  return String(value);
}
export function vivitoPublicCapabilities(){return VIVITO_CAPABILITIES.map(cap=>({key:cap.key,workspace:cap.workspace,label:cap.label,risk:cap.risk,approvalRequired:cap.approvalRequired||cap.risk==="sensitive",enabled:cap.enabled,method:cap.method,permission:cap.permission,integrationRequired:cap.workspace==="marketing"&&!cap.enabled}))}
