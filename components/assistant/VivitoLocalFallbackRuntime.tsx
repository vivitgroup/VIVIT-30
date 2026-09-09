"use client";
import {useEffect} from "react";

function isAssistantRequest(input:RequestInfo|URL){const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;return /\/api\/assistant(?:\?|$)/.test(url)&&!url.includes("/api/assistant/local")}
function shouldFallback(data:unknown){if(!data||typeof data!=="object"||Array.isArray(data))return false;const d=data as Record<string,unknown>,meta=d.intelligenceMeta&&typeof d.intelligenceMeta==="object"?d.intelligenceMeta as Record<string,unknown>:{};const answer=String(d.answer||"");return String(meta.provider||"")==="local"||String(d.mode||"")==="provider-unavailable"||/secure continuity mode|وضع الاستمرارية الآمن|مزودات الـAI الخارجية المجانية غير متاحة/i.test(answer)}

export default function VivitoLocalFallbackRuntime(){
 useEffect(()=>{
  const original=window.fetch.bind(window);
  const patched:typeof window.fetch=async(input,init)=>{
   const response=await original(input,init);
   if(!isAssistantRequest(input)||String(init?.method||"GET").toUpperCase()!=="POST")return response;
   try{
    const clone=response.clone(),data=await clone.json();if(!shouldFallback(data))return response;
    const raw=typeof init?.body==="string"?JSON.parse(init.body):{},question=String(raw?.question||"").trim();if(!question)return response;
    const fallback=await original("/api/assistant/local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question}),cache:"no-store"});
    if(!fallback.ok)return response;
    const local=await fallback.json();return new Response(JSON.stringify(local),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}})
   }catch{return response}
  };
  window.fetch=patched;return()=>{if(window.fetch===patched)window.fetch=original};
 },[]);
 return null;
}
