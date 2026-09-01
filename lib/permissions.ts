import { Role } from "@/lib/types";

export type Permission =
  | "view_dashboard" | "view_analytics" | "view_kpis" | "view_reports" | "export_data"
  | "view_clients" | "create_clients" | "edit_clients" | "delete_clients"
  | "view_tasks" | "create_tasks" | "edit_tasks" | "delete_tasks" | "approve_tasks" | "assign_tasks"
  | "view_finance" | "create_invoices" | "edit_invoices" | "approve_invoices" | "view_payroll" | "manage_payroll"
  | "view_media" | "edit_media" | "manage_budgets"
  | "view_sales" | "create_leads" | "edit_leads" | "delete_leads" | "view_proposals" | "create_proposals"
  | "view_team" | "manage_team" | "view_salaries" | "approve_leaves"
  | "use_ai_studio" | "view_ai_history"
  | "manage_workspace" | "manage_users" | "manage_roles" | "manage_billing"
  | "manage_api_keys" | "view_audit_logs" | "manage_integrations"
  | "view_portal" | "approve_creatives" | "pay_invoices"
  | "view_salary_recommendations" | "create_salary_recommendations" | "approve_salary_finance"
  | "approve_salary_cfo" | "lock_payroll" | "unlock_payroll" | "view_payroll_lock"
  | "view_commissions" | "approve_commissions" | "manage_kpis" | "view_kpi_scores"
  | "manage_approval_workflows" | "approve_workflows"
  | "view_agency_health" | "view_ceo_dashboard" | "view_cfo_dashboard" | "view_coo_dashboard"
  | "view_resource_planning" | "manage_resource_planning"
  | "view_knowledge_base" | "manage_knowledge_base"
  | "manage_follow_ups" | "view_follow_ups";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN:["view_dashboard","view_analytics","view_kpis","view_reports","export_data","view_clients","create_clients","edit_clients","delete_clients","view_tasks","create_tasks","edit_tasks","delete_tasks","approve_tasks","assign_tasks","view_finance","create_invoices","edit_invoices","approve_invoices","view_payroll","manage_payroll","view_media","edit_media","manage_budgets","view_sales","create_leads","edit_leads","delete_leads","view_proposals","create_proposals","view_team","manage_team","view_salaries","approve_leaves","use_ai_studio","view_ai_history","manage_workspace","manage_users","manage_roles","manage_billing","manage_api_keys","view_audit_logs","manage_integrations","view_salary_recommendations","create_salary_recommendations","approve_salary_finance","approve_salary_cfo","lock_payroll","unlock_payroll","view_payroll_lock","view_commissions","approve_commissions","manage_kpis","view_kpi_scores","manage_approval_workflows","approve_workflows","view_agency_health","view_ceo_dashboard","view_cfo_dashboard","view_coo_dashboard","view_resource_planning","manage_resource_planning","view_knowledge_base","manage_knowledge_base","manage_follow_ups","view_follow_ups"],
  HR:["view_team","manage_team","view_salaries","view_payroll","manage_payroll","approve_leaves","use_ai_studio","view_ai_history"],
  ACCOUNT_MANAGER:["view_reports","export_data","view_clients","create_clients","edit_clients","view_tasks","create_tasks","edit_tasks","approve_tasks","assign_tasks","view_media","use_ai_studio","view_ai_history"],
  MEDIA_BUYER:["view_reports","export_data","view_clients","view_media","edit_media","manage_budgets","use_ai_studio","view_ai_history"],
  CREATOR:["view_tasks","edit_tasks","use_ai_studio","view_ai_history"],
  ACCOUNTANT:["view_finance","create_invoices","edit_invoices","view_payroll","manage_payroll","view_reports","export_data","view_clients","create_clients","view_team","view_salaries","view_salary_recommendations","approve_salary_finance","view_payroll_lock","view_commissions","view_kpi_scores","view_agency_health","view_cfo_dashboard","view_resource_planning","use_ai_studio","view_ai_history"],
  SALES:["view_sales","create_leads","edit_leads","view_proposals","create_proposals","view_reports","use_ai_studio","view_ai_history"],
  CLIENT:["view_portal","approve_creatives","pay_invoices","use_ai_studio"],
};
export function hasPermission(role:string,permission:Permission,customPermissions?:Permission[]):boolean{return(ROLE_PERMISSIONS[role]??[]).includes(permission)||Boolean(customPermissions?.includes(permission))}
export function hasPermissionAcrossRoles(roles:string[],permission:Permission,customPermissions?:Permission[]):boolean{return Boolean(customPermissions?.includes(permission))||roles.some(role=>(ROLE_PERMISSIONS[role]??[]).includes(permission))}
export function hasAllPermissions(role:string,permissions:Permission[],customPermissions?:Permission[]):boolean{return permissions.every(p=>hasPermission(role,p,customPermissions))}
export function hasAnyPermission(role:string,permissions:Permission[],customPermissions?:Permission[]):boolean{return permissions.some(p=>hasPermission(role,p,customPermissions))}
export function homeFor(role:Role):string{switch(role){case Role.CLIENT:return "/dashboard/portal";case Role.CREATOR:return "/dashboard/creative";case Role.ACCOUNTANT:return "/dashboard/finance";case Role.MEDIA_BUYER:return "/dashboard/media/control-center";case Role.SALES:return "/dashboard/sales";case Role.ACCOUNT_MANAGER:return "/dashboard/clients";case Role.HR:return "/dashboard/team/new";default:return "/apps"}}
export const PERMISSION_GROUPS=[
{group:"Dashboard & Analytics",icon:"📊",permissions:[{key:"view_dashboard",label:"View Dashboard",desc:"Access main dashboard"},{key:"view_analytics",label:"View Analytics",desc:"Access analytics pages"},{key:"view_kpis",label:"View KPIs",desc:"View ERP business intelligence"},{key:"view_reports",label:"View Reports",desc:"Access custom reports"},{key:"export_data",label:"Export Data",desc:"Download CSV/JSON exports"}]},
{group:"Clients",icon:"🏢",permissions:[{key:"view_clients",label:"View Clients",desc:"See client list and details"},{key:"create_clients",label:"Create Clients",desc:"Add new clients"},{key:"edit_clients",label:"Edit Clients",desc:"Modify client information"},{key:"delete_clients",label:"Delete Clients",desc:"Remove clients"}]},
{group:"Creative Tasks",icon:"🎨",permissions:[{key:"view_tasks",label:"View Tasks",desc:"See task list"},{key:"create_tasks",label:"Create Tasks",desc:"Create new tasks with briefs"},{key:"edit_tasks",label:"Edit Tasks",desc:"Modify tasks and briefs"},{key:"delete_tasks",label:"Delete Tasks",desc:"Remove tasks"},{key:"approve_tasks",label:"Approve Tasks",desc:"Approve/reject creative submissions"},{key:"assign_tasks",label:"Assign Tasks",desc:"Assign tasks to creators"}]},
{group:"Finance",icon:"💰",permissions:[{key:"view_finance",label:"View Finance",desc:"Access finance pages"},{key:"create_invoices",label:"Create Invoices",desc:"Generate new invoices"},{key:"edit_invoices",label:"Edit Invoices",desc:"Modify invoice amounts"},{key:"approve_invoices",label:"Approve Invoices",desc:"Mark invoices as approved"},{key:"view_payroll",label:"View Payroll",desc:"See salary information"},{key:"manage_payroll",label:"Manage Payroll",desc:"Create/edit payroll entries"}]},
{group:"Media Buying",icon:"📣",permissions:[{key:"view_media",label:"View Media",desc:"View campaign metrics"},{key:"edit_media",label:"Edit Media",desc:"Update campaign data"},{key:"manage_budgets",label:"Manage Budgets",desc:"Set and adjust ad budgets"}]},
{group:"Sales CRM",icon:"🎯",permissions:[{key:"view_sales",label:"View Sales",desc:"See sales pipeline"},{key:"create_leads",label:"Create Leads",desc:"Add new leads"},{key:"edit_leads",label:"Edit Leads",desc:"Update lead information"},{key:"delete_leads",label:"Delete Leads",desc:"Remove leads"},{key:"view_proposals",label:"View Proposals",desc:"See proposal documents"},{key:"create_proposals",label:"Create Proposals",desc:"Generate client proposals"}]},
{group:"HR & Team",icon:"👥",permissions:[{key:"view_team",label:"View Team",desc:"See staff directory"},{key:"manage_team",label:"Manage Team",desc:"Edit staff information"},{key:"view_salaries",label:"View Salaries",desc:"See payroll amounts"},{key:"approve_leaves",label:"Approve Leaves",desc:"Approve leave requests"}]},
{group:"AI Studio",icon:"✨",permissions:[{key:"use_ai_studio",label:"Use AI Studio",desc:"Access AI-powered tools"},{key:"view_ai_history",label:"View AI History",desc:"See past AI generations"}]},
{group:"Administration",icon:"⚙️",permissions:[{key:"manage_workspace",label:"Manage Workspace",desc:"Edit workspace settings"},{key:"manage_users",label:"Manage Users",desc:"Add/remove/suspend users"},{key:"manage_roles",label:"Manage Roles",desc:"Create and edit roles"},{key:"manage_billing",label:"Manage Billing",desc:"Subscription and payments"},{key:"manage_api_keys",label:"Manage API Keys",desc:"Create/revoke API keys"},{key:"view_audit_logs",label:"View Audit Logs",desc:"See all system changes"},{key:"manage_integrations",label:"Manage Integrations",desc:"Connect external services"}]}
] as const;
