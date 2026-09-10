import assert from "node:assert/strict";
import {authorizedVivitoLiveModules,isVivitoLiveModuleAllowed} from "../lib/vgroup/vivito-cross-module-policy";
import type {VGroupSession} from "../lib/vgroup/session";

const session=(memberships:VGroupSession["memberships"]):VGroupSession=>({userId:"qa-user",email:"qa@example.test",fullName:"QA",memberships});
let passed=0;
const check=(name:string,fn:()=>void)=>{fn();passed++;console.log(`PASS  ${name}`)};

const hospitalityViewer=session([{businessUnit:"hospitality",role:"PROPERTY_MANAGER",permissions:["properties:view"]}]);
const hospitalityNoView=session([{businessUnit:"hospitality",role:"PROPERTY_MANAGER",permissions:["work_orders:update"]}]);
const techViewer=session([{businessUnit:"tech",role:"PROJECT_MANAGER",permissions:["projects:view"]}]);
const techNoView=session([{businessUnit:"tech",role:"TECH_CLIENT",permissions:["change_requests:create"]}]);
const groupAdmin=session([{businessUnit:"hospitality",role:"GROUP_SUPER_ADMIN",permissions:[]}]);

check("hospitality live data requires explicit properties view",()=>{
  assert.equal(isVivitoLiveModuleAllowed(hospitalityViewer,"group","hospitality"),true);
  assert.equal(isVivitoLiveModuleAllowed(hospitalityNoView,"group","hospitality"),false);
});
check("tech live data requires at least one explicit view capability",()=>{
  assert.equal(isVivitoLiveModuleAllowed(techViewer,"group","tech"),true);
  assert.equal(isVivitoLiveModuleAllowed(techNoView,"group","tech"),false);
});
check("selected workspace cannot pull another business unit",()=>{
  assert.equal(isVivitoLiveModuleAllowed(hospitalityViewer,"hospitality","tech"),false);
  assert.equal(isVivitoLiveModuleAllowed(techViewer,"tech","hospitality"),false);
});
check("ordinary membership never grants cross-unit access",()=>{
  assert.deepEqual(authorizedVivitoLiveModules(hospitalityViewer,"group"),["hospitality"]);
  assert.deepEqual(authorizedVivitoLiveModules(techViewer,"group"),["tech"]);
});
check("missing read permission fails closed instead of leaking aggregate data",()=>{
  assert.deepEqual(authorizedVivitoLiveModules(hospitalityNoView,"group"),[]);
  assert.deepEqual(authorizedVivitoLiveModules(techNoView,"group"),[]);
});
check("group super admin may aggregate authorized business units",()=>{
  assert.deepEqual(authorizedVivitoLiveModules(groupAdmin,"group"),["hospitality","tech"]);
});
check("group admin still respects a selected workspace boundary",()=>{
  assert.deepEqual(authorizedVivitoLiveModules(groupAdmin,"hospitality"),["hospitality"]);
  assert.deepEqual(authorizedVivitoLiveModules(groupAdmin,"tech"),["tech"]);
});

console.log(`\n${passed}/7 VIVITO cross-module intelligence authorization checks passed.`);
assert.equal(passed,7);
