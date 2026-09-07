"use client";

import {useEffect} from "react";

const RAW_MARKERS=["{\"role\":","\"clientNames\":","\"clients\":[","\"workspaceId\":","ERP LIVE CONTEXT","AUTHORIZED GROUP CONTEXT","Current context:","current context:","clientCount\":","السياق الحالي","company_name\":"];
const looksRaw=(text:string)=>RAW_MARKERS.some(marker=>text.includes(marker))||(/\{\s*\"role\"\s*:/.test(text)&&/(?:\"clients?\"|\"clientNames\")\s*:/.test(text));
const safeText=(text:string)=>/[\u0600-\u06ff]/.test(text)
  ?"VIVITO شغال بوضع الاستمرارية الآمن. بيانات الـERP متاحة داخليًا حسب صلاحياتك ولن تُعرض كبيانات خام. اكتب سؤالك أو الأمر التشغيلي مباشرة."
  :"VIVITO is online in secure continuity mode. Authorized ERP context remains internal and is never shown as raw data. Send a direct question or operational command.";

export default function VivitoOutputGuard(){
  useEffect(()=>{
    let cleaning=false;
    const clean=()=>{
      if(cleaning)return;
      cleaning=true;
      try{
        document.querySelectorAll<HTMLElement>(".va-msg,.va-chat [class*='va-msg']").forEach(bubble=>{
          const text=bubble.innerText||bubble.textContent||"";
          if(!looksRaw(text))return;
          bubble.replaceChildren(document.createTextNode(safeText(text)));
          bubble.setAttribute("data-vivito-sanitized","true");
        });
      }finally{cleaning=false}
    };
    clean();
    const observer=new MutationObserver(()=>queueMicrotask(clean));
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    const timer=window.setInterval(clean,250);
    return()=>{observer.disconnect();window.clearInterval(timer)};
  },[]);
  return null;
}
