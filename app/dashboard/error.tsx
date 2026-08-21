"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({ error, reset }: { error:Error; reset:()=>void }) {
  useEffect(() => { console.error("Dashboard error:", error); }, [error]);

  const isDBError = error.message?.includes("connection") || error.message?.includes("postgres") || error.message?.includes("timeout");

  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:"80px 24px",textAlign:"center",
      maxWidth:"480px",margin:"0 auto"
    }}>
      <div style={{fontSize:"48px",marginBottom:"16px",animation:"floatBob 3s ease-in-out infinite"}}>
        {isDBError ? "🔌" : "⚠️"}
      </div>
      <h2 style={{fontFamily:"Sora,sans-serif",fontSize:"1.375rem",fontWeight:800,color:"var(--text-primary)",marginBottom:"8px",letterSpacing:"-0.02em"}}>
        {isDBError ? "Connection Error" : "Something went wrong"}
      </h2>
      <p style={{color:"var(--text-muted)",fontSize:"14px",lineHeight:1.7,marginBottom:"24px"}}>
        {isDBError
          ? "Can't reach the database. Check your DATABASE_URL in environment variables (must use port 6543)."
          : error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={reset} className="btn btn-primary">
          ↺ Try Again
        </button>
        <Link href="/dashboard" className="btn btn-ghost" style={{textDecoration:"none"}}>
          ← Back to Dashboard
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details style={{marginTop:"24px",textAlign:"left",width:"100%"}}>
          <summary style={{fontSize:"12px",color:"var(--text-muted)",cursor:"pointer",marginBottom:"8px"}}>Error details</summary>
          <pre style={{fontSize:"11px",color:"var(--red)",background:"var(--red-bg)",padding:"12px",borderRadius:"8px",overflow:"auto",maxHeight:"200px",fontFamily:"JetBrains Mono,monospace"}}>
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
