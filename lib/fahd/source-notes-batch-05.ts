export const FAHD_SOURCE_NOTES_BATCH_05=[
 {domain:"Meta Advantage+ Sales",source:"Meta Blueprint",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://www.facebookblueprint.com/student/path/253126-advantage-plus-sales-course",lessons:[
  "Advantage+ sales campaigns are an end-to-end automation system that uses Meta AI to optimize campaign delivery in real time; automation should be judged against business outcomes, not by how many manual controls were removed.",
  "Strong Advantage+ setup still depends on sound business inputs: reliable conversion data, sufficiently diverse creative and clear campaign measurement.",
  "Do not treat Advantage+ as permission to stop testing. Use controlled tests to measure effectiveness and compare meaningful strategy changes.",
  "When performance changes, diagnose the conversion signal, creative mix, economics and measurement before assuming automation itself is the root cause."
 ]},
 {domain:"Meta New-Customer Acquisition",source:"Meta for Business",sourceType:"official",published:"2026-02-10",confidence:0.99,url:"https://www.youtube.com/watch?v=-JHTDBW30_s",lessons:[
  "For growth objectives that specifically require net-new customers, campaign configuration should distinguish existing customers from prospects rather than reporting all purchases as equivalent acquisition.",
  "Existing-customer exclusions or customer definitions must be based on trustworthy first-party data; weak customer lists can make new-customer reporting misleading.",
  "Budget, audience guidance and placement controls are steering inputs, but the commercial KPI should remain incremental or net-new customer value where the business can measure it.",
  "A lower platform CPA is not automatically better if the campaign shifts spend toward customers who would have purchased anyway."
 ]},
 {domain:"Meta Creative Diversification",source:"Meta Blueprint",sourceType:"official",published:"2026-03-26",confidence:0.99,url:"https://www.facebookblueprint.com/student/page/705435-ad-creative-that-converts-how-to-diversify-your-ads-for-better-results",lessons:[
  "Creative diversification means giving the delivery system genuinely different images, videos, messages, concepts and formats so it can match relevant creative to different people.",
  "Diversify by strategic concept and customer motivator, not only by changing colors, crops or minor copy details.",
  "A creative test should label the hypothesis being varied—such as problem, benefit, proof, founder story, objection, offer or format—so learning can be reused.",
  "When one concept wins, expand it into controlled variants while preserving enough difference to test a new hypothesis and manage fatigue."
 ]},
 {domain:"Meta Reels Advertising",source:"Meta for Business",sourceType:"official",published:"2026-08",confidence:0.98,url:"https://www.facebook.com/business/ads/facebook-instagram-reels-ads",lessons:[
  "Advantage+ placements can let Meta distribute Reels ads alongside other placements; when placements are selected manually, Meta recommends using multiple eligible placements rather than over-restricting delivery.",
  "Creative should be adapted for Reels rather than relying on a desktop or feed asset to work unchanged; placement asset customization and vertical-friendly execution can improve fit.",
  "Use A/B testing to measure the effect of native Reels creative or Reels placement strategy instead of assuming vertical video will automatically improve conversion.",
  "Advantage+ creative can adapt assets for placements, but automated resizing or expansion does not replace a clear message, product proof and legible safe-area composition."
 ]},
 {domain:"Meta Pixel & Conversions API",source:"Meta Blueprint",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://www.facebookblueprint.com/student/path/211547-set-up-and-use-conversions-api-and-pixel-ad-campaigns",lessons:[
  "Meta Pixel and Conversions API can be used together to improve visibility into customer actions and support ad optimization; server-side data complements rather than automatically invalidates browser-side signals.",
  "The event sent to Meta must map to the real business action. More events are not inherently better if they are mislabeled or duplicated.",
  "Measurement architecture should define which events are browser, server or both and document how they reconcile with backend orders or leads.",
  "Before using Meta event counts for budget decisions, verify that the intended event fires with the intended parameters and corresponds to a real business outcome."
 ]},
 {domain:"Meta CAPI Quality & Deduplication",source:"Meta Blueprint",sourceType:"official",published:"2026-08",confidence:0.99,url:"https://www.facebookblueprint.com/student/path/253116-optimize-conversions-api-course",lessons:[
  "Conversions API quality should be managed through event coverage, event quality, deduplication and data freshness rather than simply checking that an integration says connected.",
  "When the same conversion is sent by Pixel and CAPI, deduplication must be configured so one business action does not become multiple optimization events.",
  "Poor event coverage or stale server events can weaken optimization even when the connection is technically online.",
  "Monitor Events Manager signals and troubleshoot event quality before scaling a campaign whose reported conversions are inconsistent with the backend."
 ]},
 {domain:"Meta Opportunity Score",source:"Meta Blueprint",sourceType:"official",published:"2026-05-01",confidence:0.99,url:"https://www.facebookblueprint.com/student/page/708384-opportunity-score-experimentally-proven-recommendations-to-help-improve-your-campaign-performance",lessons:[
  "Opportunity score provides personalized and prioritized campaign recommendations based on the business profile and campaign characteristics; it is an optimization aid, not a substitute for business judgment.",
  "Use opportunity score recommendations before, during and after campaign creation as hypotheses or setup improvements that still need to be evaluated against the campaign objective and economics.",
  "A high opportunity score does not prove profitability, incrementality or correct measurement; those require their own evidence.",
  "Do not apply a recommendation blindly when it conflicts with a documented business constraint, experiment design or verified conversion definition."
 ]}
] as const;

export const FAHD_SOURCE_NOTES_BATCH_05_CONTEXT=FAHD_SOURCE_NOTES_BATCH_05.map(n=>`### ${n.domain} — ${n.source}\nType: ${n.sourceType}; confidence: ${Math.round(n.confidence*100)}%; published: ${n.published}\n${n.lessons.map(x=>`- ${x}`).join("\n")}`).join("\n\n");
