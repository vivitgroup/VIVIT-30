"use client";

type Mood = "calm" | "thinking" | "insight" | "warning" | "success";

export default function VivitVivito({ mood = "calm", message, compact = false }: { mood?: Mood; message?: string; compact?: boolean }) {
  const label = mood === "thinking" ? "Thinking" : mood === "warning" ? "Attention" : mood === "success" ? "Done" : mood === "insight" ? "Insight" : "Ready";

  return (
    <div className={`vivito-one ${compact ? "is-compact" : ""} mood-${mood}`} aria-live="polite" aria-label={`VIVITO: ${label}`}>
      {message ? <div className="vivito-one-bubble"><small>VIVITO</small><span>{message}</span></div> : null}
      <div className="vivito-one-core" aria-hidden="true">
        <i className="vivito-one-orbit orbit-a" />
        <i className="vivito-one-orbit orbit-b" />
        <span className="vivito-one-halo" />
        <span className="vivito-glyph">V</span>
        <span className="vivito-spark spark-a" />
        <span className="vivito-spark spark-b" />
        <span className="vivito-status-dot" />
      </div>
      {!compact ? <div className="vivito-one-copy"><b>VIVITO</b><small>{label} · AI teammate</small></div> : null}
    </div>
  );
}
