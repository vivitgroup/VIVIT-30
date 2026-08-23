"use client";

import { useEffect } from "react";

export function LegacyUiGuard(){
  useEffect(()=>{
    const root=document.querySelector(".app-content");
    if(!root)return;

    const bindUserFilter=()=>{
      const input=root.querySelector<HTMLInputElement>('input[placeholder="Filter users..."]');
      if(!input||input.dataset.vivitFilterBound==="true")return;
      input.dataset.vivitFilterBound="true";
      input.addEventListener("input",()=>{
        const query=input.value.trim().toLowerCase();
        const table=input.closest(".card")?.querySelector("table");
        table?.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach(row=>{
          row.style.display=(row.textContent||"").toLowerCase().includes(query)?"":"none";
        });
      });
    };

    const removeDeadControls=()=>{
      if(root.querySelector(".calendar-layout")){
        root.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{
          if(button.textContent?.trim()==="Week")button.remove();
        });
      }
    };

    const sanitize=()=>{
      root.querySelectorAll<HTMLElement>(".card").forEach(card=>{
        const text=card.innerText||"";
        if(text.includes("SLA Dashboard")&&text.includes("This Month Performance"))card.remove();
      });

      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node:Node|null;
      while((node=walker.nextNode())){
        const current=node.nodeValue||"";
        const next=current
          .replace("AI-assisted forecast based on pipeline + historical trend","Forecast based on pipeline and historical trend")
          .replace("Smart provider routing · Gemini Free / Claude","AI provider routing")
          .replace("Predicted LTV","Estimated LTV")
          .replace("predicted future value","estimated future value");
        if(next!==current)node.nodeValue=next;
      }

      const year=new Date().getFullYear();
      root.querySelectorAll<HTMLSelectElement>('select[id$="-period"]').forEach(select=>{
        Array.from(select.options).forEach(option=>{
          const nextText=option.text.replace(/Q([1-4])\s+20\d{2}/g,`Q$1 ${year}`);
          const nextValue=option.value.replace(/Q([1-4])\s+20\d{2}/g,`Q$1 ${year}`);
          if(nextText!==option.text)option.text=nextText;
          if(nextValue!==option.value)option.value=nextValue;
        });
      });
      bindUserFilter();
      removeDeadControls();
    };

    sanitize();
    const observer=new MutationObserver(()=>sanitize());
    observer.observe(root,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
