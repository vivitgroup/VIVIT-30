import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{minHeight:"100vh",background:"#0B1220",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"24px",padding:"40px",textAlign:"center",fontFamily:"Inter,sans-serif"}}>
      {/* Logo */}
      <div style={{width:"56px",height:"56px",borderRadius:"16px",background:"linear-gradient(135deg,#17345F,#244D87)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"8px"}}>
        <svg width="28" height="28" viewBox="0 0 44 44" fill="none"><path d="M4 8 L22 36 L40 8" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      {/* 404 */}
      <div style={{fontSize:"96px",fontWeight:900,background:"linear-gradient(135deg,#244D87,#00B4D8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>404</div>
      <h1 style={{fontSize:"24px",fontWeight:700,color:"#F0F8FF",margin:0}}>Page not found</h1>
      <p style={{color:"#6B8FAF",fontSize:"15px",maxWidth:"380px",lineHeight:1.6,margin:0}}>
        The page you are looking for doesn&apos;t exist or has been moved. Check the URL or navigate back to the dashboard.
      </p>
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap",justifyContent:"center",marginTop:"8px"}}>
        <Link href="/dashboard" style={{padding:"12px 28px",borderRadius:"10px",background:"linear-gradient(135deg,#244D87,#00B4D8)",color:"white",textDecoration:"none",fontSize:"14px",fontWeight:700}}>
          ← Back to Dashboard
        </Link>
        <Link href="/login" style={{padding:"12px 28px",borderRadius:"10px",border:"1px solid rgba(0,119,182,0.35)",color:"#00B4D8",textDecoration:"none",fontSize:"14px",fontWeight:600}}>
          Go to Login
        </Link>
      </div>
      <p style={{color:"#2A4060",fontSize:"12px",marginTop:"8px"}}>VIVIT ERP · Technology builds the future, Marketing brings it to the world.</p>
    </div>
  );
}
