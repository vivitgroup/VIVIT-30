export type MediaMetrics={
  [key:string]:unknown;
  spend?:unknown;results?:unknown;purchases?:unknown;revenue?:unknown;impressions?:unknown;clicks?:unknown;reach?:unknown;addToCart?:unknown;
  ctr?:unknown;cpm?:unknown;cpc?:unknown;costPerResult?:unknown;roas?:unknown;frequency?:unknown;resultKind?:string|null;resultLabel?:string|null;
};
export type MediaMetricCarrier={metrics?:MediaMetrics};
export type MediaMetricTotals={spend:number;results:number;purchases:number;revenue:number;impressions:number;clicks:number;reach:number;addToCart:number;ctr?:number;cpm?:number;costPerResult?:number;roas?:number;frequency?:number};
export type MediaAd={id:string;externalId?:string|null;name?:string|null;status?:string|null;metrics?:MediaMetrics};
export type MediaAdSet={id:string;externalId?:string|null;name?:string|null;status?:string|null;metrics?:MediaMetrics;ads?:MediaAd[]};
export type MediaCampaign={id:string;connectionId?:string|null;platform?:string|null;clientName?:string|null;name?:string|null;externalId?:string|null;metricSource?:string|null;currency?:string|null;metrics?:MediaMetrics;previousMetrics?:MediaMetrics;adSets?:MediaAdSet[];reportedResultLabel?:string|null};
export type MediaAccountGroup={id:string;platform?:string|null;clientName?:string|null;accountName?:string|null;adAccountId?:string|null;campaignCount?:number;currency?:string|null;metrics?:MediaMetrics;previousMetrics?:MediaMetrics;campaigns?:MediaCampaign[]};
export type MediaRange={start?:string;end?:string};
export type MediaControlData={campaigns:MediaCampaign[];accountGroups:MediaAccountGroup[];archivedCampaigns:MediaCampaign[];range:MediaRange;compareRange?:MediaRange;access?:Record<string,unknown>;error?:string};
export type MediaPortfolioHistory={portfolio:MediaMetrics;accounts:Record<string,MediaMetrics>;archivedSpend:number;archivedCampaigns:number;error?:string};
