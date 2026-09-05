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
      .vgroup-hospitality-brand{min-height:100vh;background:#FFFFFF;color:#101828;--vh-ink:#101828;--vh-accent:#344054;--vh-muted:#667085;--vh-line:#E4E7EC;--vh-soft:#F9FAFB}
      .vgroup-hospitality-brand main{background:#FFFFFF!important;color:#101828!important}
      .vgroup-hospitality-brand main article,.vgroup-hospitality-brand main form{border-color:#E4E7EC!important;background:#FFFFFF!important;box-shadow:0 10px 30px rgba(16,24,40,.06)!important;color:#101828!important}
      .vgroup-hospitality-brand main h1,.vgroup-hospitality-brand main h2,.vgroup-hospitality-brand main h3,.vgroup-hospitality-brand main h4,.vgroup-hospitality-brand main strong,.vgroup-hospitality-brand main b{color:#101828!important}
      .vgroup-hospitality-brand main p,.vgroup-hospitality-brand main small,.vgroup-hospitality-brand main label,.vgroup-hospitality-brand main span{color:inherit}
      .vgroup-hospitality-brand main a{color:#344054}
      .vgroup-hospitality-brand main input,.vgroup-hospitality-brand main select,.vgroup-hospitality-brand main textarea{border-color:#D0D5DD!important;background:#FFFFFF!important;color:#101828!important;box-shadow:none!important}
      .vgroup-hospitality-brand main input::placeholder,.vgroup-hospitality-brand main textarea::placeholder{color:#98A2B3!important}
      .vgroup-hospitality-brand main button:not([data-danger="true"]){background:#101828!important;color:#FFFFFF!important;font-weight:800;box-shadow:none!important;border-color:#101828!important}
      .vgroup-hospitality-brand ::selection{background:#E4E7EC;color:#101828}
      .vgroup-hospitality-nav{position:sticky;top:0;z-index:45;display:flex;gap:8px;align-items:center;overflow:visible;padding:10px 16px;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-bottom:1px solid #E4E7EC;box-shadow:0 4px 16px rgba(16,24,40,.04)}
      .vgroup-hospitality-nav a,.vgroup-hospitality-nav summary{white-space:nowrap;text-decoration:none;color:#475467;padding:9px 12px;border-radius:999px;border:1px solid #E4E7EC;font:800 12px/1 Inter,system-ui,sans-serif;background:#FFFFFF;cursor:pointer;list-style:none}
      .vgroup-hospitality-nav a:hover,.vgroup-hospitality-nav summary:hover{border-color:#98A2B3;color:#101828}
      .vgroup-hospitality-nav a[data-primary="true"]{background:#101828;color:#FFFFFF;border-color:#101828}
      .vgroup-hospitality-more{position:relative}
      .vgroup-hospitality-more summary::-webkit-details-marker{display:none}
      .vgroup-hospitality-more[open] summary{border-color:#98A2B3;color:#101828}
      .vgroup-hospitality-more-menu{position:absolute;top:44px;right:0;min-width:170px;padding:8px;border:1px solid #E4E7EC;border-radius:16px;background:#fff;box-shadow:0 18px 45px rgba(16,24,40,.14);display:grid;gap:6px}
      .vgroup-hospitality-more-menu a{border:0;border-radius:10px;padding:10px 12px}
      @media(max-width:720px){.vgroup-hospitality-nav{overflow-x:auto}.vgroup-hospitality-more-menu{position:fixed;left:16px;right:16px;top:60px}.vgroup-hospitality-nav a,.vgroup-hospitality-nav summary{padding:8px 10px}}
    `}</style>

    <nav className="vgroup-hospitality-nav" aria-label="Hospitality navigation">
      <Link href={isOwner?"/group/hospitality/owner-portal":"/group/hospitality"} data-primary="true">Today</Link>
      {canReservations?<Link href="/group/hospitality/calendar">Calendar</Link>:null}
      {canReservations?<Link href="/group/hospitality/reservations">Bookings</Link>:null}
      {canProperties?<Link href="/group/hospitality/properties">Properties</Link>:null}
      {canFinance&&!isOwner?<Link href="/group/hospitality/finance">Money</Link>:null}
      {isOwner?<Link href="/group/hospitality/owner-portal">My portal</Link>:null}
      {(canOwners||canOperations)?<details className="vgroup-hospitality-more"><summary>More</summary><div className="vgroup-hospitality-more-menu">
        {canOwners?<Link href="/group/hospitality/owners">Owners</Link>:null}
        {canOperations?<Link href="/group/hospitality/operations">Operations</Link>:null}
      </div></details>:null}
    </nav>

    {children}<VivitoLauncher workspace="hospitality"/>
  </div>;
}
