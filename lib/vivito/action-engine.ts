export type VivitoActionRisk="low"|"medium"|"high"|"destructive";
export type VivitoActionOp=
 |"create_client"|"archive_client"|"restore_client"|"delete_client"
 |"create_task"|"archive_task"|"restore_task"|"delete_task"
 |"log_expense"|"record_payment"|"create_invoice"
 |"attach_file"|"remind_me";

export type VivitoActionProposal={
 op:VivitoActionOp;
 summary:string;
 args:Record<string,unknown>;
 risk:VivitoActionRisk;
 requiresConfirmation:true;
 missingFields:string[];
};

export const VIVITO_ACTION_CATALOG:Record<VivitoActionOp,{roles:string[];risk:VivitoActionRisk;description:string}>={
 create_client:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"],risk:"medium",description:"Create a real client record."},
 archive_client:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER"],risk:"high",description:"Archive/deactivate a client without deleting history."},
 restore_client:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER"],risk:"medium",description:"Restore an archived client."},
 delete_client:{roles:["SUPER_ADMIN"],risk:"destructive",description:"Permanently delete an already archived client only when no linked records exist."},
 create_task:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER"],risk:"medium",description:"Create and optionally assign a creative task for a client."},
 archive_task:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER"],risk:"high",description:"Archive a task."},
 restore_task:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER"],risk:"medium",description:"Restore an archived task."},
 delete_task:{roles:["SUPER_ADMIN"],risk:"destructive",description:"Permanently delete an archived task only when no linked records exist."},
 log_expense:{roles:["SUPER_ADMIN","ACCOUNTANT"],risk:"medium",description:"Log a company expense and finance-ledger entry."},
 record_payment:{roles:["SUPER_ADMIN","ACCOUNTANT"],risk:"high",description:"Record a real client payment against outstanding invoices."},
 create_invoice:{roles:["SUPER_ADMIN","ACCOUNTANT"],risk:"high",description:"Create an invoice for a client and period."},
 attach_file:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","CLIENT"],risk:"medium",description:"Link an uploaded file to an authorized client/task."},
 remind_me:{roles:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"],risk:"low",description:"Create an in-system reminder notification."},
};

const ACTION_RE=/(ضيف|اضف|أضف|اعمل|أنشئ|انشئ|سجل|سجّل|احذف|امسح|ارش[فف]|أرشف|رجع|استرجع|عيّن|عين|خلي|اربط|ارفع|حط|دفع|دفعت|دفعة|مصروف|فاتور[هة]|ذكّر|فكرني|create|add|assign|delete|remove|archive|restore|record|log|attach|upload|invoice|paid|payment|expense|remind)/i;
export function likelyVivitoActionIntent(question:string,attachmentCount=0){return attachmentCount>0||ACTION_RE.test(question)}

export function allowedVivitoOps(role:string){return (Object.keys(VIVITO_ACTION_CATALOG) as VivitoActionOp[]).filter(op=>VIVITO_ACTION_CATALOG[op].roles.includes(role))}

export function buildVivitoActionPlannerSystem(role:string){
 const allowed=allowedVivitoOps(role);
 return `You are VIVITO Action Planner for VIVIT ERP. Convert an explicit user request to ONE safe structured ERP action.
Return ONLY valid JSON, no markdown, with this exact shape:
{"op":"...","summary":"...","args":{},"risk":"low|medium|high|destructive","requiresConfirmation":true,"missingFields":[]}
Allowed operations for role ${role}: ${allowed.join(", ")}.
Never invent IDs. Prefer natural names in args (clientName, assigneeName) unless an attachment fileId is explicitly supplied by trusted UI metadata.
Never guess an ambiguous person/client. If a required value is absent, put its field name in missingFields and keep it absent from args.
For create_task require clientName, title, brief, deadline; assigneeName is optional. type defaults GRAPHIC and priority defaults MEDIUM.
For create_client require companyName only; preserve optional industry, website, monthlyRetainer, mediaBudget, contractValue, contractStart, contractEnd, accountManagerName, mediaBuyerName, contactName, contactEmail, contactPhone.
For log_expense require amount, description; category should be one of Salaries, Freelancers, Tools, Office, Production, Advertising, Travel, Other. If unclear, use Other.
For record_payment require clientName and amount; method may be bank, cash, stripe, paymob, paytabs and defaults bank. Never claim payment is executed in the planner.
For create_invoice require clientName, month, year, retainer. adSpend and extraServices default 0.
For archive/restore/delete client require clientName. For archive/restore/delete task require either taskId or a taskTitle plus clientName.
For attach_file require clientName and fileId from ATTACHMENTS metadata; category defaults CREATIVE. If user says task, include taskTitle when known.
For remind_me require title/message; link defaults /dashboard/today.
Deletion is always destructive. Archiving/payment/invoice are high risk. Creation/attachment/expense are medium except reminder low.
The summary must be concise and in the user's language. Do not execute anything and do not claim success.`;
}

function stripFence(raw:string){const t=raw.trim();if(t.startsWith("```")){return t.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}return t}
export function parseVivitoActionProposal(raw:string,role:string):VivitoActionProposal|null{
 try{
  const parsed=JSON.parse(stripFence(raw));
  const op=String(parsed?.op||"") as VivitoActionOp;
  const meta=VIVITO_ACTION_CATALOG[op];
  if(!meta||!meta.roles.includes(role))return null;
  const missingFields=Array.isArray(parsed.missingFields)?parsed.missingFields.map((x:any)=>String(x).slice(0,80)).slice(0,12):[];
  const args=parsed.args&&typeof parsed.args==="object"&&!Array.isArray(parsed.args)?parsed.args:{};
  return{op,summary:String(parsed.summary||meta.description).trim().slice(0,500),args,risk:meta.risk,requiresConfirmation:true,missingFields};
 }catch{return null}
}
