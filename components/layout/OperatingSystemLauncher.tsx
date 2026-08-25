"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

type Item={href:string;label:string;hint:string};
export function OperatingSystemLauncher({role}:{role:string}){
 const pathname=usePathname();
 const common:Item[]=[{href:"/dashboard/today",label:"Pulse",hint:"What changed & what matters now"}];
 const byRole:Record<string,Item[]>={
  SUPER_ADMIN:[{href:"/dashboard/executive",label:"War Room",hint:"Executive health & decisions"},{href:"/dashboard/operations",label:"Sonar",hint:"Operational pressure & blockers"},{href:"/dashboard/ai-studio/actions",label:"Decide",hint:"Decision engine & approved actions"},{href:"/dashboard/creative/quality",label:"Cinema",hint:"Creative quality & revision pressure"}],
  ACCOUNT_MANAGER:[{href:"/dashboard/operations",label:"Universe",hint:"Clients, workload & risk"},{href:"/dashboard/ai-studio/actions",label:"Decide",hint:"Next best client actions"},{href:"/dashboard/creative/quality",label:"Cinema",hint:"Creative review flow"}],
  MEDIA_BUYER:[{href:"/dashboard/media/control-center",label:"Cockpit",hint:"Live campaign intelligence"}],
  CREATOR:[{href:"/dashboard/creative/quality",label:"Cinema",hint:"Briefs, review & quality"}],
  CLIENT:[{href:"/dashboard/portal",label:"My VIVIT",hint:"Approvals, media & deliverables"}],
  ACCOUNTANT:[],SALES:[]
 };
 const links=[...common,...(byRole[role]||[])];
 return <nav className="vx-launcher" aria-label="VIVIT experience navigation">{links.map(x=>{const active=pathname===x.href;return <Link key={x.href} href={x.href} className={`vx-launch ${active?"is-active":""}`} title={x.hint}><span>{x.label}</span><small>{x.hint}</small></Link>})}</nav>
}
