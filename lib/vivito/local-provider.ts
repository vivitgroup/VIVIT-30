type LocalPlan={op:string;summary:string;args:Record<string,unknown>;missingFields:string[]};

const AR=/[\u0600-\u06ff]/;
const clean=(v:string)=>String(v||"").replace(/\s+/g," ").trim();
const esc=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const isoDate=(date:Date)=>date.toISOString().slice(0,10);

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
function valueAfter(input:string,labels:string[]){
  const boundaries=["client","company","title","brief","deadline","priority","assignee","assign","type","amount","category","contact","value","date","platform","اسم العميل","العميل","عنوان","العنوان","اسمها","اسمه","البريف","الديدلاين","الموعد","الأولوية","الاولوية","اسند","نوع","المبلغ","القيمة","جهة الاتصال","المنصة"];
  for(const label of labels){
    const re=new RegExp(`(?:^|[\\s,،;])${esc(label)}\\s*(?::|=|-)?\\s*["“']?(.+?)["”']?(?=\\s+(?:${boundaries.map(esc).join("|")})\\b|[,،;]|$)`,`i`);
    const hit=input.match(re)?.[1]?.trim();if(hit)return hit;
  }
  return "";
}
function numberFrom(input:string,labels:string[]){const raw=valueAfter(input,labels);const direct=raw.match(/\d+(?:[.,]\d+)?/)?.[0]||input.match(/\b\d+(?:[.,]\d+)?\b/)?.[0];return direct?Number(direct.replace(",","")):undefined}
function deadlineFrom(input:string){
  const explicit=input.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];if(explicit)return explicit;
  if(/\b(tomorrow|tmrw)\b|بكره|بكرة/i.test(input)){const d=new Date();d.setUTCDate(d.getUTCDate()+1);return isoDate(d)}
  if(/\btoday\b|النهارده|اليوم/i.test(input))return isoDate(new Date());
  return valueAfter(input,["deadline","due","الديدلاين","الموعد"]);
}
function detectOp(input:string){
  const q=input.toLowerCase();
  if(/(?:create|add|new|اعمل|انشئ|أنشئ|ضيف|اضف|أضف).{0,20}(?:task|تاسك|مهم[هة])|(?:task|تاسك|مهم[هة]).{0,20}(?:create|add|اعمل|ضيف|انشئ)/i.test(input))return "create_task";
  if(/(?:create|add|new|ضيف|اضف|أضف|انشئ|أنشئ).{0,20}(?:client|عميل)|(?:client|عميل).{0,20}(?:create|add|ضيف|انشئ)/i.test(input))return "create_client";
  if(/(?:create|add|new|ضيف|انشئ|سجل).{0,20}(?:lead|ليد|عميل محتمل)/i.test(input))return "create_lead";
  if(/(?:log|record|سجل|سجّل|ضيف).{0,20}(?:expense|مصروف)|(?:expense|مصروف).{0,20}(?:log|record|سجل|ضيف)/i.test(input))return "log_expense";
  if(/(?:record|سجل|سجّل).{0,20}(?:payment|دفعة|دفع)/i.test(input))return "record_payment";
  if(/(?:create|generate|اعمل|انشئ|أنشئ).{0,20}(?:invoice|فاتور[هة])/i.test(input))return "create_invoice";
  if(/(?:remind|reminder|فكرني|ذكّرني|ذكرني)/i.test(input))return "remind_me";
  if(/(?:archive|أرشف|ارشف).{0,20}(?:task|تاسك|مهم[هة])/i.test(input))return "archive_task";
  if(/(?:archive|أرشف|ارشف).{0,20}(?:client|عميل)/i.test(input))return "archive_client";
  if(/(?:send|ابعت|ارسل|أرسل).{0,20}(?:whatsapp|واتساب)/i.test(input))return "send_whatsapp";
  if(/(?:send|ابعت|ارسل|أرسل).{0,20}(?:email|e-mail|ايميل|إيميل)/i.test(input))return "send_email";
  if(/(?:sync|زامن|مزامن).{0,20}(?:campaign|حمل[هة])/i.test(input))return "sync_campaign";
  if(/(?:connect|ربط|اربط).{0,20}(?:meta|facebook|instagram|google|snap|platform|منص)/i.test(input))return "start_integration";
  if(q.includes("export")||/تصدير|اكسل|إكسل/.test(input))return "export_data";
  return "";
}
function planOne(input:string,allowed:Set<string>):LocalPlan|null{
  const op=detectOp(input);if(!op||!allowed.has(op))return null;
  const arabic=AR.test(input),args:Record<string,unknown>={};let required:string[]=[];
  if(op==="create_task"){
    args.clientName=valueAfter(input,["client","client name","للعميل","لعميل","اسم العميل"]);
    args.title=valueAfter(input,["title","task title","بعنوان","عنوان","اسمها","اسمه"]);
    args.brief=valueAfter(input,["brief","البريف","وصف"]);
    args.deadline=deadlineFrom(input);
    const assignee=valueAfter(input,["assignee","assign to","اسند لـ","اسند ل","للمصمم"]);if(assignee)args.assigneeName=assignee;
    if(/urgent|عاجل/i.test(input))args.priority="URGENT";else if(/high|عالي[هة]?|عالية/i.test(input))args.priority="HIGH";
    required=["clientName","title","brief","deadline"];
  }else if(op==="create_client"){
    args.companyName=valueAfter(input,["company","company name","client","client name","شركة","اسم الشركة","عميل","اسم العميل"]);required=["companyName"];
  }else if(op==="create_lead"){
    args.companyName=valueAfter(input,["company","company name","شركة","اسم الشركة","lead","ليد"]);
    args.contactPerson=valueAfter(input,["contact","contact person","جهة الاتصال","اسم الشخص"]);
    const v=numberFrom(input,["value","estimated value","قيمة","القيمة"]);if(v!==undefined)args.estimatedValue=v;required=["companyName","contactPerson","estimatedValue"];
  }else if(op==="log_expense"){
    const amount=numberFrom(input,["amount","المبلغ","مصروف"]);if(amount!==undefined)args.amount=amount;
    args.category=/salary|salaries|مرتب|رواتب/i.test(input)?"Salaries":/tool|software|اداة|أداة/i.test(input)?"Tools":/office|مكتب/i.test(input)?"Office":"Other";
    args.description=valueAfter(input,["description","details","وصف","البيان"])||clean(input).slice(0,180);required=["amount"];
  }else if(op==="record_payment"){
    args.clientName=valueAfter(input,["client","للعميل","لعميل","اسم العميل"]);const amount=numberFrom(input,["amount","payment","دفعة","المبلغ"]);if(amount!==undefined)args.amount=amount;required=["clientName","amount"];
  }else if(op==="create_invoice"){
    args.clientName=valueAfter(input,["client","للعميل","لعميل","اسم العميل"]);const retainer=numberFrom(input,["retainer","amount","قيمة","المبلغ"]);if(retainer!==undefined)args.retainer=retainer;const now=new Date();args.month=now.getUTCMonth()+1;args.year=now.getUTCFullYear();required=["clientName","retainer"];
  }else if(op==="remind_me"){
    args.title=valueAfter(input,["remind me","reminder","فكرني","ذكرني","ذكّرني"])||clean(input).slice(0,180);
    const when=deadlineFrom(input);if(when)args.dueAt=when;
  }else if(op==="archive_task"){
    args.taskTitle=valueAfter(input,["task","task title","تاسك","المهمة"]);args.clientName=valueAfter(input,["client","للعميل","لعميل","اسم العميل"]);required=["taskTitle","clientName"];
  }else if(op==="archive_client"){
    args.clientName=valueAfter(input,["client","client name","عميل","اسم العميل"]);required=["clientName"];
  }else if(op==="send_whatsapp"){
    args.to=valueAfter(input,["to","number","phone","لرقم","الى","إلى"]);args.body=valueAfter(input,["body","message","رسالة","الرسالة"]);required=["to","body"];
  }else if(op==="send_email"){
    args.to=valueAfter(input,["to","email","الى","إلى"]);args.subject=valueAfter(input,["subject","عنوان"]);args.body=valueAfter(input,["body","message","رسالة","الرسالة"]);required=["to","subject","body"];
  }else if(op==="sync_campaign"){
    args.campaignName=valueAfter(input,["campaign","campaign name","حملة","اسم الحملة"]);required=["campaignName"];
  }else if(op==="start_integration"){
    args.platform=/instagram/i.test(input)?"instagram":/facebook|meta/i.test(input)?"meta":/google/i.test(input)?"google":/snap/i.test(input)?"snapchat":valueAfter(input,["platform","منصة","المنصة"]);required=["platform"];
  }else if(op==="export_data"){
    args.entity=/finance|مالي/i.test(input)?"finance":/media|اعلان/i.test(input)?"media":/sales|مبيعات|lead/i.test(input)?"sales":/task|تاسك|مهام/i.test(input)?"tasks":"clients";
  }
  const missingFields=required.filter(k=>args[k]===undefined||args[k]===null||String(args[k]).trim()==="");
  const summary=arabic?`VIVITO جهّز أمر ${op.replaceAll("_"," ")} من طلبك.`:`VIVITO prepared ${op.replaceAll("_"," ")} from your request.`;
  return{op,summary,args,missingFields};
}
function localAction(prompt:string,system:string){const input=requestFromPrompt(prompt),allowed=allowedFromSystem(system),plan=planOne(input,allowed);return JSON.stringify(plan?{...plan,risk:"medium",requiresConfirmation:true}:{op:"none"})}
function localOrchestrator(prompt:string,system:string){
  const input=requestFromPrompt(prompt),allowed=allowedFromSystem(system),parts=input.split(/(?:\s+(?:and then|then|also)\s+|\s+(?:وبعدين|وبعد كده|ثم|وكمان)\s+)/i).map(x=>x.trim()).filter(Boolean),plans=parts.map(p=>planOne(p,allowed)).filter((x):x is LocalPlan=>!!x);
  if(plans.length<2)return JSON.stringify({summary:"",steps:[],requiresConfirmation:true});
  return JSON.stringify({summary:plans.map(p=>p.summary).join(" → "),steps:plans,requiresConfirmation:true});
}
function contextFromPrompt(prompt:string){const marker="ERP LIVE CONTEXT:";const i=prompt.lastIndexOf(marker);if(i<0)return{};const raw=prompt.slice(i+marker.length).trim();try{return JSON.parse(raw) as Record<string,unknown>}catch{return{}}}
function localAdvisor(prompt:string){
  const question=requestFromPrompt(prompt),ctx=contextFromPrompt(prompt),arabic=AR.test(question),operations=(ctx.operations||{}) as Record<string,unknown>,sales=(ctx.sales||{}) as Record<string,unknown>,media=(ctx.media||{}) as Record<string,unknown>,finance=(ctx.finance||{}) as Record<string,unknown>,scope=(ctx.scope||{}) as Record<string,unknown>,topTasks=Array.isArray(ctx.topTasks)?ctx.topTasks as Array<Record<string,unknown>>:[];
  if(/task|deadline|overdue|review|تاسك|مهم|ديدلاين|متأخر|مراجعة/i.test(question)){
    const lines=topTasks.slice(0,5).map(t=>`• ${String(t.title||"Task")} — ${String(t.status||"")} — ${String(t.deadline||"").slice(0,10)}`);
    return arabic?`عندك ${Number(operations.activeTasks||0)} مهمة نشطة، منهم ${Number(operations.overdueTasks||0)} متأخر و${Number(operations.reviewTasks||0)} في المراجعة.${lines.length?`\n${lines.join("\n")}`:""}`:`You have ${Number(operations.activeTasks||0)} active tasks, ${Number(operations.overdueTasks||0)} overdue and ${Number(operations.reviewTasks||0)} in review.${lines.length?`\n${lines.join("\n")}`:""}`;
  }
  if(/sales|lead|pipeline|مبيعات|ليد|بايبلاين/i.test(question))return arabic?`مسار المبيعات الحالي فيه ${Number(sales.leadCount||0)} lead نشط، والـweighted pipeline ${Number(sales.weightedPipeline||0).toLocaleString("en-EG")}، وفي ${Number(sales.overdueFollowUps||0)} follow-up متأخر.`:`The current sales pipeline has ${Number(sales.leadCount||0)} active leads, a weighted pipeline of ${Number(sales.weightedPipeline||0).toLocaleString("en-EG")}, and ${Number(sales.overdueFollowUps||0)} overdue follow-ups.`;
  if(/media|campaign|roas|spend|ads|اعلان|حمل[هة]|ميديا/i.test(question))return arabic?`الـlive media context عندي: spend ${Number(media.spend||0).toLocaleString("en-EG")}, results ${Number(media.results||0)}, purchases ${Number(media.purchases||0)}, ROAS ${Number(media.roas||0).toFixed(2)}x. لو تحدد العميل أو الحملة أقدر أضيّق التشخيص.`:`Live media context: spend ${Number(media.spend||0).toLocaleString("en-EG")}, results ${Number(media.results||0)}, purchases ${Number(media.purchases||0)}, ROAS ${Number(media.roas||0).toFixed(2)}x. Name the client or campaign and I can narrow the diagnosis.`;
  if(/finance|payment|invoice|outstanding|مالي|دفع|فاتور|تحصيل/i.test(question))return arabic?`الـfinance context المتاح لدورك: مستحق ${Number(finance.amountDue||0).toLocaleString("en-EG")}, محصل ${Number(finance.amountPaid||0).toLocaleString("en-EG")}, متبقي ${Number(finance.amountOutstanding||0).toLocaleString("en-EG")}.`:`Finance context available to your role: due ${Number(finance.amountDue||0).toLocaleString("en-EG")}, paid ${Number(finance.amountPaid||0).toLocaleString("en-EG")}, outstanding ${Number(finance.amountOutstanding||0).toLocaleString("en-EG")}.`;
  if(/client|عميل/i.test(question)){const names=Array.isArray(scope.clientNames)?scope.clientNames.slice(0,8).join(", "):"";return arabic?`عندي وصول لـ${Number(scope.clientCount||0)} عميل داخل صلاحياتك${names?`: ${names}`:""}. قولّي العميل والقرار المطلوب.`:`I can access ${Number(scope.clientCount||0)} clients inside your role scope${names?`: ${names}`:""}. Tell me the client and the decision you need.`}
  const short=clean(question).slice(0,120);return arabic?`فهمت سؤالك: «${short}». أقدر أجاوب من الداتا الحية الموجودة في VIVIT وأنفّذ أوامر ERP المسموح بها لدورك. لو القرار متعلق بعميل، حملة، تاسك، مبيعات أو مالية اذكر الاسم/العنصر عشان أديك نتيجة محددة بدل رد عام.`:`I understood: “${short}”. I can answer from live VIVIT data and execute ERP commands allowed for your role. Name the client, campaign, task, sales item or finance item for a specific result instead of a generic answer.`;
}

export function generateLocalVivito(prompt:string,system:string){
  if(/independent VIVITO critic|VIVITO RED TEAM/i.test(system))return null;
  if(/VIVITO Action Planner/i.test(system))return{ text:localAction(prompt,system), modelId:"local-action-v1" };
  if(/VIVITO Operating Orchestrator/i.test(system))return{ text:localOrchestrator(prompt,system), modelId:"local-orchestrator-v1" };
  if(/Artifact|Memory Planner|Competitive/i.test(system))return null;
  return{ text:localAdvisor(prompt), modelId:"local-live-context-v1" };
}
