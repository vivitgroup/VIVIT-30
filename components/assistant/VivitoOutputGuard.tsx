"use client";

import {useEffect} from "react";

const RAW_MARKERS=["{\"role\":","\"clientNames\":","\"clients\":[","\"workspaceId\":","ERP LIVE CONTEXT","AUTHORIZED GROUP CONTEXT","Current context:","current context:","clientCount\":","السياق الحالي"];
const looksRaw=(text:string)=>RAW_MARKERS.some(marker=>text.includes(marker))||(/\{\s*\"role\"\s*:/.test(text)&&/\"clients?\"\s*:/.test(text));
const safeText=(text:string)=>/[\u0600-\u06ff]/.test(text)
  ?"VIVITO شغال بوضع الاستمرارية الآمن. بيانات الـERP متاحة داخليًا حسب صلاحياتك ولن تُعرض كبيانات خام. اكتب طلبًا مباشرًا أو أمرًا تشغيليًا محددًا."
  :"VIVITO is online in secure continuity mode. Authorized ERP context stays internal and will not be shown as raw data. Send a direct question or supported operational command.";

export default function VivitoOutputGuard(){
  useEffect(()=>{
    const clean=()=>{
      document.querySelectorAll<HTMLElement>(".va-msg.ai,.va-msg.ai > div,.va-chat [class*='ai']").forEach(node=>{
        const text=node.textContent||"";
        if(!looksRaw(text))return;
        const target=node.matches(".va-msg.ai")?(node.querySelector(":scope > div") as HTMLElement|null)||node:node;
        target.textContent=safeText(text);
      });
    };
    clean();
    const observer=new MutationObserver(clean);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    const timer=window.setInterval(clean,400);
    return()=>{observer.disconnect();window.clearInterval(timer)};
  },[]);
  return null;
}
