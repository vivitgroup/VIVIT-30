export const VIVITO_SOURCE_NOTES_BATCH_04=[
 {domain:"Google Ads & Smart Bidding",source:"Google Ads Help",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://support.google.com/google-ads/answer/11095984?hl=en",lessons:[
  "Starting in June 2026, Google Ads began simplifying Search Smart Bidding labels: Target CPA and Target ROAS naming may appear where older interfaces described Maximize conversions/value with targets; the underlying bidding behavior did not change merely because the label changed.",
  "Choose the bid strategy from the business objective: conversion-volume goals align with Maximize conversions/Target CPA, while value or profit-oriented goals align with Maximize conversion value/Target ROAS when conversion values are trustworthy.",
  "Smart Bidding optimizes at auction time using contextual signals; manual micro-adjustments should not be layered on reflexively when an automated strategy is already using those signals.",
  "Do not diagnose an automated bidding strategy from a short noisy window alone; evaluate it against the configured conversion goal, economics and a meaningful learning period."
 ]},
 {domain:"Google Ads & Value-Based Bidding",source:"Google Ads Help",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://support.google.com/google-ads/answer/15099424?hl=en",lessons:[
  "Value-based bidding is appropriate only when the business can report meaningful differences in conversion value; optimizing to value is different from simply maximizing conversion count.",
  "For value-based bidding, Google recommends reporting at least two different values and selecting a sensible stage in the lead-to-sale journey for optimization rather than mixing unrelated stages.",
  "If the final sale is too delayed to provide usable bidding signal, an earlier qualified outcome can be used when it is a credible proxy for business value.",
  "When changing the optimization goal, stabilize measurement and the new conversion goal before applying value constraints; do not combine a goal migration and aggressive bid-strategy change without enough signal.",
  "Target ROAS constraints should reflect realistic economics and sufficient conversion volume; overly aggressive targets can restrict delivery instead of creating profitable scale."
 ]},
 {domain:"GA4 Measurement Integrity",source:"Google Analytics Help",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://support.google.com/analytics/answer/12571843?hl=en",lessons:[
  "A GA4 key event should represent an action that is genuinely important to the business, not every tracked interaction.",
  "Before using a key event to judge campaigns or feed optimization, verify that it fires correctly in Realtime and DebugView under the intended user action.",
  "Event naming, trigger conditions and business definitions should be documented so Ads, Analytics and backend outcomes can be reconciled consistently.",
  "A dashboard displaying a conversion number is not proof that measurement is correct; validation of the trigger and downstream business record comes first."
 ]},
 {domain:"GA4 Attribution",source:"Google Analytics Help",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://support.google.com/analytics/answer/12958241?hl=en",lessons:[
  "Attribution assigns credit across marketing touchpoints; it is not the same thing as a raw backend count of completed business outcomes.",
  "GA4 uses data-driven attribution by default for many reporting contexts, so platform/channel credit can differ from last-click or backend reporting without either number automatically being fraudulent.",
  "Attribution settings and models must be named when comparing reports; do not compare two attributed numbers as though they share the same credit rules.",
  "GA4 attribution credit can be revised after an event as modeling and processing complete, so very recent attributed performance should not always be treated as immutable final data."
 ]},
 {domain:"TikTok Performance Creative",source:"TikTok for Business",sourceType:"official",published:"2026-07",confidence:0.98,url:"https://ads.tiktok.com/business/en/guides/what-is-ad-creative-guide",lessons:[
  "TikTok performance creative should feel native to the platform: short, authentic, easy to understand and designed for repeated testing rather than one polished master asset.",
  "The opening seconds need a clear hook and relevant problem, desire or payoff; watch time and engagement can diagnose attention while conversion metrics determine commercial effectiveness.",
  "Use captions and accessible on-screen communication so the core message remains understandable across viewing conditions.",
  "When CTR or engagement deteriorates as an asset ages, creative fatigue is a testable hypothesis; refresh the hook, angle, proof or execution rather than only increasing budget.",
  "TikTok Creative Center and Top Ads are research tools for patterns and inspiration; extract the mechanism behind a strong ad instead of cloning its surface execution."
 ]},
 {domain:"LinkedIn B2B Lead Generation",source:"LinkedIn Marketing Solutions",sourceType:"official",published:"2025-08-19",confidence:0.97,url:"https://www.linkedin.com/business/marketing/blog/lead-generation/how-to-use-linkedin-lead-gen-forms",lessons:[
  "Lead Gen Forms reduce form friction by prefilling professional profile data, but lower friction should not be confused with lead quality; downstream qualification still matters.",
  "Keep lead forms focused on the information genuinely required for follow-up; LinkedIn recommends roughly three to four fields and warns that manual-input questions can reduce completion.",
  "Ad promise, form copy, CTA and confirmation experience should describe the same offer so the user does not experience a promise-to-delivery mismatch.",
  "Measure lead generation with lead volume, form completion, CPL and—where CRM data exists—qualified pipeline or revenue outcomes rather than CPL alone.",
  "Operationally, export or sync lead data to the CRM promptly; platform lead data is not a substitute for a durable owned follow-up process."
 ]},
 {domain:"CRM Lifecycle & Sales Handoff",source:"HubSpot Knowledge Base",sourceType:"official",published:"2026-07-17",confidence:0.98,url:"https://knowledge.hubspot.com/records/use-lifecycle-stages",lessons:[
  "Lifecycle stages should make the marketing-to-sales/customer journey explicit so teams know where a contact or company sits in the operating process.",
  "Stage definitions need objective entry/exit criteria; a stage name without a measurable meaning does not create a reliable funnel.",
  "Automated stage updates can improve consistency, but the workflow should preserve the business meaning of the stage rather than advance records merely because an activity occurred.",
  "Track stage changes over time so handoff delays, stalled leads and conversion leakage can be diagnosed instead of relying on memory or anecdotal follow-up.",
  "A clean CRM handoff includes lifecycle stage, owner, latest context and next action; marketing success should ultimately connect to qualified progression, not only raw lead creation."
 ]}
] as const;

export const VIVITO_SOURCE_NOTES_BATCH_04_CONTEXT=VIVITO_SOURCE_NOTES_BATCH_04.map(n=>`### ${n.domain} — ${n.source}\nType: ${n.sourceType}; confidence: ${Math.round(n.confidence*100)}%; published: ${n.published}\n${n.lessons.map(x=>`- ${x}`).join("\n")}`).join("\n\n");
