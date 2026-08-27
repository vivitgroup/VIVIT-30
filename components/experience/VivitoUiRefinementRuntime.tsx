"use client";

import { useEffect } from "react";

type CampaignState = "good" | "excellent" | "warning" | "critical";

const LABELS: Record<CampaignState, string> = {
  good: "GOOD",
  excellent: "EXCELLENT",
  warning: "NEEDS ATTENTION",
  critical: "CRITICAL",
};

function readState(card: HTMLElement): CampaignState {
  if (card.classList.contains("vivito-campaign-critical")) return "critical";
  if (card.classList.contains("vivito-campaign-warning")) return "warning";
  if (card.classList.contains("vivito-campaign-excellent")) return "excellent";
  return "good";
}

function inferReason(card: HTMLElement, state: CampaignState) {
  const text = card.innerText.toLowerCase();
  if (/creative-fatigue|audience-fatigue/.test(text)) return "Fatigue detected";
  if (/rising-cost|high cpa|cost/.test(text) && state !== "good") return "Cost needs review";
  if (/zero-results|no results/.test(text)) return "No results";
  if (/failed|error|rejected/.test(text)) return "Delivery issue";
  if (/top performer|strong growth|scaling-opportunity/.test(text)) return "Top performer";
  if (/improving|healthy/.test(text)) return "Performance healthy";
  return state === "critical" ? "Immediate action" : state === "warning" ? "Review performance" : state === "excellent" ? "Above target" : "On track";
}

function decorateCampaignBadges(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".campaign-card, [data-campaign-card], .media-campaign-card, .campaign-row").forEach((card) => {
    const state = readState(card);
    card.dataset.vivitoCampaignState = state;
    let badge = card.querySelector<HTMLElement>(".vivito-campaign-status-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "vivito-campaign-status-badge";
      badge.setAttribute("aria-hidden", "true");
      card.appendChild(badge);
    }
    badge.textContent = `${LABELS[state]} · ${inferReason(card, state)}`;
  });
}

function bindDirectionalTilt(card: HTMLElement) {
  if (card.dataset.vivitoTiltBound === "1") return;
  card.dataset.vivitoTiltBound = "1";

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || window.innerWidth < 761) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const py = (event.clientY - rect.top) / Math.max(rect.height, 1);
    const ry = (px - 0.5) * 2.2;
    const rx = (0.5 - py) * 1.8;
    card.style.setProperty("--vivito-tilt-x", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--vivito-tilt-y", `${ry.toFixed(2)}deg`);
  };

  const onLeave = () => {
    card.style.removeProperty("--vivito-tilt-x");
    card.style.removeProperty("--vivito-tilt-y");
  };

  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", onLeave);
}

function bindAll(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".card, .card-vivit, .kpi-card, .metric-card, .stat-card, .campaign-card, .creative-card, .attention, .metric-grid > *, .cw-kpis > *").forEach(bindDirectionalTilt);
  decorateCampaignBadges(root);
}

export default function VivitoUiRefinementRuntime() {
  useEffect(() => {
    bindAll();
    const observer = new MutationObserver(() => bindAll());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(() => decorateCampaignBadges(), 5000);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
