"use client";

import {useEffect} from "react";

type JsonRecord=Record<string,unknown>;
const asRecord=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};

export default function VivitoLiveFallbackRuntime(){
 useEffect(()=>{
  const originalFetch=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input,init)=>{
   const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   const response=await originalFetch(input as RequestInfo|URL,init);
   if(!url.includes("/api/assistant")||url.includes("/api/assistant/local")||String(init?.method||"GET").toUpperCase()!=="POST")return response;
   try{
    const payload=asRecord(await response.clone().json()),meta=asRecord(payload.intelligenceMeta);
    const provider=String(meta.provider||""),mode=String(payload.mode||"");
    const continuity=mode==="advisor"&&provider==="local"&&!payload.actionProposal&&!payload.actionPlan&&!payload.artifactProposal;
    if(!continuity)return response;
    let question="";
    if(typeof init?.body==="string")question=String(asRecord(JSON.parse(init.body)).question||"").trim();
    if(!question)return response;
    const local=await originalFetch("/api/assistant/local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question}),cache:"no-store"});
    if(!local.ok)return response;
    const localPayload=asRecord(await local.clone().json());
    if(!String(localPayload.answer||"").trim())return response;
    return local;
   }catch{return response}
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=originalFetch};
 },[]);
 return null;
}
