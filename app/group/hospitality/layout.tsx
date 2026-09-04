import Link from "next/link";
import type {ReactNode} from "react";
import {VivitoLauncher} from "@/components/vgroup/vivito-launcher";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";

export default async function HospitalityLayout({children}:{children:ReactNode}){
  const session=await requireBusinessUnitAccess("hospitality");
  const isOwner=session.memberships.some(item=>item.businessUnit==="hospitality"&&item.role==="OWNER");
  const canProperties=hasPermission(session,"hospitality","properties:view");
  const canReservations=hasPermission(session,"hospitality","reservations:view");
  const canOwners=hasPermission(session,"hospitality","owners:view");
  const canOperations=hasPermission(session,"hospitality","properties:update");
  const canFinance=hasPermission(session,"hospitality","finance:view");
  return <div className="vgroup-hospitality-brand">
    <style>{`
      .vgroup-hospitality-brand{min-height:100vh;background:#0C1B2A;color:#F7F4EC;--vh-navy:#0C1B2A;--vh-navy-2:#12283B;--vh-gold:#D6AD5B;--vh-cream:#F7F4EC;--vh-muted:#C7B894}
      .vgroup-hospitality-brand main{background:radial-gradient(circle at 85% 0%,rgba(214,173,91,.16),transparent 28%),linear-gradient(145deg,#0C1B2A,#07121D)!important;color:#F7F4EC!important}
      .vgroup-hospitality-brand main article,.vgroup-hospitality-brand main form{border-color:rgba(214,173,91,.28)!important;background:linear-gradient(155deg,rgba(214,173,91,.10),rgba(12,27,42,.78))!important;box-shadow:0 18px 55px rgba(0,0,0,.16)}
      .vgroup-hospitality-brand main a{color:#D6AD5B}
      .vgroup-hospitality-brand main input,.vgroup-hospitality-brand main select,.vgroup-hospitality-brand main textarea{border-color:rgba(214,173,91,.32)!important;background:#091725!important;color:#F7F4EC!important}
      .vgroup-hospitality-brand main button:not([data-danger="true"]){background:#D6AD5B!important;color:#0C1B2A!important;font-weight:900}
      .vgroup-hospitality-brand ::selection{background:#D6AD5B;color:#0C1B2A}
      .vgroup-hospitality-nav{position:sticky;top:0;z-index:45;display:flex;gap:9px;align-items:center;overflow-x:auto;padding:10px 16px;background:rgba(7,18,29,.94);backdrop-filter:blur(18px);border-bottom:1px solid rgba(214,173,91,.2)}
      .vgroup-hospitality-nav a{white-space:nowrap;text-decoration:none;color:#E7D6AE;padding:8px 11px;border-radius:10px;border:1px solid rgba(214,173,91,.18);font:800 12px/1 Inter,system-ui,sans-serif}
      .vgroup-hospitality-nav a[data-primary="true"]{background:#D6AD5B;color:#0C1B2A}
    `}</style>
    <nav className="vgroup-hospitality-nav" aria-label="Hospitality navigation">
      <Link href={isOwner?"/group/hospitality/owner-portal":"/group/hospitality"}>Hospitality</Link>
      {canReservations?<Link href="/group/hospitality/calendar" data-primary="true">Calendar & Airbnb</Link>:null}
      {canProperties?<Link href="/group/hospitality/properties">Properties</Link>:null}
      {canOwners?<Link href="/group/hospitality/owners">Owners</Link>:null}
      {canReservations?<Link href="/group/hospitality/reservations">Reservations</Link>:null}
      {canOperations?<Link href="/group/hospitality/operations">Operations</Link>:null}
      {canFinance&&!isOwner?<Link href="/group/hospitality/finance">Finance</Link>:null}
      {isOwner?<Link href="/group/hospitality/owner-portal" data-primary="true">Owner Portal</Link>:null}
    </nav>
    {children}<VivitoLauncher workspace="hospitality"/>
  </div>;
}
