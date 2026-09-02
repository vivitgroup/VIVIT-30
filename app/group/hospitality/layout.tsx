import type {ReactNode} from "react";

export default function HospitalityLayout({children}:{children:ReactNode}){
  return <div className="vgroup-hospitality-brand">
    <style>{`
      .vgroup-hospitality-brand{min-height:100vh;background:#0C1B2A;color:#F7F4EC;--vh-navy:#0C1B2A;--vh-navy-2:#12283B;--vh-gold:#D6AD5B;--vh-cream:#F7F4EC;--vh-muted:#C7B894}
      .vgroup-hospitality-brand main{background:radial-gradient(circle at 85% 0%,rgba(214,173,91,.16),transparent 28%),linear-gradient(145deg,#0C1B2A,#07121D)!important;color:#F7F4EC!important}
      .vgroup-hospitality-brand main article,.vgroup-hospitality-brand main form{border-color:rgba(214,173,91,.28)!important;background:linear-gradient(155deg,rgba(214,173,91,.10),rgba(12,27,42,.78))!important;box-shadow:0 18px 55px rgba(0,0,0,.16)}
      .vgroup-hospitality-brand main a{color:#D6AD5B}
      .vgroup-hospitality-brand main input,.vgroup-hospitality-brand main select,.vgroup-hospitality-brand main textarea{border-color:rgba(214,173,91,.32)!important;background:#091725!important;color:#F7F4EC!important}
      .vgroup-hospitality-brand main button:not([data-danger="true"]){background:#D6AD5B!important;color:#0C1B2A!important;font-weight:900}
      .vgroup-hospitality-brand ::selection{background:#D6AD5B;color:#0C1B2A}
    `}</style>
    {children}
  </div>;
}
