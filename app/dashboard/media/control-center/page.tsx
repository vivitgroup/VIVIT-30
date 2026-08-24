import {MetaAccountConnectPanel} from "@/components/media/MetaAccountConnectPanel";
import {MediaIntelligenceWorkspaceV2} from "@/components/media/MediaIntelligenceWorkspaceV2";

// Production rollout marker: Meta connect + account discovery + sync-all.
export const dynamic="force-dynamic";

export default function MediaControlCenter(){
 return <div style={{display:"grid",gap:12}}>
  <MetaAccountConnectPanel/>
  <MediaIntelligenceWorkspaceV2/>
 </div>
}
