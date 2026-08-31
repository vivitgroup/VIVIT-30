"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

function cleanHandle(value:string){return value.trim().replace(/^@/,"").replace(/^\/+|\/+$/g,"")}
function normalizeSocial(kind:string,raw:string){
  const value=raw.trim();if(!value)return "";
  if(/^https?:\/\//i.test(value)){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.toString():""}catch{return ""}}
  if(value.startsWith("//"))return `https:${value}`;
  if(/^(?:www\.)?(?:facebook\.com|fb\.com|instagram\.com)\//i.test(value))return `https://${value}`;
  const label=kind.toLowerCase(),handle=cleanHandle(value);if(!handle)return "";
  if(label.includes("facebook"))return `https://www.facebook.com/${encodeURI(handle)}`;
  if(label.includes("instagram"))return `https://www.instagram.com/${encodeURI(handle)}`;
  return "";
}

export function ClientSocialLinkRuntime(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!/^\/dashboard\/clients\/[^/]+/.test(pathname))return;
    const bind=()=>{
      const anchors=Array.from(document.querySelectorAll<HTMLAnchorElement>(".cw-social a"));
      for(const anchor of anchors){
        const kind=(anchor.textContent||anchor.getAttribute("aria-label")||"").trim();if(!/facebook|instagram/i.test(kind))continue;
        const normalized=normalizeSocial(kind,anchor.getAttribute("href")||"");if(!normalized)continue;
        anchor.href=normalized;anchor.target="_blank";anchor.rel="noopener noreferrer";anchor.dataset.vivitSocialBound="1";
      }
    };
    bind();const observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[pathname]);
  return null;
}
