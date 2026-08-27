"use client";

import { useEffect } from "react";

const MARKETING_QUOTES = [
  "Marketing is the engine that turns attention into growth.",
  "Great marketing makes value impossible to ignore.",
  "A strong brand earns trust before the sales conversation starts.",
  "Growth follows businesses that understand their customers deeply.",
  "Marketing connects what a business does with why people should care.",
  "The best campaigns create demand, not just impressions.",
  "Brand is what people remember when the campaign stops running.",
  "Smart marketing turns data into decisions and decisions into momentum.",
];

function numberFromText(value: string) {
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function classifyCampaign(card: HTMLElement) {
  const text = card.innerText.toLowerCase();
  if (/critical|failed|error|rejected|zero-results/.test(text)) return "critical";
  if (/warning|learning limited|creative-fatigue|audience-fatigue|rising-cost/.test(text)) return "warning";
  if (/excellent|scaling-opportunity|strong growth|top performer/.test(text)) return "excellent";
  if (/healthy|improving|good/.test(text)) return "good";

  const metricRows = Array.from(card.querySelectorAll("span"));
  const primaryRow = metricRows.find((node) => /primary result/i.test(node.textContent || ""));
  const primaryValue = numberFromText(primaryRow?.querySelector("b")?.textContent || "0");
  const statusActive = /active|enabled|running/.test(text);
  const spendNode = Array.from(card.querySelectorAll("b")).find((node) => /egp|usd|sar|aed|£|\$/.test(node.textContent || ""));
  const spend = numberFromText(spendNode?.textContent || "0");

  if (!statusActive && /paused|limited/.test(text)) return "warning";
  if (statusActive && primaryValue >= 10) return "excellent";
  if (statusActive && primaryValue > 0) return "good";
  if (statusActive && spend > 0 && primaryValue === 0) return "warning";
  return "good";
}

function decorateCampaigns(root: ParentNode = document) {
  const cards = root.querySelectorAll<HTMLElement>(
    ".campaign-card, [data-campaign-card], .media-campaign-card, .campaign-row"
  );
  cards.forEach((card) => {
    card.classList.remove(
      "vivito-campaign-good",
      "vivito-campaign-excellent",
      "vivito-campaign-warning",
      "vivito-campaign-critical"
    );
    card.classList.add(`vivito-campaign-${classifyCampaign(card)}`);
  });
}

function mountQuote(hero: HTMLElement) {
  if (hero.querySelector(".vivito-marketing-quote")) return () => undefined;
  const shell = document.createElement("div");
  shell.className = "vivito-marketing-quote";
  shell.setAttribute("aria-live", "polite");
  const prefix = document.createElement("span");
  prefix.className = "vivito-quote-prefix";
  prefix.textContent = "VIVITO · GROWTH NOTE";
  const line = document.createElement("strong");
  const cursor = document.createElement("i");
  cursor.setAttribute("aria-hidden", "true");
  shell.append(prefix, line, cursor);
  hero.appendChild(shell);

  let quoteIndex = Math.floor(Math.random() * MARKETING_QUOTES.length);
  let letterIndex = 0;
  let deleting = false;
  let timer = 0;

  const tick = () => {
    const quote = MARKETING_QUOTES[quoteIndex];
    if (!deleting) {
      letterIndex = Math.min(letterIndex + 1, quote.length);
      line.textContent = quote.slice(0, letterIndex);
      if (letterIndex === quote.length) {
        deleting = true;
        timer = window.setTimeout(tick, 3000);
        return;
      }
      timer = window.setTimeout(tick, 30 + Math.random() * 26);
      return;
    }

    letterIndex = Math.max(letterIndex - 2, 0);
    line.textContent = quote.slice(0, letterIndex);
    if (letterIndex === 0) {
      deleting = false;
      quoteIndex = (quoteIndex + 1) % MARKETING_QUOTES.length;
      timer = window.setTimeout(tick, 420);
      return;
    }
    timer = window.setTimeout(tick, 18);
  };

  tick();
  return () => {
    window.clearTimeout(timer);
    shell.remove();
  };
}

export default function VivitoUiMotionRuntime() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();

    const sync = () => {
      document.querySelectorAll<HTMLElement>(".cw-hero, .portal-hero").forEach((hero) => {
        if (!cleanups.has(hero)) cleanups.set(hero, mountQuote(hero));
      });
      decorateCampaigns();
    };

    sync();
    const observer = new MutationObserver(() => sync());
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(() => decorateCampaigns(), 15000);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  return null;
}
