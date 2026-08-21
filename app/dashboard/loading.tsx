export default function DashboardLoading() {
  return (
    <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:"16px"}}>
      {/* KPI skeleton */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{height:"110px",borderRadius:"14px",overflow:"hidden",border:"1px solid var(--card-border)"}}>
            <div className="skeleton" style={{height:"3px",borderRadius:0}}/>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:"10px"}}>
              <div className="skeleton" style={{height:"11px",width:"60%",borderRadius:"4px"}}/>
              <div className="skeleton" style={{height:"30px",width:"80%",borderRadius:"6px"}}/>
              <div className="skeleton" style={{height:"11px",width:"40%",borderRadius:"4px"}}/>
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>
        <div style={{height:"280px",borderRadius:"14px",border:"1px solid var(--card-border)",overflow:"hidden"}}>
          <div style={{height:"53px",borderBottom:"1px solid var(--card-border)",padding:"16px 20px",display:"flex",alignItems:"center",gap:"8px"}}>
            <div className="skeleton" style={{height:"14px",width:"160px",borderRadius:"4px"}}/>
          </div>
          <div className="skeleton" style={{margin:"20px",height:"190px",borderRadius:"8px"}}/>
        </div>
        <div style={{height:"280px",borderRadius:"14px",border:"1px solid var(--card-border)",overflow:"hidden"}}>
          <div style={{height:"53px",borderBottom:"1px solid var(--card-border)",padding:"16px 20px",display:"flex",alignItems:"center",gap:"8px"}}>
            <div className="skeleton" style={{height:"14px",width:"120px",borderRadius:"4px"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"center",padding:"24px"}}>
            <div className="skeleton" style={{width:"160px",height:"160px",borderRadius:"50%"}}/>
          </div>
        </div>
      </div>
      {/* Table skeleton */}
      <div style={{borderRadius:"14px",border:"1px solid var(--card-border)",overflow:"hidden"}}>
        <div style={{height:"53px",borderBottom:"1px solid var(--card-border)",padding:"16px 20px",background:"var(--card-bg)",display:"flex",alignItems:"center"}}>
          <div className="skeleton" style={{height:"14px",width:"140px",borderRadius:"4px"}}/>
        </div>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{padding:"13px 16px",borderBottom:"1px solid var(--card-border)",display:"flex",gap:"16px",alignItems:"center"}}>
            <div className="skeleton" style={{height:"13px",width:"200px",borderRadius:"4px"}}/>
            <div className="skeleton" style={{height:"13px",width:"120px",borderRadius:"4px"}}/>
            <div className="skeleton" style={{height:"13px",width:"80px",borderRadius:"4px",marginLeft:"auto"}}/>
          </div>
        ))}
      </div>
    </div>
  );
}
