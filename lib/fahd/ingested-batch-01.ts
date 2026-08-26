export type FahdIngestedLesson={domain:string;source:string;title:string;published?:string;sourceType:'official'|'expert';confidence:'high'|'medium';lessons:string[]};

// Curated, paraphrased knowledge extracted from publicly discoverable educational source metadata/descriptions.
// We intentionally store concepts, not copied transcripts. Platform-first-party guidance outranks creator opinion.
export const FAHD_INGESTED_BATCH_01:FahdIngestedLesson[]=[
{domain:'Performance Marketing & Creative',source:'Dara Denney',title:'How to Make Meta Ads Creative',published:'2025-06-01',sourceType:'expert',confidence:'medium',lessons:[
'Performance creative should test materially different formats and hypotheses, not cosmetic variants only.',
'Useful Meta creative families include benefit-led image ads, comparison/us-vs-them concepts, founder-led ads and creator-style content.',
'Creative polish is not the objective by itself; clarity, relevance, proof and conversion response matter more.',
'Founder-led creative can combine authority, story, mechanism and product proof when the founder is credible.',
'Choose DIY versus dedicated creative production based on brand maturity, testing velocity, economics and available capability.'
]},
{domain:'Performance Marketing & Creative',source:'Dara Denney',title:'How to Develop a Creative Strategy That Converts',published:'2022-04-25',sourceType:'expert',confidence:'medium',lessons:[
'Build a creative foundation before producing ads: customer, product, positioning, offer and existing evidence.',
'Use reputation, customer and competitor research to discover objections, language, proof and differentiated angles.',
'Translate features into customer benefits and collect testimonials/proof before planning concepts.',
'Create an initial creative roadmap of hypotheses, then prioritize concepts rather than producing random assets.',
'Creative strategy is an ongoing learning loop: launch, measure, extract insight, iterate and expand winning angles.'
]},
{domain:'Business Development & Sales',source:'Y Combinator',title:'How to Get Your First Customers | Startup School',published:'2022-12-29',sourceType:'expert',confidence:'high',lessons:[
'Early-stage teams should be willing to do unscalable manual work to learn directly from customers.',
'Founders/operators benefit from learning sales themselves before attempting to outsource an unproven sales motion.',
'Model customer acquisition as a funnel and inspect conversion between stages instead of looking only at final wins.',
'Charging early customers validates willingness to pay more strongly than expressions of interest alone.',
'Work backwards from the customer/revenue goal into required funnel volume and activities.'
]},
{domain:'Content Creation & Analytics',source:'YouTube Creator Academy',title:'Understand your YouTube engagement',sourceType:'official',confidence:'high',lessons:[
'Use audience-retention reporting to identify which moments hold or lose viewer attention.',
'Average view duration and watch time measure different aspects of engagement and should not be treated as interchangeable.',
'Compare retention against similar-length recent videos where appropriate rather than relying on a context-free benchmark.',
'Content optimization should respond to observed retention behavior, not assumptions about what viewers watched.'
]},
{domain:'Content Creation & Platform Policy',source:'YouTube',title:'Channel monetization policies / authentic content guidance',published:'2025-07-15 update',sourceType:'official',confidence:'high',lessons:[
'Original, authentic educational or entertainment value is preferable to repetitive mass-produced content.',
'Reused material needs meaningful transformation, commentary or added value; simple copying or templating is weak content practice.',
'AI-assisted creation still needs a distinct creative vision and useful original substance.',
'When repurposing a format or trend, add an authentic perspective rather than producing interchangeable clones.'
]}
];

export const FAHD_INGESTED_BATCH_01_CONTEXT=FAHD_INGESTED_BATCH_01.map(x=>`## ${x.domain} — ${x.source}: ${x.title}\n${x.lessons.map(v=>`- ${v}`).join('\n')}`).join('\n\n');
