import {buildVivitoClientTwin,clientTwinContext} from "../lib/vivito/client-digital-twin";
import {buildVivitoLearningDigest,vivitoLearningContext} from "../lib/vivito/learning-loop";

const assert=(ok:boolean,msg:string)=>{if(!ok)throw new Error(msg)};
const now=new Date().toISOString();
const a=[
 {kind:"FACT",text:"Client A sells premium skincare",createdAt:now,source:"memory",scopeId:"A"},
 {kind:"PREFERENCE",text:"Client A prefers premium editorial tone",createdAt:now,source:"memory",scopeId:"A"},
 {kind:"CORRECTION",text:"Do not position Client A as discount-first",createdAt:now,source:"memory",scopeId:"A"},
 {kind:"OUTCOME",text:"Retargeting campaign improved qualified leads",createdAt:now,source:"memory",scopeId:"A"},
 {kind:"LEARNING",text:"For Client A, premium proof beats discount messaging",createdAt:now,source:"memory",scopeId:"A"},
] as any[];
const b=[{kind:"FACT",text:"Client B is a restaurant",createdAt:now,source:"memory",scopeId:"B"}] as any[];
const ta=buildVivitoClientTwin("A",a),tb=buildVivitoClientTwin("B",b);
assert(ta.profile.some(x=>x.includes("skincare")),"A twin missed fact");
assert(!clientTwinContext([tb]).includes("skincare"),"cross-client leakage detected");
assert(ta.corrections.some(x=>x.includes("discount-first")),"correction missing");
assert(ta.lessons.length===2,"learning/outcome not captured");
assert(ta.confidence==="MEDIUM","confidence calibration incorrect");
const digest=buildVivitoLearningDigest(a);
assert(digest.lessons.length===2,"agency lessons missing");
assert(vivitoLearningContext(digest).includes("Agency learning confidence="),"learning context missing confidence");
assert(vivitoLearningContext(digest).includes("OUTCOME")===false,"context should synthesize categories, not expose implementation labels");
console.log("VIVITO Client Digital Twin + Agency Learning Loop behavioral gate passed.");
