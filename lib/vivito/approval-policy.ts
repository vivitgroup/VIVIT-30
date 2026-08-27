import {VIVITO_ACTION_CATALOG,type VivitoActionOp,type VivitoActionRisk} from "./action-engine";

export type VivitoApprovalMode="AUTO"|"CONFIRM"|"SUPER_ADMIN_CONFIRM"|"BLOCK";
export type VivitoApprovalDecision={mode:VivitoApprovalMode;reason:string;risk:VivitoActionRisk;requiresConfirmation:boolean;requiresSuperAdmin:boolean};

const SUPER_ADMIN_ONLY_CONFIRM=new Set<VivitoActionOp>([
  "delete_client","delete_task","revoke_api_key","revoke_webhook","disconnect_integration","update_workspace_settings"
]);
const ALWAYS_CONFIRM=new Set<VivitoActionOp>([
  "archive_client","archive_task","move_lead","schedule_post","log_expense","record_payment","create_invoice","create_user","update_user","set_user_active",
  "decide_leave","upsert_payroll","set_payroll_status","create_contract","update_contract","send_email","send_whatsapp","create_api_key","create_webhook",
  "update_campaign","start_integration","bulk_update_tasks","bulk_remind_clients"
]);
const SAFE_AUTO=new Set<VivitoActionOp>([
  "remind_me","restore_client","restore_task","create_task","update_task","reassign_task","create_client","update_client","add_client_contact","attach_file",
  "create_lead","update_lead","sync_campaign","export_data","generate_report","update_onboarding","record_nps","create_referral","create_leave_request"
]);

export function decideVivitoApproval(op:VivitoActionOp,role:string):VivitoApprovalDecision{
  const meta=VIVITO_ACTION_CATALOG[op];
  if(!meta||!meta.roles.includes(role))return{mode:"BLOCK",reason:"This role is not authorized for the requested ERP action.",risk:meta?.risk||"high",requiresConfirmation:true,requiresSuperAdmin:false};
  if(SUPER_ADMIN_ONLY_CONFIRM.has(op))return role==="SUPER_ADMIN"
    ?{mode:"SUPER_ADMIN_CONFIRM",reason:"Destructive or workspace-critical action requires explicit Super Admin confirmation.",risk:meta.risk,requiresConfirmation:true,requiresSuperAdmin:true}
    :{mode:"BLOCK",reason:"This action is restricted to Super Admin.",risk:meta.risk,requiresConfirmation:true,requiresSuperAdmin:true};
  if(meta.risk==="destructive")return{mode:role==="SUPER_ADMIN"?"SUPER_ADMIN_CONFIRM":"BLOCK",reason:"Destructive actions never auto-execute.",risk:meta.risk,requiresConfirmation:true,requiresSuperAdmin:true};
  if(ALWAYS_CONFIRM.has(op)||meta.risk==="high")return{mode:"CONFIRM",reason:"High-impact, financial, external-send, access-control or lifecycle action requires explicit confirmation.",risk:meta.risk,requiresConfirmation:true,requiresSuperAdmin:false};
  if(SAFE_AUTO.has(op)&&["low","medium"].includes(meta.risk))return{mode:"AUTO",reason:"Bounded reversible/operational action may auto-execute inside the caller's RBAC scope.",risk:meta.risk,requiresConfirmation:false,requiresSuperAdmin:false};
  return{mode:"CONFIRM",reason:"Action requires explicit confirmation by default.",risk:meta.risk,requiresConfirmation:true,requiresSuperAdmin:false};
}

const REQUIRED:Partial<Record<VivitoActionOp,string[]>>={
  create_client:["companyName"],create_task:["clientName","title","brief","deadline"],record_payment:["clientName","amount"],
  create_invoice:["clientName","month","year","retainer"],attach_file:["clientName","fileId"],schedule_post:["clientName","title","date","platform","fileId"],
  create_user:["name","email","role"],create_leave_request:["fromDate","toDate","type"],decide_leave:["leaveId","decision"],
  upsert_payroll:["userName","month","year","baseSalary"],set_payroll_status:["userName","month","year","status"],
  create_contract:["clientName","title","value","startDate","endDate"],send_email:["to","subject","body"],send_whatsapp:["to","body"],
  revoke_api_key:["apiKeyId"],create_webhook:["url","events"],revoke_webhook:["webhookId"],disconnect_integration:["platform","clientName"],
  record_nps:["clientName","score"],create_referral:["email"]
};
export function missingVivitoFields(op:VivitoActionOp,args:Record<string,unknown>={}){
  return (REQUIRED[op]||[]).filter(k=>args[k]===undefined||args[k]===null||String(args[k]).trim()==="");
}

export function buildVivitoDryRun(op:VivitoActionOp,args:Record<string,unknown>,role:string){
  const approval=decideVivitoApproval(op,role),missingFields=missingVivitoFields(op,args);
  return{dryRun:true,op,description:VIVITO_ACTION_CATALOG[op]?.description||"Unknown action",approval,missingFields,ready:approval.mode!=="BLOCK"&&missingFields.length===0,willWrite:false};
}
