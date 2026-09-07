"use client";

import {useEffect} from "react";

const RAW_MARKERS=["{\"role\":","\"clientNames\":","\"clients\":[","\"workspaceId\":","ERP LIVE CONTEXT","AUTHORIZED GROUP CONTEXT"];

export default function VivitoOutputGuard(){
  useEffect(()=>{
    const clean=()=>{
      document.querySelectorAll<HTMLElement>(".va-msg.ai > div:first-child").forEach(node=>{
        const text=node.textContent||"";
        if(!RAW_MARKERS.some(marker=>text.includes(marker)))return;
        const arabic=/[\u0600-\u06ff]/.test(text);
        node.textContent=arabic
          ?"VIVITO شغال بوضع الاستمرارية الآمن. بيانات الـERP متاحة داخليًا حسب صلاحياتك، لكنها لن تُعرض كـJSON. اكتب طلبًا مباشرًا أو أمرًا تشغيليًا محددًا."
          :"VIVITO is running in secure continuity mode. Authorized ERP context remains internal and will never be exposed as raw JSON. Send a direct question or supported operational command.";
      });
    };
    clean();
    const observer=new MutationObserver(clean);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
