import type {BusinessUnitCode,PermissionKey} from "@/lib/vgroup/contracts";
import type {VGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit,hasPermission} from "@/lib/vgroup/contracts";

export type VivitoWorkspace="group"|"marketing"|"hospitality"|"tech";
export type VivitoRisk="read"|"write"|"sensitive";
export type VivitoJsonValue=null|boolean|number|string|VivitoJsonValue[]|{[key:string]:VivitoJsonValue};
export type VivitoCapability={
  key:string;workspace:VivitoWorkspace;label:string;risk:VivitoRisk;approvalRequired:boolean;enabled:boolean;
  endpoint:string|null;method:"POST"|"GET";permission?:PermissionKey;staticPayload?:Record<string,unknown>;
};

export const VIVITO_CAPABILITIES:readonly VivitoCapability[]=[
  {key:"group.board_action_create",workspace:"group",label:"Create board action",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/board/operations",method:"POST",staticPayload:{action:"action_create"}},
  {key:"group.board_decision_create",workspace:"group",label:"Create board decision",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/board/operations",method:"POST",staticPayload:{action:"decision_create"}},
  {key:"hospitality.owner_create",workspace:"hospitality",label:"Create owner",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/hospitality/owners",method:"POST",permission:"owners:create"},
  {key:"hospitality.property_create",workspace:"hospitality",label:"Create property",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/hospitality/properties",method:"POST",permission:"properties:create"},
  {key:"hospitality.reservation_create",workspace:"hospitality",label:"Create reservation",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/hospitality/reservations",method:"POST",permission:"reservations:create"},
  {key:"tech.project_create",workspace:"tech",label:"Create project",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/tech/projects",method:"POST",permission:"projects:create"},
  {key:"tech.issue_create",workspace:"tech",label:"Create issue",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"issue"}},
  {key:"tech.deliverable_create",workspace:"tech",label:"Create deliverable",risk:"write",approvalRequired:false,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"deliverable"}},
  {key:"tech.release_plan",workspace:"tech",label:"Plan release",risk:"sensitive",approvalRequired:true,enabled:true,endpoint:"/api/vgroup/tech/operations",method:"POST",permission:"projects:update",staticPayload:{operation:"release"}},
  {key:"marketing.task_execute",workspace:"marketing",label:"Execute Marketing task",risk:"sensitive",approvalRequired:true,enabled:false,endpoint:null,method:"POST"},
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
export function vivitoPublicCapabilities(){return VIVITO_CAPABILITIES.map(cap=>({key:cap.key,workspace:cap.workspace,label:cap.label,risk:cap.risk,approvalRequired:cap.approvalRequired,enabled:cap.enabled,method:cap.method,permission:cap.permission,integrationRequired:cap.workspace==="marketing"&&!cap.enabled}))}
