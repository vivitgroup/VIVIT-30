type ActionPlan={op?:string;summary?:string;args?:Record<string,unknown>;missingFields?:unknown[];risk?:string;requiresConfirmation?:boolean};

const clean=(value:string)=>String(value||"").replace(/^[\s"“”'`]+|[\s"“”'`.,،;]+$/g,"").replace(/\s+/g," ").trim();
const esc=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const stripFence=(raw:string)=>{const text=raw.trim();return text.startsWith("```")?text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim():text};
function requestFromPrompt(prompt:string){const tagged=prompt.match(/USER REQUEST:\s*([\s\S]*?)(?:\n\n(?:AUTHORIZED|ERP LIVE CONTEXT|TRUSTED|ATTACHMENTS|DIRECTORY)|$)/i);if(tagged?.[1])return tagged[1].trim();const question=prompt.match(/QUESTION:\s*([\s\S]*?)(?:\n\n|$)/i);return (question?.[1]||prompt).trim()}
function first(input:string,patterns:RegExp[]){for(const pattern of patterns){const value=clean(input.match(pattern)?.[1]||"");if(value)return value}return ""}
const STOP="(?:with|and|for|brief|description|deadline|due|by|industry|website|email|phone|mobile|retainer|budget|contact|title|priority|status|platform|date|amount|value|month|year|بريف|وصف|الوصف|موعد|الموعد|الديدلاين|المجال|الصناعة|الموقع|الايميل|الإيميل|الهاتف|الموبايل|الميزانية|المبلغ|التاريخ|المنصة|الأولوية|الحالة)";
function afterLabel(input:string,labels:string[]){for(const label of labels){const pattern=new RegExp(`(?:^|[\\s;,،])${esc(label)}\\s*(?::|=|-)?\\s*(?:named\\s+|called\\s+|باسم\\s+|اسمه\\s+|اسمها\\s+)?[\"“']?(.+?)[\"”']?(?=\\s+${STOP}\\b|[;,،\\n]|$)`,`i`),value=clean(input.match(pattern)?.[1]||"");if(value&&value.toLowerCase()!==label.toLowerCase())return value}return ""}
function naturalCreatedClient(input:string){return first(input,[
 /(?:create|add)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:client|customer|account)\s+(?:named\s+|called\s+)?["“']?(.+?)["”']?(?=\s+(?:with|and)\b|[;,،\n]|$)/i,
 /(?:new\s+client)\s+(?:named\s+|called\s+)?["“']?(.+?)["”']?(?=\s+(?:with|and)\b|[;,،\n]|$)/i,
 /(?:ضيف|أضف|اضف|انشئ|أنشئ|اعمل)\s+(?:عميل|شركة)\s+(?:جديد(?:ة)?\s+)?(?:باسم\s+|اسمه\s+|اسمها\s+)?["“']?(.+?)["”']?(?=\s+(?:و|مع)\s+|[;,،\n]|$)/i
])}
function naturalClient(input:string){return afterLabel(input,["client name","clientName","client","customer","account","اسم العميل","العميل","للعميل","لعميل"])}
function naturalCompany(input:string){return afterLabel(input,["company name","companyName","company","اسم الشركة","الشركة"])}
function naturalTaskTitle(input:string){return first(input,[
 /(?:create|add)\s+(?:a\s+)?(?:new\s+)?task\s+(?:named\s+|called\s+)?["“']?(.+?)["”']?(?=\s+(?:for\s+client|client|brief|description|deadline|due|by|with)\b|[;,،\n]|$)/i,
 /(?:اعمل|ضيف|أضف|اضف|انشئ|أنشئ)\s+(?:تاسك|مهم[هة])\s+["“']?(.+?)["”']?(?=\s+(?:للعميل|لعميل|عميل|بريف|وصف|الموعد|موعد|الديدلاين)\b|[;,،\n]|$)/i
])||afterLabel(input,["task title","title","عنوان المهمة","العنوان"])}
function naturalTaskClient(input:string){return first(input,[/for\s+(?:the\s+)?client\s+["“']?(.+?)["”']?(?=\s+(?:brief|description|deadline|due|by|with)\b|[;,،\n]|$)/i,/(?:للعميل|لعميل)\s+["“']?(.+?)["”']?(?=\s+(?:بريف|وصف|الموعد|موعد|الديدلاين)\b|[;,،\n]|$)/i])||naturalClient(input)}
function naturalLead(input:string){return afterLabel(input,["lead company","lead","ليد","عميل محتمل"])}
function naturalUser(input:string){return afterLabel(input,["user name","user","employee","staff","employee name","الموظف","المستخدم"])}
function naturalCampaign(input:string){return afterLabel(input,["campaign name","campaign","الحملة"])}
function textField(input:string,field:string){const labels:Record<string,string[]>={brief:["brief","description","البريف","الوصف"],contactPerson:["contact person","contactPerson","contact","اسم الشخص","جهة الاتصال"],contactName:["contact name","contactName","contact","اسم الشخص","جهة الاتصال"],assigneeName:["assignee","assigneeName","assign to","creator","المصمم","اسند"],subject:["subject","عنوان"],body:["body","message","رسالة"],platform:["platform","المنصة"],industry:["industry","المجال"],website:["website","الموقع"],role:["role","الدور"],status:["status","الحالة"],eventId:["event id","eventId","post id","postId"],fileId:["file id","fileId","ملف"],contractId:["contract id","contractId"],stepId:["step id","stepId","step"],apiKeyId:["api key id","apiKeyId"],webhookId:["webhook id","webhookId"]};return afterLabel(input,labels[field]||[field])}
function numberField(input:string,field:string){const labels:Record<string,string[]>={amount:["payment amount","amount","المبلغ"],month:["month","الشهر"],year:["year","السنة"],retainer:["retainer","monthly retainer","المبلغ"],value:["contract value","value","القيمة"],baseSalary:["base salary","baseSalary","salary","الراتب"],bonus:["bonus","مكافأة"],deductions:["deductions","خصومات"],score:["score","nps"],minimumOutstanding:["minimum outstanding","minimumOutstanding"]};for(const label of labels[field]||[field]){const re=new RegExp(`(?:^|[\\s;,،])${esc(label)}\\s*(?::|=|-)?\\s*(-?\\d+(?:[.,]\\d+)?)`,`i`),hit=input.match(re)?.[1];if(hit){const n=Number(hit.replace(/,/g,""));if(Number.isFinite(n))return n}}if(field==="amount"){const hit=input.match(/(?:payment|pay|دفعة|دفع)\s+(?:of\s+)?(\d+(?:[.,]\d+)?)/i)?.[1];if(hit){const n=Number(hit.replace(/,/g,""));if(Number.isFinite(n))return n}}return undefined}
function emailField(input:string){return input.match(/\b[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+\b/)?.[0]||""}
function dateField(input:string,field:string){const labels=field==="deadline"?["deadline","due","by","الموعد","الديدلاين"]:[field,"date","تاريخ","التاريخ"];for(const label of labels){const re=new RegExp(`${esc(label)}\\s*(?::|=|-)?\\s*(20\\d{2}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,3})?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?|tomorrow|today|بكره|بكرة|النهارده|اليوم)`,`i`),raw=input.match(re)?.[1];if(raw){if(/^(tomorrow|بكره|بكرة)$/i.test(raw)){const d=new Date();d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}if(/^(today|النهارده|اليوم)$/i.test(raw))return new Date().toISOString().slice(0,10);return raw}}return ""}
function boolField(input:string,field:string){const value=afterLabel(input,[field,"completed","done","active","enabled"]).toLowerCase();if(/^(true|yes|on|active|enabled|1|نعم|ايوه|أيوه|مفعل|نشط)$/.test(value))return true;if(/^(false|no|off|inactive|disabled|0|لا|لأ|غير مفعل|غير نشط)$/.test(value))return false;return undefined}
function fill(plan:ActionPlan,input:string){const op=String(plan.op||""),args={...(plan.args||{})};
 const set=(key:string,value:unknown)=>{if((args[key]===undefined||args[key]===null||String(args[key]).trim()==="")&&value!==undefined&&value!==null&&String(value).trim()!=="")args[key]=value};
 if(op==="create_client")set("companyName",naturalCreatedClient(input)||naturalCompany(input)||naturalClient(input));
 if(["update_client","add_client_contact","archive_client","restore_client","delete_client","record_payment","create_invoice","create_contract","update_contract","disconnect_integration","generate_report","update_onboarding","record_nps"].includes(op))set("clientName",naturalClient(input));
 if(["create_task","schedule_post","bulk_update_tasks"].includes(op))set("clientName",naturalTaskClient(input));
 if(op==="create_task"){set("title",naturalTaskTitle(input));set("brief",textField(input,"brief"));set("deadline",dateField(input,"deadline"));set("assigneeName",textField(input,"assigneeName"))}
 if(["update_task","reassign_task","archive_task","restore_task","delete_task"].includes(op)){set("taskTitle",afterLabel(input,["task title","task","عنوان المهمة","المهمة"]));set("clientName",naturalTaskClient(input));if(op==="reassign_task")set("assigneeName",textField(input,"assigneeName"))}
 if(op==="schedule_post"){set("title",afterLabel(input,["post title","title","العنوان"]));set("date",dateField(input,"date"));set("platform",textField(input,"platform"));set("fileId",textField(input,"fileId"))}
 if(op==="mark_posted")set("eventId",textField(input,"eventId"));
 if(op==="create_lead"){set("companyName",naturalLead(input)||naturalCompany(input));set("contactPerson",textField(input,"contactPerson"))}
 if(["update_lead","move_lead","archive_lead"].includes(op)){set("leadCompanyName",naturalLead(input)||naturalCompany(input));set("companyName",naturalLead(input)||naturalCompany(input))}
 if(op==="create_user"){set("name",naturalUser(input));set("email",emailField(input));set("role",textField(input,"role").toUpperCase())}
 if(["update_user","set_user_active","upsert_payroll","set_payroll_status"].includes(op))set("userName",naturalUser(input));
 if(["sync_campaign","update_campaign"].includes(op))set("campaignName",naturalCampaign(input));
 for(const key of ["brief","contactName","contactPerson","subject","body","platform","industry","website","status","fileId","contractId","stepId","apiKeyId","webhookId"]){if(args[key]===undefined)set(key,textField(input,key))}
 for(const key of ["amount","month","year","retainer","value","baseSalary","bonus","deductions","score","minimumOutstanding"]){if(args[key]===undefined){const value=numberField(input,key);if(value!==undefined)set(key,value)}}
 if(args.deadline===undefined){const value=dateField(input,"deadline");if(value)set("deadline",value)}
 if(args.date===undefined){const value=dateField(input,"date");if(value)set("date",value)}
 if(op==="set_user_active"&&args.active===undefined){const value=boolField(input,"active");if(value!==undefined)set("active",value)}
 if(op==="update_onboarding"&&args.completed===undefined){const value=boolField(input,"completed");if(value!==undefined)set("completed",value)}
 return args}
function resolved(field:string,args:Record<string,unknown>){if(field==="taskTarget")return Boolean(args.taskId||(args.taskTitle&&args.clientName));if(field==="leadTarget")return Boolean(args.leadId||args.leadCompanyName||args.companyName);if(field==="campaignTarget")return Boolean(args.campaignId||args.campaignName);if(field==="change")return false;if(field==="scheduled reminder unsupported")return false;const value=args[field];return value!==undefined&&value!==null&&String(value).trim()!==""}

export function repairVivitoActionPlan(prompt:string,system:string,raw:string){
 if(!/VIVITO Action Planner/i.test(system))return raw;
 let plan:ActionPlan;try{plan=JSON.parse(stripFence(raw)) as ActionPlan}catch{return raw}
 if(!plan||!plan.op||plan.op==="none")return raw;
 const args=fill(plan,requestFromPrompt(prompt)),missing=(Array.isArray(plan.missingFields)?plan.missingFields:[]).map(String).filter(field=>!resolved(field,args));
 return JSON.stringify({...plan,args,missingFields:[...new Set(missing)],requiresConfirmation:true});
}
