import {generateLocalActionPlanV2} from "../lib/vivito/local-action-planner-v2";
import {repairVivitoActionPlan} from "../lib/vivito/action-plan-repair-v3";

const system="You are VIVITO Action Planner for VIVIT ERP. Allowed operations for SUPER_ADMIN: create_client, create_task, archive_client.";
const checks:{name:string;ok:boolean}[]=[];
const check=(name:string,ok:boolean)=>checks.push({name,ok});
function plan(request:string){const prompt=`USER REQUEST: ${request}\n\nAUTHORIZED ACTIVE CLIENT DIRECTORY: []`,base=generateLocalActionPlanV2(prompt,system);if(!base)throw new Error(`No local plan for ${request}`);return JSON.parse(repairVivitoActionPlan(prompt,system,base.text)) as {op:string;args:Record<string,unknown>;missingFields:string[]}}

const arabicClient=plan("ضيف عميل Oura Shutter");
check("Arabic natural create-client keeps explicit company name",arabicClient.op==="create_client"&&arabicClient.args.companyName==="Oura Shutter"&&!arabicClient.missingFields.includes("companyName"));
const englishClient=plan("Create client Cinnamon");
check("English natural create-client keeps explicit company name",englishClient.op==="create_client"&&englishClient.args.companyName==="Cinnamon"&&!englishClient.missingFields.includes("companyName"));
const archive=plan("Archive client Oura Shutter");
check("Natural client target repairs lifecycle commands",archive.op==="archive_client"&&archive.args.clientName==="Oura Shutter"&&!archive.missingFields.includes("clientName"));
const task=plan("Create task Video 1 for client Oura Shutter; brief: Produce final reel; deadline: 2026-09-02");
check("Natural task title and client are retained",task.op==="create_task"&&task.args.title==="Video 1"&&task.args.clientName==="Oura Shutter"&&task.missingFields.length===0);
const incomplete=plan("Create client");
check("Missing company still fails closed",incomplete.op==="create_client"&&incomplete.missingFields.includes("companyName"));
const raw="Plain advisory response";
check("Non-planner output is untouched",repairVivitoActionPlan("hello","You are VIVITO advisor",raw)===raw);

for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);
const failed=checks.filter(c=>!c.ok);console.log(`\n${checks.length-failed.length}/${checks.length} VIVITO natural-action checks passed.`);if(failed.length)process.exit(1);
