export const dynamic="force-dynamic";

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
      .vgroup-hospitality-brand{min-height:100vh;background:#FFFDF8;color:#241E16;--vh-ink:#241E16;--vh-gold:#C99A3D;--vh-gold-dark:#9A6D17;--vh-cream:#FFFDF8;--vh-muted:#746650;--vh-line:rgba(201,154,61,.24)}
      .vgroup-hospitality-brand main{background:radial-gradient(circle at 86% 2%,rgba(201,154,61,.13),transparent 29%),linear-gradient(180deg,#FFFDF8 0%,#FFFFFF 48%,#FBF6EA 100%)!important;color:#241E16!important}
      .vgroup-hospitality-brand main article,.vgroup-hospitality-brand main form{border-color:var(--vh-line)!important;background:rgba(255,255,255,.94)!important;box-shadow:0 18px 52px rgba(81,58,16,.08)}
      .vgroup-hospitality-brand main a{color:#9A6D17}
      .vgroup-hospitality-brand main input,.vgroup-hospitality-brand main select,.vgroup-hospitality-brand main textarea{border-color:rgba(201,154,61,.30)!important;background:#FFFFFF!important;color:#241E16!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
      .vgroup-hospitality-brand main input::placeholder,.vgroup-hospitality-brand main textarea::placeholder{color:#9A8B72!important}
      .vgroup-hospitality-brand main button:not([data-danger="true"]){background:linear-gradient(135deg,#D9B35F,#B98222)!important;color:#1F170B!important;font-weight:900;box-shadow:0 10px 24px rgba(185,130,34,.18)}
      .vgroup-hospitality-brand ::selection{background:#D9B35F;color:#1F170B}
      .vgroup-hospitality-nav{position:sticky;top:0;z-index:45;display:flex;gap:9px;align-items:center;overflow-x:auto;padding:10px 16px;background:rgba(255,253,248,.94);backdrop-filter:blur(18px);border-bottom:1px solid var(--vh-line);box-shadow:0 8px 30px rgba(81,58,16,.05)}
      .vgroup-hospitality-nav a{white-space:nowrap;text-decoration:none;color:#665435;padding:8px 11px;border-radius:10px;border:1px solid rgba(201,154,61,.20);font:800 12px/1 Inter,system-ui,sans-serif;background:rgba(255,255,255,.8)}
      .vgroup-hospitality-nav a:hover{border-color:rgba(201,154,61,.48);color:#8A6217}
      .vgroup-hospitality-nav a[data-primary="true"]{background:linear-gradient(135deg,#D9B35F,#B98222);color:#1F170B;border-color:transparent}
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
