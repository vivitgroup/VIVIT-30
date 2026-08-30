"use client";

import { useLayoutEffect } from "react";

/**
 * Dashboard chrome is intentionally English-only.
 * Arabic is scoped to the desktop Sidebar component so the application
 * never flips to RTL or mutates page content at runtime.
 */
export function DashboardLanguage() {
  useLayoutEffect(() => {
    try {
      localStorage.setItem("vivit-lang", "en");
    } catch {}
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    window.dispatchEvent(new CustomEvent("vivit-language", { detail: "en" }));
  }, []);

  return null;
}
