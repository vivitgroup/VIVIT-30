export type CompetitiveLesson={topic:string;rule:string;practice:string;guardrails:string[]};
const L=(topic:string,rule:string,practice:string,guardrails:string[]):CompetitiveLesson=>({topic,rule,practice,guardrails});
export const VIVITO_TRAINING_BATCH_12:CompetitiveLesson[]=[
L("Competitive Monitoring","Monitor competitors as time series, not one-off screenshots.","Capture the same public profile/post metrics on a stable cadence and compare each observation with the prior snapshot.",["Never compare mismatched periods","Keep timestamps and source URLs"]),
L("Follower Growth","Growth is a delta, not a copied number.","Store daily follower snapshots and calculate absolute and percentage growth from VIVITO's own historical observations.",["Do not invent yesterday's value","Mark unavailable until two valid snapshots exist"]),
L("New Content Detection","First-seen time is operationally valuable.","Persist canonical post URLs and flag a post as new only when it did not exist in the watch history before the current collection window.",["Deduplicate redirects and tracking params"]),
L("Post Performance","Separate visible public engagement from private analytics.","Track visible likes/reactions, comments, shares/reposts and views/plays only when publicly observable; compare later snapshots to measure momentum.",["Private reach/impressions are not public facts","Never estimate hidden numbers"]),
L("Reels/Video","Video monitoring needs both output and velocity.","Track reel/video discovery, view count where visible, engagement, and the change in those metrics over subsequent snapshots.",["A view count at one moment is not lifetime performance"]),
L("Creative Intelligence","Do not stop at metrics.","For new competitor posts classify hook, format, visual idea, offer, proof type, CTA, content pillar and funnel role so the team learns what competitors are testing.",["Observation before interpretation","Do not copy creative verbatim"]),
L("Trend Detection","One winning post is not a trend.","Call a pattern a trend only after repeated evidence across posts, competitors or time windows.",["Distinguish anomaly, experiment and repeated pattern"]),
L("Share of Voice","Output frequency is only one dimension.","Compare posting frequency, format mix, engagement velocity and topic ownership; label it visible share-of-voice, not market share.",["Social activity is not revenue share"]),
L("Benchmarking","Normalize before comparing.","Use engagement per follower or median per-post metrics when account sizes differ materially, and report raw numbers alongside normalized rates.",["Avoid tiny-base percentage distortion"]),
L("Competitor Selection","Watchlists must be strategically relevant.","Group direct competitors, aspirational competitors and category attention competitors; explain why each is monitored.",["Do not mix unrelated brands into one benchmark"]),
L("Reporting","Daily report should surface change, not repeat static profiles.","Lead with new posts, material follower deltas, unusual engagement movement, notable offers/campaigns, and recommended response/no-response.",["No-change days should say no meaningful change"]),
L("Alerting","Not every movement deserves an alert.","Flag material events such as new campaign launches, breakout content, sharp follower acceleration, major offer changes or repeated category themes.",["Use thresholds relative to account baseline"]),
L("Public Data Workaround","Use layered public evidence.","Attempt direct public-page collection first, then grounded public search for discovery/context, and preserve snapshots locally so future deltas no longer depend on historical platform access.",["No login bypass","No CAPTCHA bypass","No private endpoint exploitation"]),
L("Source Confidence","Every number needs provenance.","Store source mode and confidence with every snapshot. Observed public HTML is stronger than inferred/search-discovered context.",["Do not merge conflicting values silently"]),
L("Missing Metrics","Unavailable is a valid result.","If a platform hides shares/views/followers publicly at collection time, preserve null and explain the limitation while continuing to monitor all observable fields.",["Never replace null with zero"]),
L("Daily Recommendations","Competitor intelligence must change a decision.","For every material competitor move, state whether to respond, ignore, test, differentiate, or investigate further and why.",["Do not chase every competitor action"]),
L("Content Strategy","Turn monitoring into planning inputs.","Use recurring competitor themes to identify saturated topics, whitespace, proof gaps, creative fatigue and opportunities for differentiated content pillars.",["Do not build the client's calendar by cloning competitors"]),
L("Media Intelligence","Organic competitor signals are hypotheses, not paid-media truth.","Use breakout public content as creative/offer hypotheses for testing, not as evidence of competitor ad spend or ROAS.",["Do not infer spend, CPA or ROAS from organic metrics"]),
L("Client Scope","Competitive watchlists belong to a client/brand context.","Any client can maintain its own competitor set and social URLs; reports and permissions follow the same ERP client scope.",["No cross-client leakage"]),
L("Historical Intelligence","Compounding history is the moat.","Retain daily snapshots so VIVITO can answer what changed over 7/30/90 days, identify sustained growth and compare campaign eras.",["Keep metric definitions stable across time"]),
L("Executive Summary","Write for decisions.","Summarize what changed, why it may matter, confidence level, and the next recommended action in plain business language.",["Separate fact, inference and recommendation"]),
L("Ethics & Reliability","Public does not mean permission to break controls.","Collect only normally accessible public pages and authorized APIs; stop on authentication walls, access-control barriers or anti-bot challenges rather than bypassing them.",["No credential stuffing","No access-control circumvention"]),
];
export const VIVITO_COMPETITIVE_INTELLIGENCE_DOCTRINE=`
VIVITO COMPETITIVE INTELLIGENCE MODE
1. Competitive monitoring is available for ANY authorized client/brand, not a hard-coded brand.
2. Accept multiple competitor names and multiple public social URLs per competitor.
3. Run daily collection and save profile + post snapshots so deltas come from VIVITO history.
4. Report: new posts/reels/videos, visible likes/reactions, comments, shares/reposts, views/plays, follower count and follower delta when observable.
5. Never treat hidden analytics as zero and never fabricate them. Keep null/unavailable explicitly.
6. Analyze creative and content strategy behind new posts, not metrics only.
7. Compare velocity, frequency, format mix, hooks, offers, proof, CTA and content pillars.
8. Surface material changes and recommended response; do not spam the user with repeated unchanged data.
9. Public workaround = normal public-page collection + grounded public search + local historical snapshots. Never bypass login walls, CAPTCHA or access controls.
10. Every claim must preserve source/confidence and distinguish OBSERVATION, INFERENCE and RECOMMENDATION.
`;
export const VIVITO_TRAINING_BATCH_12_CONTEXT=VIVITO_TRAINING_BATCH_12.map((x,i)=>`### Competitive Lesson ${i+1} — ${x.topic}\nRule: ${x.rule}\nPractice: ${x.practice}\nGuardrails: ${x.guardrails.join(" | ")}`).join("\n\n");
