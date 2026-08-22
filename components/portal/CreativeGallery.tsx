"use client";

import { useState } from "react";

type Creative = { id:string; title:string; type:string; status:string; fileUrl:string|null };

function isVideo(url:string,type:string){
  return type==="VIDEO_EDIT" || type==="REEL" || type==="MOTION_GRAPHIC" || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function CreativeGallery({items}:{items:Creative[]}){
  const [active,setActive]=useState<Creative|null>(null);
  if(!items.length)return null;
  return <section id="creative-gallery" className="card" style={{borderTop:"3px solid var(--purple)",scrollMarginTop:90}}>
    <div className="card-header"><div><p className="card-title">🎨 Creative Gallery</p><p style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>Click any creative to open the full image or video.</p></div><span className="badge badge-blue">{items.length}</span></div>
    <div className="card-body" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
      {items.map(item=>{
        const video=item.fileUrl?isVideo(item.fileUrl,item.type):false;
        return <button key={item.id} type="button" onClick={()=>item.fileUrl&&setActive(item)} disabled={!item.fileUrl} style={{padding:0,textAlign:"left",border:"1px solid var(--card-border)",borderRadius:14,overflow:"hidden",background:"var(--bg-tertiary)",cursor:item.fileUrl?"pointer":"default",color:"inherit"}}>
          <div style={{height:180,background:"#101827",display:"grid",placeItems:"center",overflow:"hidden"}}>
            {item.fileUrl?(video?<video src={item.fileUrl} muted playsInline preload="metadata" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<img src={item.fileUrl} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>):<span style={{fontSize:38}}>🎨</span>}
          </div>
          <div style={{padding:12}}><strong style={{display:"block",fontSize:13}}>{item.title}</strong><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}><span style={{fontSize:11,color:"var(--text-muted)"}}>{video?"▶ Video":"🖼 Image"}</span><span className="badge badge-blue">{item.status}</span></div></div>
        </button>;
      })}
    </div>
    {active&&active.fileUrl&&<div role="dialog" aria-modal="true" aria-label={active.title} onClick={()=>setActive(null)} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,10,22,.88)",display:"grid",placeItems:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"min(960px,96vw)",maxHeight:"92vh",background:"var(--bg-secondary)",borderRadius:18,overflow:"hidden",boxShadow:"0 28px 90px rgba(0,0,0,.45)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid var(--card-border)"}}><strong>{active.title}</strong><button onClick={()=>setActive(null)} className="btn btn-ghost btn-sm">✕ Close</button></div>
        <div style={{display:"grid",placeItems:"center",background:"#070b14",maxHeight:"78vh"}}>{isVideo(active.fileUrl,active.type)?<video src={active.fileUrl} controls autoPlay playsInline style={{maxWidth:"100%",maxHeight:"78vh"}}/>:<img src={active.fileUrl} alt={active.title} style={{maxWidth:"100%",maxHeight:"78vh",objectFit:"contain"}}/>}</div>
      </div>
    </div>}
  </section>;
}
