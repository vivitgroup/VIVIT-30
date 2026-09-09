"use client";

import {useEffect} from "react";

type JsonRecord=Record<string,unknown>;
const asRecord=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const assistantUrl=(url:string)=>/\/api\/assistant(?:\?|$)/.test(url)&&!url.includes("/api/assistant/local");
const capabilityQuestion=(q:string)=>/^(?:هل\s+)?(?:تعرف|تقدر|يمكنك|هل\s+يمكنك|can\s+you|are\s+you\s+able\s+to)\b/i.test(q.trim());
function capabilityAnswer(q:string){
 const ar=/[\u0600-\u06ff]/.test(q),client=/عميل|client/i.test(q),invoice=/فاتور|invoice/i.test(q),expense=/مصروف|expense/i.test(q),task=/تاسك|مهم|task/i.test(q);
 if(ar){if(client)return"أيوه. أقدر أضيف عميل جديد من خلال VIVITO حسب صلاحيتك. وقت التنفيذ هحتاج اسم الشركة على الأقل، وبعدها أطلب منك أي بيانات إلزامية ناقصة قبل الحفظ.";if(invoice)return"أيوه. أقدر أجهز وأصدر فاتورة من خلال VIVITO حسب صلاحيتك. هحتاج تحديد العميل والمبلغ والبيانات الإلزامية قبل التنفيذ، ولن أسجلها من غير تأكيد مناسب.";if(expense)return"أيوه. أقدر أسجل مصروف حسب صلاحيتك، مع المبلغ والتصنيف والبيانات المطلوبة، ثم يمر بمسار الاعتماد الموجود في النظام.";if(task)return"أيوه. أقدر أنشئ وأتابع المهام حسب صلاحيتك، وأربطها بالعميل والمسؤول والموعد النهائي.";return"أيوه. VIVITO يقدر يقرأ سياق الـERP المصرح لك به وينفذ الإجراءات المتاحة لدورك. اسألني عن الإجراء المطلوب وسأوضح البيانات اللازمة قبل التنفيذ."}
 if(client)return"Yes. VIVITO can create a new client within your role permissions. I’ll ask for the company name and any required fields before saving.";if(invoice)return"Yes. VIVITO can prepare and issue an invoice within your permissions. I’ll ask for the client, amount, and required fields before execution.";return"Yes. VIVITO can use your authorized ERP context and execute role-scoped actions. Ask for the operation and I’ll collect any required fields before execution.";
}
function shouldFallback(payload:JsonRecord){
 const meta=asRecord(payload.intelligenceMeta),provider=String(meta.provider||""),mode=String(payload.mode||""),answer=String(payload.answer||"");
 return provider==="local"||mode==="provider-unavailable"||/secure continuity|وضع الاستمرارية الآمن|مزودات الـAI الخارجية المجانية غير متاحة|external free AI providers are temporarily unavailable/i.test(answer);
}

export default function VivitoLiveFallbackRuntime(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input,init)=>{
   const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url,method=String(init?.method||"GET").toUpperCase();
   if(!assistantUrl(url)||method!=="POST")return originalFetch(input as RequestInfo|URL,init);
   let question="";
   try{if(typeof init?.body==="string")question=String(asRecord(JSON.parse(init.body)).question||"").trim()}catch{}
   if(question&&capabilityQuestion(question))return new Response(JSON.stringify({answer:capabilityAnswer(question),sources:["VIVITO Capabilities","ERP Authorization Scope"],mode:"capability",intelligence:"VIVITO",intelligenceMeta:{provider:"local-capability",liveContext:true}}),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}});
   const response=await originalFetch(input as RequestInfo|URL,init);
   try{
    const payload=asRecord(await response.clone().json());
    if(!shouldFallback(payload)||!question)return response;
    const local=await originalFetch("/api/assistant/local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question}),cache:"no-store"});
    if(!local.ok)return response;
    const localPayload=asRecord(await local.clone().json());
    if(!String(localPayload.answer||"").trim())return response;
    return new Response(JSON.stringify(localPayload),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}});
   }catch{return response}
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=originalFetch};
 },[]);
 return null;
}
