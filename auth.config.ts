import type {NextAuthConfig} from "next-auth";
import {Role} from "@/lib/types";
import type {Permission} from "@/lib/permissions";

type LiveState={role?:string;workspace_id?:string;is_active?:boolean;approval_status?:string;passwordChangedAt?:string|null;roles?:Role[];permissions?:Permission[]};
type PasswordAudit={created_at?:string|null};
type RoleAssignment={role?:string|null};
type PermissionGrant={permission?:string|null};
const isRole=(value:unknown):value is Role=>typeof value==="string"&&Object.values(Role).some(role=>role===value);
const isPermission=(value:unknown):value is Permission=>typeof value==="string"&&[
 "view_dashboard","view_analytics","view_kpis","view_reports","export_data","view_clients","create_clients","edit_clients","delete_clients","view_tasks","create_tasks","edit_tasks","delete_tasks","approve_tasks","assign_tasks","view_finance","create_invoices","edit_invoices","approve_invoices","view_payroll","manage_payroll","view_media","edit_media","manage_budgets","view_sales","create_leads","edit_leads","delete_leads","view_proposals","create_proposals","view_team","manage_team","view_salaries","approve_leaves","use_ai_studio","view_ai_history","manage_workspace","manage_users","manage_roles","manage_billing","manage_api_keys","view_audit_logs","manage_integrations","view_portal","approve_creatives","pay_invoices","view_salary_recommendations","create_salary_recommendations","approve_salary_finance","approve_salary_cfo","lock_payroll","unlock_payroll","view_payroll_lock","view_commissions","approve_commissions","manage_kpis","view_kpi_scores","manage_approval_workflows","approve_workflows","view_agency_health","view_ceo_dashboard","view_cfo_dashboard","view_coo_dashboard","view_resource_planning","manage_resource_planning","view_knowledge_base","manage_knowledge_base","manage_follow_ups","view_follow_ups"
].includes(value);
async function liveUserState(userId:string):Promise<LiveState|null>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return null;
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 try{
  const [userRes,auditRes]=await Promise.all([
   fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=role,workspace_id,is_active,approval_status&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)}),
   fetch(`${url}/rest/v1/audit_logs?user_id=eq.${encodeURIComponent(userId)}&action=eq.password_changed&select=created_at&order=created_at.desc&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)})
  ]);
  if(!userRes.ok||!auditRes.ok)return null;
  const [users,audits]=await Promise.all([userRes.json() as Promise<LiveState[]>,auditRes.json() as Promise<PasswordAudit[]>]);
  const live=users[0];if(!live)return null;
  const workspaceId=String(live.workspace_id||"");
  let roleRows:RoleAssignment[]=[],permissionRows:PermissionGrant[]=[];
  if(workspaceId){
   const [rolesRes,permissionsRes]=await Promise.all([
    fetch(`${url}/rest/v1/user_role_assignments?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&select=role`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)}).catch(()=>null),
    fetch(`${url}/rest/v1/user_permission_grants?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&select=permission`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)}).catch(()=>null)
   ]);
   if(rolesRes?.ok)roleRows=await rolesRes.json() as RoleAssignment[];
   if(permissionsRes?.ok)permissionRows=await permissionsRes.json() as PermissionGrant[];
  }
  const primary=isRole(live.role)?live.role:undefined;
  const roles=[...new Set([primary,...roleRows.map(row=>row.role).filter(isRole)].filter(Boolean))] as Role[];
  const permissions=[...new Set(permissionRows.map(row=>row.permission).filter(isPermission))] as Permission[];
  return {...live,passwordChangedAt:audits[0]?.created_at??null,roles,permissions};
 }catch{return null}
}
const authConfig={
 trustHost:true,
 session:{strategy:"jwt"},
 pages:{signIn:"/login"},
 providers:[],
 callbacks:{
  async jwt({token,user}){
   if(user){token.role=user.role;token.roles=user.roles??(user.role?[user.role]:[]);token.permissions=user.permissions??[];token.workspaceId=user.workspaceId;token.authValid=true}
   if(token.sub){
    const live=await liveUserState(token.sub),issuedAtMs=Number(token.iat||0)*1000,passwordChangedMs=live?.passwordChangedAt?new Date(live.passwordChangedAt).getTime():0;
    token.authValid=Boolean(live?.is_active)&&String(live?.approval_status||"")==="APPROVED"&&(!passwordChangedMs||passwordChangedMs<=issuedAtMs);
    if(isRole(live?.role))token.role=live.role;
    token.roles=live?.roles??(isRole(live?.role)?[live.role]:[]);
    token.permissions=live?.permissions??[];
    if(live?.workspace_id)token.workspaceId=live.workspace_id;
   }else token.authValid=false;
   return token;
  },
  session({session,token}){
   if(session.user){
    const role=token.role,workspaceId=token.workspaceId;
    session.user.id=token.sub??"";
    session.user.role=isRole(role)?role:undefined;
    session.user.roles=Array.isArray(token.roles)?token.roles.filter(isRole):[];
    session.user.permissions=Array.isArray(token.permissions)?token.permissions.filter(isPermission):[];
    session.user.workspaceId=typeof workspaceId==="string"?workspaceId:undefined;
    session.user.authValid=token.authValid===true;
   }
   return session;
  },
 },
} satisfies NextAuthConfig;
export default authConfig;
