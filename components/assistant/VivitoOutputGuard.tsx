"use client";

import {useEffect} from "react";

const RAW_MARKERS=["{\"role\":","\"clientNames\":","\"clients\":[","\"workspaceId\":","ERP LIVE CONTEXT","AUTHORIZED GROUP CONTEXT","Current context:","current context:","clientCount\":"];

function safeMessage(text:string){
  const arabic=/[\u0600-\u06ff]/.test(text);
  return arabic
    ?"VIVITO شغال بوضع الاستمرارية الآمن. بيانات الـERP متاحة داخليًا حسب صلاحياتك ولن تظهر كـJSON. اكتب سؤالك أو الأمر المطلوب مباشرة."
    :"VIVITO is online in secure continuity mode. Authorized ERP context stays internal and will never be exposed as raw JSON. Send a direct question or supported operational command.";
}

export default function VivitoOutputGuard(){
  useEffect(()=>{
    const clean=()=>{
      document.querySelectorAll<HTMLElement>(".va-msg.ai, .va-msg[class*='ai'], [class*='va-msg'][class*='ai']").forEach(bubble=>{
        const text=bubble.textContent||"";
        if(!RAW_MARKERS.some(marker=>text.includes(marker)))return;
        const first=bubble.querySelector<HTMLElement>(":scope > div:first-child")||bubble;
        first.textContent=safeMessage(text);
        first.querySelectorAll?.("pre,code").forEach(node=>node.remove());
      });
    };
    clean();
    const observer=new MutationObserver(()=>clean());
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    const timer=window.setInterval(clean,500);
    return()=>{observer.disconnect();window.clearInterval(timer)};
  },[]);
  return null;
}
