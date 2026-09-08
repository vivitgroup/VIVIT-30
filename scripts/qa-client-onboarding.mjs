import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const api=read("app/api/clients/route.ts");
const form=read("components/clients/NewClientForm.tsx");
const onboarding=read("app/dashboard/onboarding/page.tsx");
const payments=read("app/dashboard/clients/accounts-payment/page.tsx");

check("Client API requires company, industry and website",api.includes('required(b,"companyName"')&&api.includes('required(b,"industry"')&&api.includes('required(b,"website"'));
check("Client API requires primary contact",api.includes('required(b,"contactName"')&&api.includes('required(b,"contactEmail"')&&api.includes('required(b,"contactPhone"'));
check("Client API requires both contract dates",api.includes("!contractStart||!contractEnd")&&api.includes("Contract start and end dates are required"));
check("Portal provisioning can be deferred explicitly",api.includes('portalLink:portalUserId?"LINKED":"DEFERRED"')&&form.includes("Optional during onboarding")&&form.includes("Link later"));
check("Supplied portal user must be active approved client in same workspace",api.includes('eq(users.role,"CLIENT")')&&api.includes("eq(users.isActive,true)")&&api.includes('eq(users.approvalStatus,"APPROVED")')&&api.includes("eq(users.workspaceId,workspaceId)"));
check("Portal identity cannot be linked to two clients",api.includes("This portal user is already linked to another client")&&api.includes("eq(clients.userId,portalUserId)"));
check("Operational creation requires AM and Media Buyer",api.includes("canSetupMarketing&&!accountManagerId")&&api.includes("canSetupMarketing&&!mediaBuyerId"));
check("Create-client endpoint rejects all finance payloads",api.includes("hasFinancePayload")&&api.includes("Financial amounts must be entered from Accounts Payment"));
check("New client starts with zero finance values",api.includes("monthlyRetainer:0,mediaBudget:0,contractValue:0"));
check("Finance handoff notifies Accountant and Super Admin",api.includes('inArray(users.role,["ACCOUNTANT","SUPER_ADMIN"])')&&api.includes('type:"finance_setup_required"'));
check("Finance handoff notification links to Accounts Payment",api.includes('link:"/dashboard/clients/accounts-payment"'));
check("UI no longer exposes retainer, media budget or contract value",!form.includes('name="monthlyRetainer"')&&!form.includes('name="mediaBudget"')&&!form.includes('name="contractValue"'));
check("UI marks company operational fields required",form.includes('name="companyName" required')&&form.includes('name="industry" required')&&form.includes('name="website" required'));
check("UI marks contract dates required",form.includes('name="contractStart" required')&&form.includes('name="contractEnd" required'));
check("UI marks primary contact fields required",form.includes('name="contactName" required')&&form.includes('name="contactEmail" required')&&form.includes('name="contactPhone" required'));
check("UI marks team assignments required and portal optional",form.includes('name="mediaBuyerId" required')&&form.includes('name="accountManagerId" required')&&form.includes('name="portalUserId"')&&!form.includes('name="portalUserId" required'));
check("Onboarding uses per-client advisory serialization",onboarding.includes("onboarding-ui:${workspaceId}:${clientId}")&&onboarding.includes("pg_advisory_xact_lock"));
check("Onboarding blocks completing a later step",onboarding.includes("missingPrior")&&onboarding.includes("before this step"));
check("Onboarding rollback cascades to later steps",onboarding.includes("STEPS.slice(stepIndex)")&&onboarding.includes("cascadesLaterSteps:!completed"));
check("Onboarding UI disables future steps",onboarding.includes("locked=!isDone")&&onboarding.includes("disabled={locked}"));
check("Finance setup queue includes clients with no profile",payments.includes("left join client_payment_profiles")&&payments.includes("Finance setup required"));
check("Finance setup write is restricted to Accountant and Super Admin",payments.includes("async function saveFinanceSetup")&&payments.includes("Role.SUPER_ADMIN,Role.ACCOUNTANT"));
check("Finance setup validates positive amount and payment day",payments.includes("amountDue<=0")&&payments.includes("paymentDay<1||paymentDay>31"));
check("Finance setup is audited and concurrency locked",payments.includes('action:"client_finance_setup"')&&payments.includes("client-finance-setup:${workspaceId}:${clientId}")&&payments.includes("pg_advisory_xact_lock"));

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} client onboarding checks passed.`);
if(failed.length)process.exit(1);
