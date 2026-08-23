"use client";

import { useEffect } from "react";

export function LegacyUiGuard(){
  useEffect(()=>{
    const root=document.querySelector(".app-content");
    if(!root)return;

    const sanitize=()=>{
      /* Remove legacy demo-only SLA block with hardcoded performance percentages. */
      root.querySelectorAll<HTMLElement>(".card").forEach(card=>{
        const text=card.innerText||"";
        if(text.includes("SLA Dashboard")&&text.includes("This Month Performance"))card.remove();
      });

      /* Correct misleading/outdated copy without touching calculations. */
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node:Node|null;
      while((node=walker.nextNode())){
        const current=node.nodeValue||"";
        let next=current
          .replace("AI-assisted forecast based on pipeline + historical trend","Forecast based on pipeline and historical trend")
          .replace("Smart provider routing · Gemini Free / Claude","AI provider routing")
          .replace("Predicted LTV","Estimated LTV")
          .replace("predicted future value","estimated future value");
        if(next!==current)node.nodeValue=next;
      }

      /* Keep AI Studio period options current. */
      const year=new Date().getFullYear();
      root.querySelectorAll<HTMLSelectElement>('select[id$="-period"]').forEach(select=>{
        Array.from(select.options).forEach(option=>{
          option.text=option.text.replace(/Q([1-4])\s+20\d{2}/g,`Q$1 ${year}`);
          option.value=option.value.replace(/Q([1-4])\s+20\d{2}/g,`Q$1 ${year}`);
        });
      });
    };

    sanitize();
    const observer=new MutationObserver(()=>sanitize());
    observer.observe(root,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
