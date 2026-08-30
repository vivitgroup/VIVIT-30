"use client";

import Image from "next/image";

type Mood = "calm" | "thinking" | "insight" | "warning" | "success";

export default function VivitVivito({ mood = "calm", message, compact = false }: { mood?: Mood; message?: string; compact?: boolean }) {
  const label = mood === "thinking" ? "Thinking" : mood === "warning" ? "Attention" : mood === "success" ? "Done" : mood === "insight" ? "Insight" : "Ready";
  return <div className={`vivito-one ${compact ? "is-compact" : ""} mood-${mood}`} aria-live="polite" aria-label={`VIVITO: ${label}`}>
    {message ? <div className="vivito-one-bubble"><small>VIVITO</small><span>{message}</span></div> : null}
    <div className="vivito-one-core" aria-hidden="true"><i className="vivito-one-orbit orbit-a"/><i className="vivito-one-orbit orbit-b"/><div className="vivito-one-halo"/><Image src="/vivito-3d.png" alt="" width={180} height={180} sizes="(max-width: 768px) 72px, 96px"/></div>
    {!compact ? <div className="vivito-one-copy"><b>VIVITO</b><small>{label} · Digital teammate</small></div> : null}
  </div>;
}
