import fs from 'node:fs';

function patch(file,replacements){let s=fs.readFileSync(file,'utf8');for(const [from,to] of replacements){if(!s.includes(from))throw new Error(`Missing anchor in ${file}: ${from.slice(0,100)}`);s=s.replace(from,to)}fs.writeFileSync(file,s)}

patch('components/layout/MobileNav.tsx',[
 ['{label:"AI & TOOLS",items:[{icon:"✨",label:"AI Assistant",href:"/dashboard/ai-studio",roles:ALL}', '{label:"AI & TOOLS",items:[{icon:"✨",label:"VIVITO",href:"/dashboard/ai-studio",roles:ALL}']
]);

patch('components/layout/Sidebar.tsx',[
 ['className={`nav-item${active === item.href ? " active" : ""}`}\n                style={{ justifyContent: collapsed ? "center" : "flex-start" }}', 'className={`nav-item${active === item.href ? " active" : ""}`}\n                aria-current={active === item.href ? "page" : undefined}\n                style={{ justifyContent: collapsed ? "center" : "flex-start" }}'],
 ['<button onClick={toggleTheme} className="sidebar-theme-button"', '<button type="button" onClick={toggleTheme} className="sidebar-theme-button"'],
 ['<button onClick={collapse} className="sidebar-collapse-button"', '<button type="button" onClick={collapse} className="sidebar-collapse-button"']
]);

patch('components/layout/OperatingSystemLauncher.tsx',[
 ['import {useState} from "react";', 'import {useEffect,useRef,useState} from "react";'],
 ['export function OperatingSystemLauncher({role}:{role:string}){const pathname=usePathname(),[open,setOpen]=useState(false);', 'export function OperatingSystemLauncher({role}:{role:string}){const pathname=usePathname(),[open,setOpen]=useState(false),buttonRef=useRef<HTMLButtonElement>(null);'],
 ['links=[...common,...(byRole[role]||[])];if(!links.length)return null;return <div className="vx-apps">', 'links=[...common,...(byRole[role]||[])];useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);requestAnimationFrame(()=>buttonRef.current?.focus())}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[open]);if(!links.length)return null;return <div className="vx-apps">'],
 ['{open&&<nav className="vx-apps-menu" aria-label="VIVIT Apps">', '{open&&<nav id="vivit-apps-menu" className="vx-apps-menu" aria-label="VIVIT Apps">'],
 ['<button className="vx-apps-btn" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Open apps">Apps</button>', '<button ref={buttonRef} type="button" className="vx-apps-btn" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="vivit-apps-menu" aria-label={open?"Close apps":"Open apps"}>Apps</button>']
]);

patch('components/layout/Header.tsx',[
 ['inputRef=useRef<HTMLInputElement>(null),timer=', 'inputRef=useRef<HTMLInputElement>(null),searchButtonRef=useRef<HTMLButtonElement>(null),timer='],
 ['useEffect(()=>{if(searchOpen)setTimeout(()=>inputRef.current?.focus(),50)},[searchOpen]);', 'useEffect(()=>{if(searchOpen)setTimeout(()=>inputRef.current?.focus(),50)},[searchOpen]);\n const closeSearch=()=>{setSearchOpen(false);requestAnimationFrame(()=>searchButtonRef.current?.focus())};'],
 ['if(e.key==="Escape")setSearchOpen(false)', 'if(e.key==="Escape"&&searchOpen)closeSearch()'],
 ['},[]);\n useEffect(()=>{if(searchOpen)', '},[searchOpen]);\n useEffect(()=>{if(searchOpen)'],
 ['<button type="button" onClick={()=>setSearchOpen(true)} className="header-search"', '<button ref={searchButtonRef} type="button" onClick={()=>setSearchOpen(true)} className="header-search"'],
 ['className="search-overlay" onClick={()=>setSearchOpen(false)}', 'className="search-overlay" onClick={closeSearch}']
]);

console.log('UI/UX interaction polish applied.');
