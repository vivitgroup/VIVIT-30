type LocalPlan={op:string;summary:string;args:Record<string,unknown>;missingFields:string[];risk:"low"|"medium"|"high"|"destructive";requiresConfirmation:true};

const AR=/[\u0600-\u06ff]/;
const ALL_OPS=[
"create_client","update_client","add_client_contact","archive_client","restore_client","delete_client",
"create_task","update_task","reassign_task","archive_task","restore_task","delete_task",
"schedule_post","mark_posted",
"create_lead","update_lead","move_lead","archive_lead",
"log_expense","record_payment","create_invoice","attach_file","remind_me",
"create_user","update_user","set_user_active","create_leave_request","decide_leave","upsert_payroll","set_payroll_status",
"create_contract","update_contract","update_workspace_settings","send_email","send_whatsapp",
"create_api_key","revoke_api_key","create_webhook","revoke_webhook",
"sync_campaign","update_campaign","start_integration","disconnect_integration",
"export_data","generate_report","update_onboarding","record_nps","create_referral","bulk_update_tasks","bulk_remind_clients"
] as const;
type Op=typeof ALL_OPS[number];

const HIGH=new Set<Op>(["archive_client","archive_task","schedule_post","move_lead","archive_lead","record_payment","create_invoice","create_user","update_user","set_user_active","decide_leave","upsert_payroll","set_payroll_status","create_contract","update_contract","update_workspace_settings","send_email","send_whatsapp","create_api_key","create_webhook","update_campaign","start_integration","bulk_update_tasks","bulk_remind_clients"]);
const DESTRUCTIVE=new Set<Op>(["delete_client","delete_task","revoke_api_key","revoke_webhook","disconnect_integration"]);
const LOW=new Set<Op>(["remind_me"]);
const riskFor=(op:Op):LocalPlan["risk"]=>DESTRUCTIVE.has(op)?"destructive":HIGH.has(op)?"high":LOW.has(op)?"low":"medium";

