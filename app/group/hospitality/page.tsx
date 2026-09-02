import Link from "next/link";

const modules=[
  ["Owners","Owner profiles, statements and property access"],
  ["Properties","Units, assets, contracts and channel mappings"],
  ["Reservations","Booking calendar and sync-ready reservation flow"],
  ["Finance","Revenue, fees, expenses, invoices and owner net"],
  ["Maintenance","Work orders, vendors, POs and before/after evidence"],
  ["Inventory","Property stock and operational adjustments"],
];

export default function HospitalityHome(){return <main style={{minHeight:"100vh",background:"linear-gradient(145deg,#0b0a08,#17130c)",color:"#f8f4ea",padding:"32px 22px",fontFamily:"Inter,system-ui,sans-serif"}}><section style={{maxWidth:1180,margin:"0 auto"}}><Link href="/group" style={{color:"#cdb277",textDecoration:"none",fontWeight:800}}>← Vivit Group</Link><div style={{margin:"42px 0 34px"}}><div style={{fontSize:12,letterSpacing:".18em",fontWeight:900,color:"#b89a58"}}>VIVIT HOSPITALITY</div><h1 style={{fontSize:"clamp(38px,6vw,68px)",letterSpacing:"-.055em",margin:"10px 0"}}>Hospitality Operations</h1><p style={{color:"#b9ad94",maxWidth:720,lineHeight:1.7}}>Luxury-facing owner experience backed by strict operational, finance and audit controls.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>{modules.map(([name,desc])=><article key={name} style={{padding:24,minHeight:170,borderRadius:24,border:"1px solid #3a3222",background:"linear-gradient(160deg,rgba(205,178,119,.10),rgba(255,255,255,.025))"}}><h2 style={{fontSize:22,margin:"0 0 10px"}}>{name}</h2><p style={{color:"#b7aa91",lineHeight:1.6,margin:0}}>{desc}</p></article>)}</div></section></main>}
