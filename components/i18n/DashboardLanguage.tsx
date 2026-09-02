"use client";

import { useEffect } from "react";

/**
 * Production language contract for the internal ERP.
 * The current interface is intentionally English-only so navigation,
 * accessibility labels, generated content, and persisted preferences stay
 * deterministic across every role and device.
 */
export function DashboardLanguage() {
  useEffect(() => {
    localStorage.setItem("vivit-lang","en");
    document.documentElement.lang="en";
    document.documentElement.dir="ltr";
    document.documentElement.dataset.vivitLang="en";

    const root = document.querySelector<HTMLElement>(".app-main-shell");
    if (root) {
      root.dir = "ltr";
      root.dataset.uiLanguage = "en";
    }
  }, []);

  return null;
}
