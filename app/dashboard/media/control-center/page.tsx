import Link from "next/link";
import {MetaAccountConnectPanel} from "@/components/media/MetaAccountConnectPanel";
import {MediaCampaignFirstView} from "@/components/media/MediaCampaignFirstView";
import MediaAutoSync from "@/components/media/MediaAutoSync";

export const dynamic="force-dynamic";

export default function MediaControlCenter(){
 return <div className="vx-world vx-media-cockpit" data-certified-workspace="MediaIntelligenceWorkspaceV2" style={{display:"grid",gap:14,minWidth:0,overflow:"hidden"}}>
  <MediaAutoSync/>
  <style>{`@media(max-width:900px){.vx-media-cockpit .vx-world-hero{padding:14px!important;border-radius:18px!important}.vx-media-cockpit .page-title{font-size:clamp(24px,8vw,34px)!important;line-height:1.05!important;overflow-wrap:anywhere}.vx-media-cockpit .page-subtitle{font-size:13px!important;line-height:1.45!important}.vx-media-cockpit .btn{min-height:42px}.vx-media-cockpit{padding-bottom:100px}}@media(min-width:901px){.vx-media-cockpit{max-width:1600px;margin:0 auto;width:100%}}`}</style>
  <header className="vx-world-hero" style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}><div style={{minWidth:0}}><span className="eyebrow">VIVIT MEDIA INTELLIGENCE</span><h1 className="page-title">Media Buying Control Center</h1><p className="page-subtitle">Campaigns first. Live intelligence self-heals automatically and refreshes as soon as fresh data lands.</p></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><Link href="/dashboard/marketing-lifecycle" className="btn btn-secondary" style={{textDecoration:"none"}}>Manage clients & campaigns</Link><div className="vx-live-chip"><i/>LIVE · DB</div></div></header>
  <MetaAccountConnectPanel/>
  <MediaCampaignFirstView/>
 </div>
}
