"use client";
type Mood="calm"|"thinking"|"insight"|"warning"|"success";
export default function VivitVivito({mood="calm",message,compact=false}:{mood?:Mood;message?:string;compact?:boolean}){const label=mood==="thinking"?"Thinking":mood==="warning"?"Attention":mood==="success"?"Done":mood==="insight"?"Insight":"Ready";return <div className={`vivito-mark ${compact?"is-compact":""} mood-${mood}`} aria-live="polite" aria-label={`VIVITO: ${label}`}>{message&&<div className="vivito-bubble"><small>VIVITO</small><span>{message}</span></div>}<div className="vivito-avatar" aria-hidden="true"><span>V</span></div>{!compact&&<div className="vivito-copy"><b>VIVITO</b><small>{label}</small></div>}<style>{CSS}</style></div>}
const CSS=`
.vivito-mark{display:flex;align-items:center;gap:10px;color:var(--text-primary)}
.vivito-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;background:var(--text-primary);color:var(--card-bg);border:1px solid var(--card-border);box-shadow:0 5px 16px rgba(15,23,42,.10)}
.vivito-avatar span{font:850 16px/1 'Sora',system-ui,sans-serif;letter-spacing:-.04em}
.vivito-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.vivito-copy b{font:800 12px/1.2 'Sora',system-ui,sans-serif;letter-spacing:.02em}.vivito-copy small{font-size:10px;color:var(--text-muted)}
.vivito-bubble{max-width:300px;padding:9px 11px;border-radius:12px;background:var(--card-bg);border:1px solid var(--card-border);color:var(--text-primary);box-shadow:0 8px 24px rgba(15,23,42,.08)}.vivito-bubble small{display:block;font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--text-muted);margin-bottom:3px}.vivito-bubble span{display:block;font-size:12px;line-height:1.5}
.vivito-mark.is-compact{gap:0}.vivito-mark.is-compact .vivito-avatar{width:34px;height:34px;flex-basis:34px;border-radius:11px}.vivito-mark.is-compact .vivito-avatar span{font-size:14px}.vivito-mark.is-compact .vivito-bubble{display:none}
.mood-thinking .vivito-avatar{opacity:.72}.mood-warning .vivito-avatar{outline:2px solid rgba(245,158,11,.25)}.mood-success .vivito-avatar{outline:2px solid rgba(34,197,94,.22)}
@media(prefers-reduced-motion:no-preference){.mood-thinking .vivito-avatar{animation:vivitoPulse 1.4s ease-in-out infinite}@keyframes vivitoPulse{50%{opacity:.45}}}
`;
