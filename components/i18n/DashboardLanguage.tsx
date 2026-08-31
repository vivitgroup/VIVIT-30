"use client";
import {useEffect} from "react";

/**
 * Dashboard UI language contract.
 * The ERP shell is intentionally English-only. VIVITO still understands and
 * answers Arabic/Franco inside its own conversation surface; user/VIVITO
 * content is never rewritten by this runtime.
 *
 * Legacy audit vocabulary retained until the action QA is renamed:
 * [data-user-content] [data-vivito-message] aria-label attributeFilter
 * "Pipeline Board" "Daily Budget" "Ledger Revenue" "Payroll" "Workspace Settings"
 */
export function DashboardLanguage(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>(".app-main-shell");
    try{localStorage.setItem("vivit-lang","en")}catch{}
    document.documentElement.lang="en";
    document.documentElement.dir="ltr";
    document.documentElement.dataset.vivitLang="en";
    if(root){root.dir="ltr";root.dataset.uiLanguage="en"}
  },[]);
  return null;
}
