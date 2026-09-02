export const VGROUP_PINNED_MARKETING_SHA="b66542a3cfee8d5d54299450e8bc6a79b2a51062";

export type MarketingIntegrationState={
  enabled:boolean;
  candidateSha:string;
  certified:boolean;
};

export function getMarketingIntegrationState():MarketingIntegrationState{
  const enabled=process.env.VGROUP_MARKETING_INTEGRATION_ENABLED==="true";
  const candidateSha=(process.env.VGROUP_MARKETING_CANDIDATE_SHA||VGROUP_PINNED_MARKETING_SHA).trim();
  const certified=candidateSha===VGROUP_PINNED_MARKETING_SHA;
  if(enabled&&!certified)throw new Error("Marketing candidate SHA changed; re-certification required");
  return {enabled,candidateSha,certified};
}
