import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const list=read("app/dashboard/clients/page.tsx");
const detail=read("app/dashboard/clients/[id]/page.tsx");
const guard=read("app/dashboard/clients/[id]/layout.tsx");
const newPage=read("app/dashboard/clients/new/page.tsx");
const form=read("components/clients/NewClientForm.tsx");
const api=read("app/api/clients/route.ts");
const lifecycle=read("app/api/lifecycle/route.ts");
const actions=read("lib/actions/index.ts");

check("Clients list requires authenticated role",list.includes("if (!session?.user) redirect")&&list.includes("Role.SUPER_ADMIN")&&list.includes("Role.ACCOUNT_MANAGER"));
check("Account Manager list is ownership scoped",list.includes("eq(clients.accountManagerId,userId)"));
check("Media Buyer list is ownership scoped",list.includes("eq(clients.mediaBuyerId,userId)"));
check("Client detail has a centralized active-record guard",guard.includes("eq(clients.isActive,true)")&&guard.includes("redirect(\"/dashboard/clients\")"));
check("Client detail direct URL scopes Account Managers",guard.includes("client.accountManagerId!==userId"));
check("Client detail direct URL scopes Media Buyers",guard.includes("client.mediaBuyerId!==userId"));
check("New client page and API agree on allowed roles",newPage.includes("SUPER_ADMIN\",\"ACCOUNT_MANAGER\",\"ACCOUNTANT")&&api.includes("SUPER_ADMIN\",\"ACCOUNT_MANAGER\",\"ACCOUNTANT"));
check("Client create rejects duplicate company names",api.includes("already exists")&&api.includes("status:409"));
check("Client create validates active portal user and one-client ownership",api.includes("valid active client portal user")&&api.includes("already linked to another client"));
check("Client create validates AM/Media Buyer assignments",api.includes("valid active account manager")&&api.includes("valid active media buyer"));
check("Client create validates contract date order",api.includes("Contract end date must be on or after the start date"));
check("Client form exposes real error and saving states",form.includes("setError")&&form.includes("Creating client…")&&form.includes("role=\"alert\""));
check("Archive/restore is ownership scoped",lifecycle.includes("managerOwns")&&lifecycle.includes("client_restored"));
check("Permanent client delete is Super Admin only",lifecycle.includes("Only Super Admin can permanently delete a client"));
check("Permanent delete blocks linked records and portal account",lifecycle.includes("Archive it instead of permanent deletion")&&lifecycle.includes("portalAccount"));
check("Existing client update validates ownership and assignments",actions.includes("export async function updateClient")&&actions.includes("requireClientAccess(session,clientId,true)")&&actions.includes("Invalid account manager")&&actions.includes("Invalid media buyer"));
check("Existing client update is exposed in client UI",detail.includes("updateClient")||detail.includes("Edit client")||detail.includes("Edit Client"));
check("Communication log reads both legacy client-keyed and converted-lead-keyed activity",detail.includes("salesLeads.clientId")&&/activities[\s\S]*(lead\?\.id|leadId|sales_leads)/.test(detail)&&!detail.includes("where(eq(salesActivities.leadId,id))"));

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} client lifecycle checks passed.`);
if(failed.length)process.exit(1);
