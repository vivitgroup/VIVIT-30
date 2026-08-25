import {MetaAccountConnectPanel} from "@/components/media/MetaAccountConnectPanel";
import {MediaIntelligenceWorkspaceV2} from "@/components/media/MediaIntelligenceWorkspaceV2";

export const dynamic="force-dynamic";

export default function MediaControlCenter(){
 return <div className="vx-world vx-media-cockpit" style={{display:"grid",gap:16}}>
  <header className="vx-world-hero"><div><span className="eyebrow">LIVE MEDIA COCKPIT</span><h1 className="page-title">Campaign Intelligence</h1><p className="page-subtitle">Spend, outcomes, anomalies and the next decision — in one live operating view.</p></div><div className="vx-live-chip"><i/>LIVE SYNC</div></header>
  <MetaAccountConnectPanel/>
  <MediaIntelligenceWorkspaceV2/>
 </div>
}
