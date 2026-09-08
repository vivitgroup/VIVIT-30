"use client";
import {useEffect} from "react";

type ToolRegistration={
  name:string;
  title?:string;
  description:string;
  inputSchema:Record<string,unknown>;
  annotations?:{readOnlyHint?:boolean;untrustedContentHint?:boolean};
  execute:(input:unknown)=>unknown|Promise<unknown>;
};

type ModelContext={registerTool:(tool:ToolRegistration,options?:{signal?:AbortSignal})=>void|Promise<void>};
type WebMcpDocument=Document&{modelContext?:ModelContext};

const AREAS:Record<string,string>={
  dashboard:"/dashboard",
  clients:"/dashboard/clients",
  creative:"/dashboard/creative",
  media:"/dashboard/media/control-center",
  sales:"/dashboard/sales",
  finance:"/dashboard/finance",
  files:"/dashboard/files",
  calendar:"/dashboard/calendar",
  analytics:"/dashboard/analytics",
  ai_studio:"/dashboard/ai-studio",
  group:"/group",
  hospitality:"/group/hospitality",
  tech:"/group/tech",
};

const visibleText=(selector:string,limit:number)=>Array.from(document.querySelectorAll<HTMLElement>(selector))
  .filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"})
  .map(el=>(el.innerText||el.getAttribute("aria-label")||el.textContent||"").trim().replace(/\s+/g," "))
  .filter(Boolean).slice(0,limit);

export default function WebMcpBridge(){
  useEffect(()=>{
    const context=(document as WebMcpDocument).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:ToolRegistration)=>{
      try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
    };

    register({
      name:"read_current_erp_view",
      title:"Read current ERP view",
      description:"Read the current VIVIT ERP route, page title, visibility state, and whether the view is in Marketing Dashboard or Vivit Group. This tool does not modify data.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:false},
      execute:()=>({
        path:window.location.pathname,
        title:document.title,
        area:window.location.pathname.startsWith("/group")?"group":window.location.pathname.startsWith("/dashboard")?"marketing":"public",
        visibility:document.visibilityState,
      }),
    });

    register({
      name:"read_visible_erp_state",
      title:"Read visible ERP state",
      description:"Read a concise snapshot of visible headings, alerts, buttons, links, and form labels from the current VIVIT ERP page for QA and accessibility verification. This tool is read-only and may include user-provided page content.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute:()=>({
        path:window.location.pathname,
        title:document.title,
        headings:visibleText("h1,h2,h3,[role='heading']",12),
        alerts:visibleText("[role='alert'],[aria-live='assertive'],[aria-live='polite']",10),
        buttons:visibleText("button,[role='button']",20),
        links:visibleText("a[href]",20),
        labels:visibleText("label",20),
      }),
    });

    register({
      name:"navigate_erp_area",
      title:"Navigate ERP area",
      description:"Navigate to a safe allowlisted VIVIT ERP area. Existing server-side authentication and RBAC remain authoritative and may redirect or deny access for the current user role.",
      inputSchema:{type:"object",properties:{area:{type:"string",enum:Object.keys(AREAS)}},required:["area"],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute:(input)=>{
        const area=String((input as {area?:unknown})?.area||"");
        const path=AREAS[area];
        if(!path)throw new Error("Unsupported ERP area");
        window.location.assign(path);
        return {navigating:true,area,path};
      },
    });

    register({
      name:"refresh_current_erp_view",
      title:"Refresh current ERP view",
      description:"Reload the current VIVIT ERP page to verify fresh server-rendered state. This does not create, update, or delete business data.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute:()=>{window.location.reload();return {refreshing:true,path:window.location.pathname};},
    });

    return()=>lifecycle.abort();
  },[]);
  return null;
}
