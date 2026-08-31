import fs from 'node:fs';
import path from 'node:path';

const walk=(d,out=[])=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name);if(ent.isDirectory())walk(p,out);else if(/\.(tsx|jsx)$/.test(ent.name))out.push(p)}return out};
for(const file of [...walk('app'),...walk('components')]){
  let s=fs.readFileSync(file,'utf8');
  s=s.replace(/target="_blank"(?![^>]*\brel=)/g,'target="_blank" rel="noopener noreferrer"');
  fs.writeFileSync(file,s);
}

function patch(file,replacements){let s=fs.readFileSync(file,'utf8');for(const [from,to] of replacements){if(!s.includes(from))throw new Error(`Missing patch anchor in ${file}: ${from.slice(0,80)}`);s=s.replace(from,to)}fs.writeFileSync(file,s)}

patch('components/layout/Header.tsx',[
 ['<button onClick={()=>setSearchOpen(true)} className="header-search">','<button type="button" onClick={()=>setSearchOpen(true)} className="header-search" aria-label="Open global search">'],
 ['<button onClick={exportCSV} className="btn btn-ghost btn-sm btn-icon header-export" title="Export CSV">','<button type="button" onClick={exportCSV} className="btn btn-ghost btn-sm btn-icon header-export" title="Export CSV" aria-label="Export visible table as CSV">'],
 ['<div onClick={e=>e.stopPropagation()} style={{width:"min(580px,90vw)"','<div role="dialog" aria-modal="true" aria-label="Global search" onClick={e=>e.stopPropagation()} style={{width:"min(580px,90vw)"'],
 ['placeholder="Search clients, tasks, leads..." style={{flex:1','placeholder="Search clients, tasks, leads..." aria-label="Search clients, tasks, leads and more" style={{flex:1'],
 ['{query&&<button onClick={()=>{setQuery("");setResults([])}} className="btn btn-ghost btn-sm">×</button>}','{query&&<button type="button" aria-label="Clear search" onClick={()=>{setQuery("");setResults([])}} className="btn btn-ghost btn-sm">×</button>}'],
 ['results.map((r,i)=><button key={i} onClick={()=>select(r)}','results.map((r,i)=><button type="button" key={i} onClick={()=>select(r)}'],
 ['history.map(h=><button key={h} onClick={()=>{setQuery(h);doSearch(h)}}','history.map(h=><button type="button" key={h} onClick={()=>{setQuery(h);doSearch(h)}}']
]);

patch('components/keyboard-shortcuts.tsx',[
 ['<button onClick={() => setOpen(true)} title="Keyboard shortcuts (?)"','<button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Open keyboard shortcuts" title="Keyboard shortcuts (?)"'],
 ['padding:"6px 10px",cursor:"pointer"','padding:"6px 10px",minHeight:"44px",cursor:"pointer"'],
 ['<div style={{background:"#0D1A2E"','<div role="dialog" aria-modal="true" aria-labelledby="keyboard-shortcuts-title" style={{background:"#0D1A2E"'],
 ['<h2 style={{fontFamily:"Inter,sans-serif"','<h2 id="keyboard-shortcuts-title" style={{fontFamily:"Inter,sans-serif"'],
 ['<button onClick={toggleTheme} style={{background:','<button type="button" onClick={toggleTheme} aria-label="Toggle light or dark theme" style={{background:'],
 ['<button onClick={()=>setOpen(false)} style={{background:"none"','<button type="button" onClick={()=>setOpen(false)} aria-label="Close keyboard shortcuts" style={{background:"none"']
]);

patch('components/clients/ClientLogoManager.tsx',[
 ['<div onClick={e=>e.stopPropagation()} style={{width:"min(500px,96vw)"','<div role="dialog" aria-modal="true" aria-labelledby="client-identity-title" onClick={e=>e.stopPropagation()} style={{width:"min(500px,96vw)"'],
 ['<h3 style={{margin:0}}>Client identity</h3>','<h3 id="client-identity-title" style={{margin:0}}>Client identity</h3>'],
 ['<button onClick={()=>setOpen(false)} className="btn btn-ghost btn-sm">×</button>','<button type="button" aria-label="Close client identity" onClick={()=>setOpen(false)} className="btn btn-ghost btn-sm">×</button>'],
 ['<button onClick={save} disabled={busy} className="btn btn-primary"','<button type="button" onClick={save} disabled={busy} className="btn btn-primary"'],
 ['<button onClick={()=>setOpen(false)} className="btn btn-secondary">Cancel</button>','<button type="button" onClick={()=>setOpen(false)} className="btn btn-secondary">Cancel</button>'],
 ['<button onClick={()=>canEdit&&setOpen(true)} aria-label="Edit client identity"','<button type="button" onClick={()=>canEdit&&setOpen(true)} aria-label="Edit client identity"'],
 ['target="_blank" rel="noreferrer" title={l} style={{width:27,height:27','target="_blank" rel="noopener noreferrer" title={l} aria-label={`Open ${l}`} style={{width:44,height:44']
]);

console.log('HTML accessibility patches applied.');
