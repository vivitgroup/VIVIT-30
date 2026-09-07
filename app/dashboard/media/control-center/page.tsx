import Link from "next/link";
import {MetaAccountConnectPanel} from "@/components/media/MetaAccountConnectPanel";
import {MediaIntelligenceWorkspaceV2} from "@/components/media/MediaIntelligenceWorkspaceV2";

export const dynamic="force-dynamic";

export default function MediaControlCenter(){
 return <div className="vx-world vx-media-cockpit" style={{display:"grid",gap:16,minWidth:0}}>
  <header className="vx-world-hero" style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}><div><span className="eyebrow">LIVE MEDIA COCKPIT</span><h1 className="page-title">Campaign Intelligence</h1><p className="page-subtitle">Spend, outcomes, anomalies and the next decision — in one live operating view.</p></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><Link href="/dashboard/marketing-lifecycle" className="btn btn-secondary" style={{textDecoration:"none"}}>Manage clients & campaigns</Link><div className="vx-live-chip"><i/>LIVE SYNC</div></div></header>
  <MetaAccountConnectPanel/>
  <MediaIntelligenceWorkspaceV2/>
 </div>
}
