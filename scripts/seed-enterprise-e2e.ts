import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import {workspaces,users,clients,creativeTasks,salesLeads,financeRecords} from "../db/schema";

const url=process.env.DATABASE_URL;
const password=process.env.E2E_PASSWORD;
if(!url)throw new Error("DATABASE_URL is required");
if(!password||password.length<16)throw new Error("E2E_PASSWORD must be at least 16 characters");
const sql=postgres(url,{ssl:false,max:1,prepare:false});
const db=drizzle(sql);
const workspaceId="e2e-workspace";
const ids={super:"e2e-super-admin",accountManager:"e2e-account-manager",mediaBuyer:"e2e-media-buyer",creator:"e2e-creator",accountant:"e2e-accountant",sales:"e2e-sales",client:"e2e-client-user"};
const accounts=[
 {id:ids.super,name:"E2E Super Admin",email:"e2e.super@vivit.local",role:"SUPER_ADMIN" as const,isWorkspaceOwner:true},
 {id:ids.accountManager,name:"E2E Account Manager",email:"e2e.account@vivit.local",role:"ACCOUNT_MANAGER" as const,isWorkspaceOwner:false},
 {id:ids.mediaBuyer,name:"E2E Media Buyer",email:"e2e.media@vivit.local",role:"MEDIA_BUYER" as const,isWorkspaceOwner:false},
 {id:ids.creator,name:"E2E Creator",email:"e2e.creator@vivit.local",role:"CREATOR" as const,isWorkspaceOwner:false},
 {id:ids.accountant,name:"E2E Accountant",email:"e2e.accountant@vivit.local",role:"ACCOUNTANT" as const,isWorkspaceOwner:false},
 {id:ids.sales,name:"E2E Sales",email:"e2e.sales@vivit.local",role:"SALES" as const,isWorkspaceOwner:false},
 {id:ids.client,name:"E2E Client",email:"e2e.client@vivit.local",role:"CLIENT" as const,isWorkspaceOwner:false},
];

async function main(){
 const hash=await bcrypt.hash(password!,10);
 await db.insert(workspaces).values({id:workspaceId,name:"VIVIT Enterprise E2E",slug:"vivit-enterprise-e2e",plan:"ENTERPRISE",currency:"USD",timezone:"Africa/Cairo",maxClients:50,maxUsers:50}).onConflictDoNothing();
 for(const account of accounts)await db.insert(users).values({...account,password:hash,workspaceId,isActive:true,approvalStatus:"APPROVED"}).onConflictDoNothing();
 await db.insert(clients).values({id:"e2e-client",workspaceId,companyName:"E2E Global Client",industry:"Technology",currency:"USD",monthlyRetainer:10000,mediaBudget:30000,contractValue:120000,userId:ids.client,accountManagerId:ids.accountManager,mediaBuyerId:ids.mediaBuyer,isActive:true}).onConflictDoNothing();
 await db.insert(creativeTasks).values({id:"e2e-task",workspaceId,clientId:"e2e-client",createdById:ids.accountManager,assignedToId:ids.creator,title:"E2E Enterprise Creative",type:"REEL",status:"IN_PROGRESS",priority:"HIGH",brief:"Isolated browser certification task",deadline:new Date(Date.now()+86400000)}).onConflictDoNothing();
 await db.insert(salesLeads).values({id:"e2e-lead",workspaceId,companyName:"E2E Prospect",contactPerson:"Global Buyer",email:"buyer@example.test",stage:"QUALIFIED",estimatedValue:25000,probability:40,salesRepId:ids.sales}).onConflictDoNothing();
 await db.insert(financeRecords).values({id:"e2e-finance",workspaceId,clientId:"e2e-client",month:9,year:2026,retainer:10000,totalRevenue:10000,paid:5000,outstanding:5000,invoiceStatus:"SENT",invoiceNumber:"E2E-INV-001"}).onConflictDoNothing();
 const fixture=accounts.map(a=>({id:a.id,name:a.name,email:a.email,password:hash,role:a.role,workspace_id:workspaceId,is_active:true,approval_status:"APPROVED"}));
 await import("node:fs/promises").then(fs=>fs.writeFile(process.env.E2E_USERS_FILE||"/tmp/vivit-e2e-users.json",JSON.stringify(fixture),"utf8"));
 console.log(`Seeded ${accounts.length} isolated E2E roles in ${workspaceId}`);
}
main().finally(()=>sql.end());
