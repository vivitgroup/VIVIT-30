import type {ReactNode} from "react";
import {VivitoLauncher} from "@/components/vgroup/vivito-launcher";

export default function TechLayout({children}:{children:ReactNode}){
  return <div className="vgroup-tech-brand">
    <style>{`
      .vgroup-tech-brand{min-height:100vh;background:#070B12;color:#EEF7FF;--vt-bg:#070B12;--vt-panel:#0D1724;--vt-blue:#42ADF5;--vt-blue-2:#76C8FF;--vt-text:#EEF7FF;--vt-muted:#9EB3C8}
      .vgroup-tech-brand main{background:radial-gradient(circle at 82% 0%,rgba(66,173,245,.22),transparent 30%),linear-gradient(145deg,#070B12,#0A1320)!important;color:#EEF7FF!important}
      .vgroup-tech-brand main article,.vgroup-tech-brand main form{border-color:rgba(66,173,245,.26)!important;background:linear-gradient(155deg,rgba(66,173,245,.11),rgba(7,11,18,.80))!important;box-shadow:0 18px 55px rgba(0,0,0,.18)}
      .vgroup-tech-brand main a{color:#52BAFF}
      .vgroup-tech-brand main input,.vgroup-tech-brand main select,.vgroup-tech-brand main textarea{border-color:rgba(66,173,245,.32)!important;background:#091522!important;color:#EEF7FF!important}
      .vgroup-tech-brand main button:not([data-danger="true"]){background:#42ADF5!important;color:#06101A!important;font-weight:900}
      .vgroup-tech-brand ::selection{background:#42ADF5;color:#06101A}
    `}</style>
    {children}<VivitoLauncher workspace="tech"/>
  </div>;
}
