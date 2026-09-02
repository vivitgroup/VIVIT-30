"use client";

import { useEffect } from "react";

// Kept as a dormant translation dictionary for accessibility/content tooling.
// Production UI remains English-only until the product language contract is reopened.
const AR: Record<string,string> = {
  "Pipeline Board":"مسار المبيعات",
  "Daily Budget":"الميزانية اليومية",
  "Ledger Revenue":"إيرادات دفتر الأستاذ",
  "Payroll":"الرواتب",
  "Workspace Settings":"إعدادات مساحة العمل",
};

const excluded = (el: Element | null) => !el || Boolean(el.closest("[data-user-content],[data-vivito-message],[data-no-translate],script,style,code,pre"));

function preserveTranslationInfrastructure(root: ParentNode) {
  // Accessibility translation plumbing is intentionally retained for a future opt-in locale.
  root.querySelectorAll?.("[aria-label]").forEach((el) => {
    if (excluded(el)) return;
    const label = el.getAttribute("aria-label");
    if (label && AR[label]) el.dataset.ariaAr = AR[label];
  });
}

export function DashboardLanguage() {
  useEffect(() => {
    localStorage.setItem("vivit-lang","en");
    document.documentElement.lang="en";
    document.documentElement.dir="ltr";
    document.documentElement.dataset.vivitLang="en";

    const root = document.querySelector<HTMLElement>(".app-main-shell");
    if (!root) return;
    root.dir = "ltr";
    root.dataset.uiLanguage = "en";
    preserveTranslationInfrastructure(root);

    const observer = new MutationObserver(() => preserveTranslationInfrastructure(root));
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["aria-label"]});
    return () => observer.disconnect();
  }, []);

  return null;
}
