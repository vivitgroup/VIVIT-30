import { VIVITO_ACADEMY } from "./foundation";
import { VIVITO_INGESTED_BATCH_01_CONTEXT } from "./ingested-batch-01";
import { VIVITO_INGESTED_BATCH_02_CONTEXT } from "./ingested-batch-02";
import { VIVITO_SOURCE_NOTES_CONTEXT,VIVITO_SOURCE_NOTES_BATCH_03 } from "./source-notes-batch-03";
import { VIVITO_SOURCE_NOTES_BATCH_04_CONTEXT } from "./source-notes-batch-04";
import { VIVITO_SOURCE_NOTES_BATCH_05_CONTEXT } from "./source-notes-batch-05";
import { VIVITO_TRAINING_BATCH_06_CONTEXT } from "./training-batch-06";
import { VIVITO_TRAINING_BATCH_07_CONTEXT } from "./training-batch-07";

const VIVITO_FOUNDATION_CONTEXT=VIVITO_ACADEMY.map(d=>`## ${d.name}\nSources: ${d.sources.join(", ")}\n${d.principles.map(x=>`- ${x}`).join("\n")}`).join("\n\n");

export const VIVITO_ACADEMY_CONTEXT=[
  VIVITO_FOUNDATION_CONTEXT,
  "# INGESTED LESSONS — BATCH 01",
  VIVITO_INGESTED_BATCH_01_CONTEXT,
  "# INGESTED LESSONS — BATCH 02",
  VIVITO_INGESTED_BATCH_02_CONTEXT,
  "# VERIFIED PLATFORM NOTES — BATCH 04",
  VIVITO_SOURCE_NOTES_BATCH_04_CONTEXT,
  "# META SPECIALIST NOTES — BATCH 05",
  VIVITO_SOURCE_NOTES_BATCH_05_CONTEXT,
  "# AGENCY OPERATING MASTERY — BATCH 06",
  VIVITO_TRAINING_BATCH_06_CONTEXT,
  "# ADVANCED JUDGMENT & CROSS-FUNCTIONAL MASTERY — BATCH 07",
  VIVITO_TRAINING_BATCH_07_CONTEXT,
].join("\n\n");

export { VIVITO_ACADEMY,VIVITO_SOURCE_NOTES_CONTEXT,VIVITO_SOURCE_NOTES_BATCH_03 as VIVITO_SOURCE_NOTES };

export const VIVITO_ACADEMY_TESTS=[
 {domain:"Media Buying",question:"A Meta messaging campaign spent 4,000 EGP and generated 200 messaging conversations. What is the primary result and CPR?",mustInclude:["200","20","messag"]},
 {domain:"Media Buying",question:"A sales campaign has strong CTR but weak purchases. What should I investigate before increasing budget?",mustInclude:["offer","landing","checkout"]},
 {domain:"Business",question:"Should I scale a service that has high revenue but negative contribution margin?",mustInclude:["margin","no"]},
 {domain:"Content",question:"How should I improve a video that loses most viewers in the opening seconds?",mustInclude:["hook","first"]},
 {domain:"Design",question:"What should I review first in a cluttered social design?",mustInclude:["hierarchy"]},
 {domain:"Account Management",question:"What should a client performance review include?",mustInclude:["goal","performance","action"]},
 {domain:"Analytics",question:"Ads Manager and backend purchases disagree. What should I do?",mustInclude:["tracking","attribution"]},
 {domain:"Ecommerce",question:"Is a high ROAS enough to prove an ecommerce campaign is profitable?",mustInclude:["margin","no"]},
 {domain:"Sales",question:"A prospect says the price is too high. Should I immediately discount?",mustInclude:["objection"]},
 {domain:"Automation",question:"Should an AI automatically publish an irreversible client commitment without approval?",mustInclude:["approval","no"]}
];
