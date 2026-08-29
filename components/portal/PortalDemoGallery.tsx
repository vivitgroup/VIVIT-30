import Image from "next/image";

const demo=[
 {image:"/portal-preview-1.svg",title:"Campaign Launch Reel",type:"REEL",platform:"Instagram",caption:"Sample launch content ready for client review."},
 {image:"/portal-preview-2.svg",title:"Brand Story Static",type:"GRAPHIC",platform:"Facebook",caption:"A sample static showing how approved artwork will appear."},
 {image:"/portal-preview-3.svg",title:"3 Tips Carousel",type:"CAROUSEL",platform:"Instagram",caption:"Carousel preview with caption, platform and approval state."}
];
export function PortalDemoGallery(){return <>{demo.map((c,i)=><article className="ig-card" key={c.title}><div className="ig-media" style={{position:"relative"}}><Image src={c.image} alt={`Demo creative ${i+1}`} fill sizes="(max-width: 700px) 100vw, 33vw" style={{objectFit:"cover"}}/></div><div style={{padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><b style={{fontSize:13}}>{c.title}</b><span className="badge badge-blue">{c.type}</span></div><p style={{fontSize:12,lineHeight:1.55,color:"var(--text-secondary)",marginTop:8}}>{c.caption}</p><p style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>📅 Demo date · {c.platform}</p><div style={{marginTop:10,padding:9,borderRadius:9,background:"#fff7ed",color:"#9a3412",fontWeight:800,fontSize:11}}>Demo preview — real approved creative will replace this</div></div></article>)}</>}
