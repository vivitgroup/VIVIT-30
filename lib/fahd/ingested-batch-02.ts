export const FAHD_INGESTED_BATCH_02=[
{domain:'Graphic Design',source:'Satori Graphics',title:'Typography Essentials',published:'2023-12-05',confidence:'medium',lessons:[
'Typeface selection should follow the intended tone and communication job, not personal preference alone.',
'Typographic hierarchy must make levels of information visually obvious through scale, weight, spacing and placement.',
'Font pairing should create useful contrast while preserving coherence; avoid pairings that compete for attention.',
'Tracking, leading and layout are functional readability decisions, not finishing decoration.',
'Review typography as part of the complete composition because hierarchy and spacing interact with imagery and layout.'
]},
{domain:'Content Analytics',source:'YouTube Creator Academy',title:'Audience retention and engagement analytics',confidence:'high',lessons:[
'Use key moments in audience retention to locate drop-offs and sustained-interest sections.',
'Average view duration should be interpreted with video length and audience-retention shape.',
'Compare like with like: similar-length recent content is a stronger baseline than arbitrary universal retention targets.'
]},
{domain:'Content Quality',source:'YouTube official policy guidance',title:'Original and authentic content',published:'2025-07-15 update',confidence:'high',lessons:[
'Content should provide original educational or entertainment value rather than feel mass-produced or interchangeable.',
'Repurposed material should add substantive commentary, modification, narrative or educational value.',
'AI can assist production, but the resulting content still needs authentic creative direction and useful substance.'
]}
] as const;
export const FAHD_INGESTED_BATCH_02_CONTEXT=FAHD_INGESTED_BATCH_02.map(x=>`## ${x.domain} — ${x.source}: ${x.title}\n${x.lessons.map(v=>`- ${v}`).join('\n')}`).join('\n\n');