function requestFromPrompt(prompt:string){
 const tagged=prompt.match(/USER REQUEST:\s*([\s\S]*?)(?:\n\n(?:AUTHORIZED|ERP LIVE CONTEXT|TRUSTED|ATTACHMENTS|DIRECTORY)|$)/i);
 if(tagged?.[1])return tagged[1].trim();
 const question=prompt.match(/QUESTION:\s*([\s\S]*?)(?:\n\n|$)/i);
 return (question?.[1]||prompt).trim();
}
function allowedFromSystem(system:string){
 const m=system.match(/Allowed operations(?: for [^:]+)?:\s*([^\n.]+)/i);
 return new Set((m?.[1]||"").split(",").map(x=>x.trim()).filter(Boolean));
}
const clean=(v:string)=>String(v||"").replace(/\s+/g," ").trim();
const esc=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function labeledSegment(input:string,labels:string[]){
 for(const label of labels){
  const re=new RegExp(`(?:^|[;،,\\n])\\s*${esc(label)}\\s*(?::|=|-)\\s*([^;،,\\n]+)`,"i");
  const hit=input.match(re)?.[1]?.trim();
  if(hit)return hit.replace(/^["“']|["”']$/g,"").trim();
 }
 return "";
}
function textValue(input:string,labels:string[]){return labeledSegment(input,labels)}
function numericValue(input:string,labels:string[]){
 const raw=labeledSegment(input,labels);if(!raw)return undefined;
 const nums=[...raw.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m=>m[0]);
 if(nums.length!==1)return undefined;
 const n=Number(nums[0].replace(/,/g,""));return Number.isFinite(n)?n:undefined;
}
function boolValue(input:string,labels:string[]){
 const raw=labeledSegment(input,labels).toLowerCase();if(!raw)return undefined;
 if(/^(true|yes|on|active|enabled|1|نعم|ايوه|أيوه|مفعل|نشط)$/.test(raw))return true;
 if(/^(false|no|off|inactive|disabled|0|لا|لأ|غير مفعل|غير نشط)$/.test(raw))return false;
 return undefined;
}
function listValue(input:string,labels:string[]){
 const raw=labeledSegment(input,labels);if(!raw)return undefined;
 const xs=raw.split(/[|+]/).map(clean).filter(Boolean);return xs.length?xs:undefined;
}
function dateValue(input:string,labels:string[]){
 const raw=labeledSegment(input,labels);if(!raw)return undefined;
 const iso=raw.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];if(iso)return iso;
 const d=new Date();
 if(/^(tomorrow|tmrw|بكره|بكرة)$/i.test(raw)){d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
 if(/^(today|النهارده|اليوم)$/i.test(raw))return d.toISOString().slice(0,10);
 return undefined;
}
function enumValue(input:string,labels:string[],allowed:string[]){
 const raw=labeledSegment(input,labels).toUpperCase().replace(/\s+/g,"_");if(!raw)return undefined;
 return allowed.includes(raw)?raw:undefined;
}
function emailValue(input:string,labels:string[]){
 const raw=labeledSegment(input,labels);return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)?raw:undefined;
}
function detectOp(input:string):Op|""{
 const specific:Array<[Op,RegExp]>=[
  ["create_invoice",/(?:create|generate|انشئ|اعمل).{0,20}(?:invoice|فاتور[هة])/i],
  ["record_payment",/(?:record|log|سجل).{0,20}(?:payment|دفعة|دفع)/i],
  ["log_expense",/(?:log|record|add|سجل|ضيف).{0,20}(?:expense|مصروف)/i],
  ["attach_file",/(?:attach|link|اربط|ارفق).{0,20}(?:file|ملف)/i],
  ["remind_me",/(?:remind me|reminder|فكرني|ذكّرني|ذكرني)/i],
  ["send_whatsapp",/(?:send|ابعت|ارسل|أرسل).{0,20}(?:whatsapp|واتساب)/i],
  ["send_email",/(?:send|ابعت|ارسل|أرسل).{0,20}(?:email|e-mail|ايميل|إيميل)/i],
  ["update_campaign",/(?:update|edit|change|عدل|غيّر).{0,20}(?:campaign|حمل[هة])/i],
  ["sync_campaign",/(?:sync|زامن|مزامن).{0,20}(?:campaign|حمل[هة])/i],
  ["generate_report",/(?:generate|create|open|اعمل|جهز).{0,20}(?:report|تقرير)/i],
  ["export_data",/(?:export|download|تصدير|اكسل|إكسل).{0,20}(?:data|clients|tasks|finance|media|sales|بيانات|عملاء|مهام|مالية|مبيعات)?/i],
  ["update_onboarding",/(?:update|complete|mark|حدّث|كمل).{0,20}(?:onboarding|اونبورد)/i],
  ["record_nps",/(?:record|set|سجل).{0,20}(?:nps|رضا)/i],
  ["create_referral",/(?:create|add|send|انشئ|ضيف).{0,20}(?:referral|احالة|إحالة)/i],
 ];
 for(const [op,re] of specific)if(re.test(input))return op;
 const tests:Array<[Op,RegExp]>=[
 ["bulk_remind_clients",/(?:bulk|all|كل).{0,25}(?:remind|payment reminder|فكّر|ذكر|تحصيل).{0,20}(?:clients|عملاء)/i],
 ["bulk_update_tasks",/(?:bulk|all|كل).{0,25}(?:update|change|عدل|غيّر).{0,20}(?:tasks|تاسكات|مهام)/i],
 ["disconnect_integration",/(?:disconnect|unlink|افصل|الغ[يى] ربط).{0,25}(?:integration|meta|facebook|instagram|google|snap|منص)/i],
 ["start_integration",/(?:connect|start|ربط|اربط).{0,25}(?:integration|meta|facebook|instagram|google|snap|منص)/i],
 ["revoke_webhook",/(?:revoke|disable|delete|الغ[يى]|عطل).{0,20}(?:webhook|ويبهوك)/i],
 ["create_webhook",/(?:create|add|new|انشئ|أضف|ضيف).{0,20}(?:webhook|ويبهوك)/i],
 ["revoke_api_key",/(?:revoke|disable|delete|الغ[يى]|عطل).{0,20}(?:api\s*key|مفتاح)/i],
 ["create_api_key",/(?:create|add|new|انشئ|أضف|ضيف).{0,20}(?:api\s*key|مفتاح)/i],
 ["set_payroll_status",/(?:payroll|راتب|مرتب).{0,25}(?:status|approve|paid|حالة|اعتمد|مدفوع)|(?:approve|mark).{0,15}payroll/i],
 ["upsert_payroll",/(?:create|update|set|سجل|حدّث|حدث|اعمل).{0,20}(?:payroll|salary|راتب|مرتب)/i],
 ["decide_leave",/(?:approve|reject|decide|وافق|ارفض).{0,20}(?:leave|اجاز[هة])/i],
 ["create_leave_request",/(?:create|request|submit|اعمل|قدم).{0,20}(?:leave|اجاز[هة])/i],
 ["set_user_active",/(?:activate|deactivate|enable|disable|فعّل|فعل|عطل).{0,20}(?:user|employee|موظف|مستخدم)/i],
 ["update_user",/(?:update|edit|change|عدل|غيّر).{0,20}(?:user|employee|موظف|مستخدم)/i],
 ["create_user",/(?:create|add|new|انشئ|أضف|ضيف).{0,20}(?:user|employee|موظف|مستخدم)/i],
 ["update_workspace_settings",/(?:update|change|set|عدل|غيّر).{0,25}(?:workspace|settings|brand|إعدادات|اعدادات)/i],
 ["update_contract",/(?:update|edit|change|عدل|غيّر).{0,20}(?:contract|عقد)/i],
 ["create_contract",/(?:create|add|new|انشئ|أضف|اعمل).{0,20}(?:contract|عقد)/i],
 ["mark_posted",/(?:mark|set|خلي|علّم).{0,20}(?:post|event|بوست).{0,15}(?:posted|منشور|اتنشر)/i],
 ["schedule_post",/(?:schedule|جدول|انشئ|اعمل).{0,20}(?:post|بوست|content)/i],
 ["move_lead",/(?:move|advance|نقل|حرك).{0,20}(?:lead|ليد|عميل محتمل)/i],
 ["archive_lead",/(?:archive|أرشف|ارشف).{0,20}(?:lead|ليد|عميل محتمل)/i],
 ["update_lead",/(?:update|edit|change|عدل|غيّر).{0,20}(?:lead|ليد|عميل محتمل)/i],
 ["create_lead",/(?:create|add|new|انشئ|ضيف|سجل).{0,20}(?:lead|ليد|عميل محتمل)/i],
 ["delete_task",/(?:delete|remove permanently|امسح|احذف).{0,20}(?:task|تاسك|مهم[هة])/i],
 ["restore_task",/(?:restore|unarchive|رجع|استرجع).{0,20}(?:task|تاسك|مهم[هة])/i],
 ["archive_task",/(?:archive|أرشف|ارشف).{0,20}(?:task|تاسك|مهم[هة])/i],
 ["reassign_task",/(?:reassign|assign|اسند|عيّن).{0,20}(?:task|تاسك|مهم[هة])|(?:task|تاسك|مهم[هة]).{0,20}(?:reassign|assign|اسند)/i],
 ["update_task",/(?:update|edit|change|عدل|غيّر).{0,20}(?:task|تاسك|مهم[هة])/i],
 ["create_task",/(?:create|add|new|اعمل|انشئ|أنشئ|ضيف).{0,20}(?:task|تاسك|مهم[هة])/i],
 ["delete_client",/(?:delete|remove permanently|امسح|احذف).{0,20}(?:client|عميل)/i],
 ["restore_client",/(?:restore|unarchive|رجع|استرجع).{0,20}(?:client|عميل)/i],
 ["archive_client",/(?:archive|أرشف|ارشف).{0,20}(?:client|عميل)/i],
 ["add_client_contact",/(?:add|create|ضيف|أضف).{0,20}(?:contact|جهة اتصال).{0,20}(?:client|عميل)|(?:client|عميل).{0,20}(?:contact|جهة اتصال)/i],
 ["update_client",/(?:update|edit|change|عدل|غيّر).{0,20}(?:client|عميل)/i],
 ["create_client",/(?:create|add|new|انشئ|أنشئ|ضيف|أضف).{0,20}(?:client|عميل)/i],
 ["record_payment",/(?:record|log|سجل).{0,20}(?:payment|دفعة|دفع)/i],
 ["create_invoice",/(?:create|generate|انشئ|اعمل).{0,20}(?:invoice|فاتور[هة])/i],
 ["log_expense",/(?:log|record|add|سجل|ضيف).{0,20}(?:expense|مصروف)/i],
 ["attach_file",/(?:attach|link|اربط|ارفق).{0,20}(?:file|ملف)/i],
 ["remind_me",/(?:remind me|reminder|فكرني|ذكّرني|ذكرني)/i],
 ["send_whatsapp",/(?:send|ابعت|ارسل|أرسل).{0,20}(?:whatsapp|واتساب)/i],
 ["send_email",/(?:send|ابعت|ارسل|أرسل).{0,20}(?:email|e-mail|ايميل|إيميل)/i],
 ["update_campaign",/(?:update|edit|change|عدل|غيّر).{0,20}(?:campaign|حمل[هة])/i],
 ["sync_campaign",/(?:sync|زامن|مزامن).{0,20}(?:campaign|حمل[هة])/i],
 ["generate_report",/(?:generate|create|open|اعمل|جهز).{0,20}(?:report|تقرير)/i],
 ["export_data",/(?:export|download|تصدير|اكسل|إكسل).{0,20}(?:data|clients|tasks|finance|media|sales|بيانات|عملاء|مهام|مالية|مبيعات)?/i],
 ["update_onboarding",/(?:update|complete|mark|حدّث|كمل).{0,20}(?:onboarding|اونبورد)/i],
 ["record_nps",/(?:record|set|سجل).{0,20}(?:nps|رضا)/i],
 ["create_referral",/(?:create|add|send|انشئ|ضيف).{0,20}(?:referral|احالة|إحالة)/i],
 ];
 for(const [op,re] of tests)if(re.test(input))return op;
 return "";
}
function targetTask(input:string,args:Record<string,unknown>){
 const id=textValue(input,["taskId","task id","task_id"]);if(id)args.taskId=id;
 else {const title=textValue(input,["taskTitle","task title","task","عنوان المهمة","المهمة"]);if(title)args.taskTitle=title;const client=textValue(input,["clientName","client","اسم العميل","العميل"]);if(client)args.clientName=client}
}
function changed(args:Record<string,unknown>,keys:string[]){return keys.some(k=>args[k]!==undefined)}
function planOne(input:string,allowed:Set<string>):LocalPlan|null{
 const op=detectOp(input);if(!op||!allowed.has(op))return null;
 const args:Record<string,unknown>={};let required:string[]=[];
 const client=()=>textValue(input,["clientName","client","client name","اسم العميل","العميل"]);
 const company=()=>textValue(input,["companyName","company","company name","اسم الشركة","الشركة"]);
 const user=()=>textValue(input,["userName","user","employee","staff","الموظف","المستخدم"]);
 switch(op){
  case "create_client":{const v=company()||client();if(v)args.companyName=v;required=["companyName"];break}
  case "update_client":{
   const v=client();if(v)args.clientName=v;
   const fields:[string,string[]][]=[["companyName",["newCompanyName","new company name","new name"]],["industry",["industry","المجال"]],["website",["website","الموقع"]],["internalNotes",["notes","internal notes","ملاحظات"]],["accountManagerName",["account manager","accountManagerName"]],["mediaBuyerName",["media buyer","mediaBuyerName"]]];
   for(const [k,ls] of fields){const x=textValue(input,ls);if(x)args[k]=x}
   for(const [k,ls] of [["monthlyRetainer",["monthly retainer","retainer"]],["mediaBudget",["media budget"]],["contractValue",["contract value"]]] as [string,string[]][]){const x=numericValue(input,ls);if(x!==undefined)args[k]=x}
   required=["clientName"];if(!changed(args,["companyName","industry","website","internalNotes","accountManagerName","mediaBuyerName","monthlyRetainer","mediaBudget","contractValue"]))required.push("change");break}
  case "add_client_contact":{
   const v=client();if(v)args.clientName=v;const name=textValue(input,["contactName","contact name","contact","اسم الشخص","جهة الاتصال"]);if(name)args.contactName=name;
   for(const [k,ls] of [["email",["email","ايميل"]],["phone",["phone","mobile","هاتف"]],["title",["job title","title","المسمى"]]] as [string,string[]][]){const x=textValue(input,ls);if(x)args[k]=x}
   required=["clientName","contactName"];break}
  case "archive_client":case "restore_client":case "delete_client":{const v=client();if(v)args.clientName=v;required=["clientName"];break}
  case "create_task":{
   const c=client();if(c)args.clientName=c;const title=textValue(input,["title","task title","عنوان","اسم المهمة"]);if(title)args.title=title;
   const brief=textValue(input,["brief","description","البريف","الوصف"]);if(brief)args.brief=brief;
   const deadline=dateValue(input,["deadline","due","الموعد","الديدلاين"]);if(deadline)args.deadline=deadline;
   const assignee=textValue(input,["assigneeName","assignee","assign to","المصمم","اسند"]);if(assignee)args.assigneeName=assignee;
   const priority=enumValue(input,["priority","الأولوية"],["LOW","MEDIUM","HIGH","URGENT"]);if(priority)args.priority=priority;
   required=["clientName","title","brief","deadline"];break}
  case "update_task":{
   targetTask(input,args);for(const [k,ls] of [["title",["newTitle","new title"]],["brief",["brief","description"]]] as [string,string[]][]){const x=textValue(input,ls);if(x)args[k]=x}
   const deadline=dateValue(input,["deadline","due"]);if(deadline)args.deadline=deadline;
   const priority=enumValue(input,["priority"],["LOW","MEDIUM","HIGH","URGENT"]);if(priority)args.priority=priority;
   const status=enumValue(input,["status"],["PENDING","IN_PROGRESS","REVIEW","APPROVED","REVISION","COMPLETED","REJECTED"]);if(status)args.status=status;
   if(!args.taskId&&!(args.taskTitle&&args.clientName))required.push("taskTarget");if(!changed(args,["title","brief","deadline","priority","status"]))required.push("change");break}
  case "reassign_task":{targetTask(input,args);const a=textValue(input,["assigneeName","assignee","assign to","creator","المصمم"]);if(a)args.assigneeName=a;if(!args.taskId&&!(args.taskTitle&&args.clientName))required.push("taskTarget");required.push("assigneeName");break}
  case "archive_task":case "restore_task":case "delete_task":{targetTask(input,args);if(!args.taskId&&!(args.taskTitle&&args.clientName))required.push("taskTarget");break}
  case "schedule_post":{
   const c=client();if(c)args.clientName=c;const title=textValue(input,["title","post title","عنوان"]);if(title)args.title=title;
   const date=dateValue(input,["date","schedule date","تاريخ"]);if(date)args.date=date;
   const platform=textValue(input,["platform","المنصة"]);if(platform)args.platform=platform;
   const file=textValue(input,["fileId","file id","ملف"]);if(file)args.fileId=file;const caption=textValue(input,["caption","الكابشن"]);if(caption)args.caption=caption;
   required=["clientName","title","date","platform","fileId"];break}
  case "mark_posted":{const id=textValue(input,["eventId","postId","event id","post id"]);if(id)args.eventId=id;required=["eventId"];break}
  case "create_lead":{
   const c=company();if(c)args.companyName=c;const contact=textValue(input,["contactPerson","contact","جهة الاتصال"]);if(contact)args.contactPerson=contact;
   const value=numericValue(input,["estimatedValue","estimated value","value","القيمة"]);if(value!==undefined)args.estimatedValue=value;required=["companyName","contactPerson","estimatedValue"];break}
  case "update_lead":{
   const id=textValue(input,["leadId","lead id"]);if(id)args.leadId=id;const c=company();if(c)args.companyName=c;
   for(const [k,ls] of [["contactPerson",["contactPerson","contact"]],["phone",["phone"]],["email",["email"]],["notes",["notes"]],["industry",["industry"]]] as [string,string[]][]){const x=textValue(input,ls);if(x)args[k]=x}
   const value=numericValue(input,["estimatedValue","value"]);if(value!==undefined)args.estimatedValue=value;
   if(!args.leadId&&!args.companyName)required.push("leadTarget");if(!changed(args,["contactPerson","phone","email","notes","industry","estimatedValue"]))required.push("change");break}
  case "move_lead":{const id=textValue(input,["leadId","lead id"]);if(id)args.leadId=id;const c=company();if(c)args.companyName=c;const stage=enumValue(input,["stage","to stage"],["CONTACTED","QUALIFIED","PROPOSAL_SENT","NEGOTIATION","WON","LOST"]);if(stage)args.stage=stage;if(!args.leadId&&!args.companyName)required.push("leadTarget");required.push("stage");break}
  case "archive_lead":{const id=textValue(input,["leadId","lead id"]);if(id)args.leadId=id;const c=company();if(c)args.companyName=c;if(!args.leadId&&!args.companyName)required.push("leadTarget");break}
  case "log_expense":{const a=numericValue(input,["amount","المبلغ"]);if(a!==undefined)args.amount=a;const cat=textValue(input,["category","التصنيف"]);if(cat)args.category=cat;const d=textValue(input,["description","details","الوصف"]);if(d)args.description=d;required=["amount","description"];break}
  case "record_payment":{const c=client();if(c)args.clientName=c;const a=numericValue(input,["amount","payment amount","المبلغ"]);if(a!==undefined)args.amount=a;const method=textValue(input,["method","payment method","طريقة الدفع"]);if(method)args.method=method;required=["clientName","amount"];break}
  case "create_invoice":{const c=client();if(c)args.clientName=c;for(const [k,ls] of [["month",["month","الشهر"]],["year",["year","السنة"]],["retainer",["retainer","amount","المبلغ"]]] as [string,string[]][]){const x=numericValue(input,ls);if(x!==undefined)args[k]=x}required=["clientName","month","year","retainer"];break}
  case "attach_file":{const c=client();if(c)args.clientName=c;const f=textValue(input,["fileId","file id","ملف"]);if(f)args.fileId=f;const t=textValue(input,["taskId","task id"]);if(t)args.taskId=t;required=["clientName","fileId"];break}
  case "remind_me":{const title=textValue(input,["title","reminder","remind me","فكرني","ذكرني"]);if(title)args.title=title;const due=dateValue(input,["dueAt","due","date","الموعد"]);if(due)args.dueAt=due;required=["title"];break}
  case "create_user":{const name=textValue(input,["name","user name","employee name","الاسم"]);if(name)args.name=name;const email=emailValue(input,["email","ايميل"]);if(email)args.email=email;const role=textValue(input,["role","الدور"]);if(role)args.role=role.toUpperCase();required=["name","email","role"];break}
  case "update_user":{const u=user();if(u)args.userName=u;for(const [k,ls] of [["name",["newName","new name"]],["phone",["phone"]],["role",["role"]]] as [string,string[]][]){const x=textValue(input,ls);if(x)args[k]=x}required=["userName"];if(!changed(args,["name","phone","role"]))required.push("change");break}
  case "set_user_active":{const u=user();if(u)args.userName=u;const active=boolValue(input,["active","enabled","status"]);if(active!==undefined)args.active=active;required=["userName","active"];break}
  case "create_leave_request":{const u=user();if(u)args.userName=u;const from=dateValue(input,["fromDate","from","من"]);if(from)args.fromDate=from;const to=dateValue(input,["toDate","to","إلى"]);if(to)args.toDate=to;const type=textValue(input,["type","نوع"]);if(type)args.type=type;const reason=textValue(input,["reason","سبب"]);if(reason)args.reason=reason;required=["fromDate","toDate","type"];break}
  case "decide_leave":{const id=textValue(input,["leaveId","leave id"]);if(id)args.leaveId=id;const d=enumValue(input,["decision","status"],["APPROVED","REJECTED"]);if(d)args.decision=d;required=["leaveId","decision"];break}
  case "upsert_payroll":case "set_payroll_status":{
   const u=user();if(u)args.userName=u;for(const [k,ls] of [["month",["month"]],["year",["year"]],["baseSalary",["baseSalary","base salary"]],["bonus",["bonus"]],["deductions",["deductions"]]] as [string,string[]][]){const x=numericValue(input,ls);if(x!==undefined)args[k]=x}
   const notes=textValue(input,["notes"]);if(notes)args.notes=notes;required=["userName","month","year"];if(op==="upsert_payroll")required.push("baseSalary");else {const s=enumValue(input,["status"],["DRAFT","APPROVED","PAID"]);if(s)args.status=s;required.push("status")}break}
  case "create_contract":{
   const c=client();if(c)args.clientName=c;const title=textValue(input,["title","contract title"]);if(title)args.title=title;const value=numericValue(input,["value","contract value"]);if(value!==undefined)args.value=value;const start=dateValue(input,["startDate","start date"]);if(start)args.startDate=start;const end=dateValue(input,["endDate","end date"]);if(end)args.endDate=end;required=["clientName","title","value","startDate","endDate"];break}
  case "update_contract":{
   const c=client();if(c)args.clientName=c;const id=textValue(input,["contractId","contract id"]);if(id)args.contractId=id;const status=enumValue(input,["status"],["ACTIVE","EXPIRED","RENEWED","CANCELLED"]);if(status)args.status=status;const value=numericValue(input,["value"]);if(value!==undefined)args.value=value;const end=dateValue(input,["endDate","end date"]);if(end)args.endDate=end;const notes=textValue(input,["notes"]);if(notes)args.notes=notes;required=["clientName","contractId"];if(!changed(args,["status","value","endDate","notes"]))required.push("change");break}
  case "update_workspace_settings":{
   const textFields:[string,string[]][]=[["name",["name","workspace name"]],["primaryColor",["primaryColor","primary color"]],["logoUrl",["logoUrl","logo url"]],["faviconUrl",["faviconUrl","favicon url"]],["customDomain",["customDomain","custom domain"]],["currency",["currency"]],["timezone",["timezone"]],["billingEmail",["billingEmail","billing email"]]];
   for(const [k,ls] of textFields){const x=textValue(input,ls);if(x)args[k]=x}const fee=numericValue(input,["agencyFeePercent","agency fee percent"]);if(fee!==undefined)args.agencyFeePercent=fee;if(!Object.keys(args).length)required.push("change");break}
  case "send_email":{const to=emailValue(input,["to","email"]);if(to)args.to=to;const subject=textValue(input,["subject","عنوان"]);if(subject)args.subject=subject;const body=textValue(input,["body","message","رسالة"]);if(body)args.body=body;required=["to","subject","body"];break}
  case "send_whatsapp":{const to=textValue(input,["to","phone","number","رقم"]);if(to)args.to=to;const body=textValue(input,["body","message","رسالة"]);if(body)args.body=body;const c=client();if(c)args.clientName=c;required=["to","body"];break}
  case "create_api_key":{const name=textValue(input,["name","key name"]);if(name)args.name=name;const perm=enumValue(input,["permissions","permission"],["READ","WRITE","ADMIN"]);if(perm)args.permissions=perm.toLowerCase();break}
  case "revoke_api_key":{const id=textValue(input,["apiKeyId","api key id"]);if(id)args.apiKeyId=id;required=["apiKeyId"];break}
  case "create_webhook":{const url=textValue(input,["url","webhook url"]);if(url)args.url=url;const events=listValue(input,["events"]);if(events)args.events=events;required=["url","events"];break}
  case "revoke_webhook":{const id=textValue(input,["webhookId","webhook id"]);if(id)args.webhookId=id;required=["webhookId"];break}
  case "sync_campaign":{const id=textValue(input,["campaignId","campaign id"]);const name=textValue(input,["campaignName","campaign","campaign name","الحملة"]);if(id)args.campaignId=id;else if(name)args.campaignName=name;if(!id&&!name)required.push("campaignTarget");break}
  case "update_campaign":{
   const id=textValue(input,["campaignId","campaign id"]);const name=textValue(input,["campaignName","campaign","campaign name"]);if(id)args.campaignId=id;else if(name)args.campaignName=name;
   const status=textValue(input,["status"]);if(status)args.status=status.toUpperCase();for(const [k,ls] of [["dailyBudget",["dailyBudget","daily budget"]],["lifetimeBudget",["lifetimeBudget","lifetime budget"]],["targetCpl",["targetCpl","target cpl"]],["targetCpa",["targetCpa","target cpa"]],["targetRoas",["targetRoas","target roas"]]] as [string,string[]][]){const x=numericValue(input,ls);if(x!==undefined)args[k]=x}
   if(!id&&!name)required.push("campaignTarget");if(!changed(args,["status","dailyBudget","lifetimeBudget","targetCpl","targetCpa","targetRoas"]))required.push("change");break}
  case "start_integration":{const p=textValue(input,["platform","المنصة"]);if(p)args.platform=p;required=["platform"];break}
  case "disconnect_integration":{const p=textValue(input,["platform","المنصة"]);if(p)args.platform=p;const c=client();if(c)args.clientName=c;required=["platform","clientName"];break}
  case "export_data":{const e=enumValue(input,["entity","data","نوع البيانات"],["CLIENTS","TASKS","FINANCE","MEDIA","SALES"]);if(e)args.entity=e.toLowerCase();required=["entity"];break}
  case "generate_report":{const c=client();if(c)args.clientName=c;const period=textValue(input,["period","الفترة"]);if(period)args.period=period;break}
  case "update_onboarding":{const c=client();if(c)args.clientName=c;const step=textValue(input,["stepId","step id","step"]);if(step)args.stepId=step;const done=boolValue(input,["completed","done"]);if(done!==undefined)args.completed=done;required=["clientName","stepId","completed"];break}
  case "record_nps":{const c=client();if(c)args.clientName=c;const score=numericValue(input,["score","nps"]);if(score!==undefined)args.score=score;const comment=textValue(input,["comment","ملاحظة"]);if(comment)args.comment=comment;required=["clientName","score"];break}
  case "create_referral":{const e=emailValue(input,["email","referred email"]);if(e)args.email=e;const d=numericValue(input,["discountPct","discount"]);if(d!==undefined)args.discountPct=d;required=["email"];break}
  case "bulk_update_tasks":{const status=enumValue(input,["status"],["PENDING","IN_PROGRESS","REVIEW","APPROVED","REVISION","COMPLETED","REJECTED"]);if(status)args.status=status;const priority=enumValue(input,["priority"],["LOW","MEDIUM","HIGH","URGENT"]);if(priority)args.priority=priority;const c=client();if(c)args.clientName=c;const overdue=boolValue(input,["overdue"]);if(overdue!==undefined)args.overdue=overdue;if(!args.status&&!args.priority)required.push("change");break}
  case "bulk_remind_clients":{const min=numericValue(input,["minimumOutstanding","minimum outstanding"]);if(min!==undefined)args.minimumOutstanding=min;break}
 }
 const missingFields=[...new Set(required.filter(k=>k==="taskTarget"?!(args.taskId||(args.taskTitle&&args.clientName)):k==="leadTarget"?!(args.leadId||args.companyName):k==="campaignTarget"?!(args.campaignId||args.campaignName):k==="change"?false:args[k]===undefined||args[k]===null||String(args[k]).trim()===""))];
 if(required.includes("change")&&!missingFields.includes("change"))missingFields.push("change");
 const arabic=AR.test(input),summary=arabic?`VIVITO جهّز أمر ${op.replaceAll("_"," ")} للمراجعة.`:`VIVITO prepared ${op.replaceAll("_"," ")} for review.`;
 return {op,summary,args,missingFields,risk:riskFor(op),requiresConfirmation:true};
}
export function generateLocalActionPlanV2(prompt:string,system:string):{text:string;modelId:string}|null{
 if(!/VIVITO Action Planner/i.test(system))return null;
 const allowed=allowedFromSystem(system);if(!allowed.size)return null;
 const plan=planOne(requestFromPrompt(prompt),allowed);if(!plan)return null;
 return {text:JSON.stringify(plan),modelId:"vivito-local-action-v2"};
}
export const VIVITO_LOCAL_V2_OPS=ALL_OPS;
