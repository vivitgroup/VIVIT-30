"use client";

import { useEffect } from "react";

function normalizeText(value:string){
  return value
    .replace(/\bUSD\b/g,"EGP")
    .replace(/\(\$\)/g,"(EGP)")
    .replace(/\$\s?(?=\d)/g,"EGP ");
}

export function WorkspaceCurrencyGuard(){
  useEffect(()=>{
    const root=document.querySelector(".app-content");
    if(!root)return;

    const apply=()=>{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node:Node|null;
      while((node=walker.nextNode())){
        const parent=(node.parentElement?.tagName||"").toLowerCase();
        if(["script","style","code","pre"].includes(parent))continue;
        const current=node.nodeValue||"";
        const next=normalizeText(current);
        if(next!==current)node.nodeValue=next;
      }
      root.querySelectorAll<HTMLInputElement>("input[placeholder]").forEach(input=>{
        const next=normalizeText(input.placeholder);
        if(next!==input.placeholder)input.placeholder=next;
      });
    };

    apply();
    const observer=new MutationObserver(()=>apply());
    observer.observe(root,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
