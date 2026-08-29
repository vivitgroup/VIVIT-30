import type {VivitoActionOp} from "./action-engine";
export type VivitoRollbackProposal={available:boolean;reason:string;inverse?:{op:VivitoActionOp;args:Record<string,unknown>}};
const NON_REVERSIBLE=new Set<VivitoActionOp>(["record_payment","create_invoice","log_expense","send_email","send_whatsapp","create_user","upsert_payroll","set_payroll_status","create_api_key","create_webhook","update_campaign","sync_campaign","start_integration","disconnect_integration","bulk_update_tasks","bulk_remind_clients"]);
export function proposeVivitoRollback(op:VivitoActionOp,result:unknown):VivitoRollbackProposal{
 const record=result&&typeof result==="object"&&!Array.isArray(result)?result as Record<string,unknown>:{};
 const id=String(record.entityId||"").trim();
 if(NON_REVERSIBLE.has(op))return{available:false,reason:"This action is not automatically reversible. Use an explicit compensating business action with a new confirmation."};
 if(!id)return{available:false,reason:"No stable entity identifier was recorded for a safe inverse action."};
 switch(op){
  case"archive_client":return{available:true,reason:"Archived client can be restored.",inverse:{op:"restore_client",args:{clientName:id}}};
  case"restore_client":return{available:true,reason:"Restored client can be archived again.",inverse:{op:"archive_client",args:{clientName:id}}};
  case"archive_task":return{available:true,reason:"Archived task can be restored.",inverse:{op:"restore_task",args:{taskId:id}}};
  case"restore_task":return{available:true,reason:"Restored task can be archived again.",inverse:{op:"archive_task",args:{taskId:id}}};
  default:return{available:false,reason:"No audited inverse operation is defined for this action."};
 }
}
