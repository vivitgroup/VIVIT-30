"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ROLE_WORLD:Record<string,string>={
 SUPER_ADMIN:"executive",
 ACCOUNT_MANAGER:"client-universe",
 MEDIA_BUYER:"media-cockpit",
 CREATOR:"creative-cinema",
 CLIENT:"client-portal",
 ACCOUNTANT:"finance-control",
 SALES:"growth-desk"
};

export default function ExperienceRuntime({role}:{role:string}){
 const pathname=usePathname();
 useEffect(()=>{
  const root=document.documentElement;
  const world=ROLE_WORLD[role]||"workspace";
  root.dataset.vivitExperience="v5";
  root.dataset.vivitRole=role.toLowerCase();
  root.dataset.vivitWorld=world;
  root.dataset.vivitPath=pathname||"/dashboard";
  return()=>{delete root.dataset.vivitPath};
 },[role,pathname]);
 return <div className="vivit-atmosphere" aria-hidden="true"><i className="vivit-orbit vivit-orbit-a"/><i className="vivit-orbit vivit-orbit-b"/><i className="vivit-grid-glow"/></div>
}
