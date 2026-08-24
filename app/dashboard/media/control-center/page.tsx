import Link from "next/link";
import {MediaIntelligenceWorkspaceV2} from "@/components/media/MediaIntelligenceWorkspaceV2";

export const dynamic="force-dynamic";

export default function MediaControlCenter(){
 return <div style={{display:"grid",gap:12}}>
  <div className="card" style={{padding:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",border:"1px solid rgba(59,130,246,.25)"}}>
   <div>
    <div style={{fontWeight:900}}>Ad account connection & campaign sync</div>
    <div className="page-subtitle" style={{margin:0}}>Authorize Meta/TikTok accounts, connect campaign IDs, and run live sync from one place.</div>
   </div>
   <Link href="/dashboard/media/sync" className="btn btn-primary" style={{textDecoration:"none"}}>Connect / Sync Accounts →</Link>
  </div>
  <MediaIntelligenceWorkspaceV2/>
 </div>
}
