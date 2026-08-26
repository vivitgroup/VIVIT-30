import {db,clients,contacts,users,creativeTasks,notifications,auditLogs,companyExpenses,financeRecords,paymentRecords,fileDocuments,workspaces,sql} from "@/lib/db";
import {and,eq,ilike} from "drizzle-orm";
import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "./action-engine";

const W="default";
const TYPES=new Set(["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"]);
const PRIORITIES=new Set(["URGENT","HIGH","MEDIUM","LOW"]);
const EXPENSES=new Set(["Salaries","Freelancers","Tools","Office","Production","Advertising","Travel","Other"]);
const METHODS=new Set(["bank","cash","stripe","paymob","paytabs"]);
const FILE_CATEGORIES=new Set(["GENERAL","CONTENT_PLAN","STRATEGY","BRIEF","CREATIVE","SOCIAL_POST","CONTRACT","INVOICE","FINANCE","SHEET"]);

export class VivitoActionError extends Error{status:number;details?:unknown;constructor(message:string,status=400,details?:unknown){super(message);this.status=status;this.details=details}}
const rows=(v:any)=>Array.from(v as any) as any[];
const clean=(v:any,n=500)=>String(v??"").trim().slice(0,n);
const amount=(v:any)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)throw new VivitoActionError("Amount must be greater than zero.");return Number(n.toFixed(2))};
const nonNegative=(v:any)=>{const n=Number(v??0);if(!Number.isFinite(n)||n<0)throw new VivitoActionError("Amount cannot be negative.");return Number(n.toFixed(2))};
const parsedDate=(v:any)=>{const d=new Date(String(v||""));if(Number.isNaN(d.getTime()))throw new VivitoActionError("A valid date is required.");return d};
async function audit(userId:string,action:string,entity:string,entityId:string,payload:any={}){await db.insert(auditLogs).values({workspaceId:W,userId,action,entity,entityId,newValues:JSON.stringify(payload)} as any)}

function authorizeOp(role:string,op:VivitoActionOp){const meta=VIVITO_ACTION_CATALOG[op];if(!meta)throw new VivitoActionError("Unsupported VIVITO action.",400);if(!meta.roles.includes(role))throw new VivitoActionError("You do not have permission to execute this action.",403)}

async function findClient(refRaw:any,role:string,userId:string,includeArchived=false){
 const ref=clean(refRaw,180);if(!ref)throw new VivitoActionError("Client name is required.");
 let found=rows(await db.execute(sql`select id,company_name,workspace_id,is_active,archived_at,account_manager_id,media_buyer_id,user_id from clients where workspace_id=${W} and (id=${ref} or lower(company_name)=lower(${ref})) ${includeArchived?sql``:sql`and is_active=true and archived_at is null`} limit 3`));
 if(!found.length){found=rows(await db.execute(sql`select id,company_name,workspace_id,is_active,archived_at,account_manager_id,media_buyer_id,user_id from clients where workspace_id=${W} and company_name ilike ${`%${ref}%`} ${includeArchived?sql``:sql`and is_active=true and archived_at is null`} order by company_name limit 6`));}
 if(!found.length)throw new VivitoActionError(`Client “${ref}” was not found.`,404);
 if(found.length>1)throw new VivitoActionError(`Client name “${ref}” is ambiguous.`,409,{candidates:found.map(x=>({id:x.id,name:x.company_name}))});
 const c=found[0];
 if(role==="ACCOUNT_MANAGER"&&c.account_manager_id!==userId)throw new VivitoActionError("This client is outside your Account Manager scope.",403);
 if(role==="MEDIA_BUYER"&&c.media_buyer_id!==userId)throw new VivitoActionError("This client is outside your Media Buyer scope.",403);
 if(role==="CLIENT"&&c.user_id!==userId)throw new VivitoActionError("This client is outside your portal scope.",403);
 return c;
}

async function findUser(refRaw:any,expectedRoles:string[]){
 const ref=clean(refRaw,180);if(!ref)throw new VivitoActionError("Team member name is required.");
 let found=rows(await db.execute(sql`select id,name,role from users where workspace_id=${W} and is_active=true and role in (${sql.join(expectedRoles.map(x=>sql`${x}`),sql`,`)}) and (id=${ref} or lower(name)=lower(${ref})) limit 3`));
 if(!found.length)found=rows(await db.execute(sql`select id,name,role from users where workspace_id=${W} and is_active=true and role in (${sql.join(expectedRoles.map(x=>sql`${x}`),sql`,`)}) and name ilike ${`%${ref}%`} order by name limit 6`));
 if(!found.length)throw new VivitoActionError(`Team member “${ref}” was not found.`,404);
 if(found.length>1)throw new VivitoActionError(`Team member name “${ref}” is ambiguous.`,409,{candidates:found});
 return found[0];
}

async function findTask(args:any,role:string,userId:string,includeArchived=false){
 const taskId=clean(args.taskId,100),taskTitle=clean(args.taskTitle||args.title,180),clientName=clean(args.clientName,180);
 let client:any=null;if(clientName)client=await findClient(clientName,role,userId,true);
 let q:any;
 if(taskId)q=sql`select t.id,t.title,t.client_id,t.archived_at,t.assigned_to_id,c.company_name,c.account_manager_id,c.is_active as client_active from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and c.workspace_id=${W} and t.id=${taskId} limit 2`;
 else if(taskTitle&&client)q=sql`select t.id,t.title,t.client_id,t.archived_at,t.assigned_to_id,c.company_name,c.account_manager_id,c.is_active as client_active from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and c.workspace_id=${W} and t.client_id=${client.id} and lower(t.title)=lower(${taskTitle}) limit 3`;
 else throw new VivitoActionError("Task id or task title plus client name is required.");
 let found=rows(await db.execute(q));
 if(!found.length&&taskTitle&&client)found=rows(await db.execute(sql`select t.id,t.title,t.client_id,t.archived_at,t.assigned_to_id,c.company_name,c.account_manager_id,c.is_active as client_active from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and c.workspace_id=${W} and t.client_id=${client.id} and t.title ilike ${`%${taskTitle}%`} order by t.created_at desc limit 6`));
 if(!found.length)throw new VivitoActionError("Task was not found.",404);
 if(found.length>1)throw new VivitoActionError("Task title is ambiguous.",409,{candidates:found.map(x=>({id:x.id,title:x.title,client:x.company_name}))});
 const t=found[0];if(role==="ACCOUNT_MANAGER"&&t.account_manager_id!==userId)throw new VivitoActionError("This task is outside your Account Manager scope.",403);if(!includeArchived&&t.archived_at)throw new VivitoActionError("Task is archived.",409);return t;
}

async function createClientAction(args:any,role:string,userId:string){
 const companyName=clean(args.companyName,160);if(companyName.length<2)throw new VivitoActionError("Company name is required.");
 const duplicate=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,W),ilike(clients.companyName,companyName))).limit(1);if(duplicate[0])throw new VivitoActionError("A client with this company name already exists.",409,{clientId:duplicate[0].id});
 const canSetupMarketing=role!=="ACCOUNTANT";
 let accountManagerId:string|null=role==="ACCOUNT_MANAGER"?userId:null,mediaBuyerId:string|null=null;
 if(canSetupMarketing&&role==="SUPER_ADMIN"&&clean(args.accountManagerName))accountManagerId=(await findUser(args.accountManagerName,["ACCOUNT_MANAGER"])).id;
 if(canSetupMarketing&&clean(args.mediaBuyerName))mediaBuyerId=(await findUser(args.mediaBuyerName,["MEDIA_BUYER"])).id;
 const contractStart=args.contractStart?parsedDate(args.contractStart):null,contractEnd=args.contractEnd?parsedDate(args.contractEnd):null;if(contractStart&&contractEnd&&contractEnd<contractStart)throw new VivitoActionError("Contract end date must be on or after start date.");
 const [client]=await db.insert(clients).values({workspaceId:W,companyName,industry:clean(args.industry,100)||null,website:clean(args.website,500)||null,monthlyRetainer:nonNegative(args.monthlyRetainer),mediaBudget:canSetupMarketing?nonNegative(args.mediaBudget):0,contractValue:nonNegative(args.contractValue),accountManagerId,mediaBuyerId,contractStart,contractEnd,internalNotes:canSetupMarketing?(clean(args.internalNotes,2000)||null):null} as any).returning();
 if(clean(args.contactName,160))await db.insert(contacts).values({clientId:client.id,name:clean(args.contactName,160),email:clean(args.contactEmail,254)||null,phone:clean(args.contactPhone,60)||null,whatsapp:clean(args.contactPhone,60)||null,isPrimary:true} as any);
 await audit(userId,"vivito_client_created","clients",client.id,{companyName});
 return{success:true,action:"create_client",entityId:client.id,message:`Client ${companyName} created.`,link:`/dashboard/clients/${client.id}`};
}

async function clientLifecycle(op:VivitoActionOp,args:any,role:string,userId:string){
 const c=await findClient(args.clientName,role,userId,true);
 if(op==="archive_client"){
  if(c.archived_at)throw new VivitoActionError("Client is already archived.",409);
  await db.execute(sql`update clients set is_active=false,archived_at=now(),archived_by=${userId},updated_at=now() where id=${c.id} and workspace_id=${W} and archived_at is null`);await audit(userId,"vivito_client_archived","clients",c.id,{companyName:c.company_name});return{success:true,action:op,entityId:c.id,message:`Client ${c.company_name} archived.`};
 }
 if(op==="restore_client"){
  if(!c.archived_at)throw new VivitoActionError("Client is already active.",409);
  await db.execute(sql`update clients set is_active=true,archived_at=null,archived_by=null,updated_at=now() where id=${c.id} and workspace_id=${W} and archived_at is not null`);await audit(userId,"vivito_client_restored","clients",c.id,{companyName:c.company_name});return{success:true,action:op,entityId:c.id,message:`Client ${c.company_name} restored.`,link:`/dashboard/clients/${c.id}`};
 }
 if(role!=="SUPER_ADMIN")throw new VivitoActionError("Only Super Admin can permanently delete a client.",403);if(!c.archived_at)throw new VivitoActionError("Archive the client before permanent deletion.",409);
 const [deps]=rows(await db.execute(sql`select (select count(*)::int from creative_tasks where client_id=${c.id}) tasks,(select count(*)::int from file_documents where client_id=${c.id}) files,(select count(*)::int from calendar_events where client_id=${c.id}) calendar,(select count(*)::int from finance_records where client_id=${c.id}) finance,(select count(*)::int from ad_campaigns where client_id=${c.id}) campaigns,(select count(*)::int from contacts where client_id=${c.id}) contacts,(select count(*)::int from sales_leads where client_id=${c.id}) converted_leads`));
 const dependent=Number(deps?.tasks||0)+Number(deps?.files||0)+Number(deps?.calendar||0)+Number(deps?.finance||0)+Number(deps?.campaigns||0)+Number(deps?.contacts||0)+Number(deps?.converted_leads||0)+(c.user_id?1:0);if(dependent>0)throw new VivitoActionError("This client has linked records. Keep it archived or remove dependencies first.",409,{dependencies:deps,portalAccount:Boolean(c.user_id)});
 await db.execute(sql`delete from clients where id=${c.id} and workspace_id=${W}`);await audit(userId,"vivito_client_deleted","clients",c.id,{companyName:c.company_name});return{success:true,action:op,entityId:c.id,message:`Client ${c.company_name} permanently deleted.`};
}

async function createTaskAction(args:any,role:string,userId:string){
 const client=await findClient(args.clientName,role,userId,false),title=clean(args.title,180),brief=clean(args.brief,5000),type=clean(args.type||"GRAPHIC",40).toUpperCase(),priority=clean(args.priority||"MEDIUM",30).toUpperCase(),deadline=parsedDate(args.deadline);if(!title||!brief)throw new VivitoActionError("Task title and brief are required.");if(!TYPES.has(type)||!PRIORITIES.has(priority))throw new VivitoActionError("Invalid task type or priority.");
 let creatorId:string|null=null,creatorName:string|null=null;if(clean(args.assigneeName)){const u=await findUser(args.assigneeName,["CREATOR"]);creatorId=u.id;creatorName=u.name}
 const [task]=await db.insert(creativeTasks).values({workspaceId:W,title,clientId:client.id,type:type as any,brief,priority:priority as any,status:"PENDING",assignedToId:creatorId,deadline,createdById:userId} as any).returning();
 if(creatorId)await db.insert(notifications).values({userId:creatorId,type:"TASK_ASSIGNED",title:`VIVITO assigned: ${title}`,message:`${client.company_name} · ${deadline.toLocaleDateString("en-EG")}`,link:`/dashboard/creative/${task.id}`,priority:priority==="URGENT"?"high":"normal"} as any);
 await audit(userId,"vivito_task_created","creative_tasks",task.id,{title,clientId:client.id,clientName:client.company_name,creatorId,creatorName,type,priority});return{success:true,action:"create_task",entityId:task.id,message:`Task ${title} created${creatorName?` and assigned to ${creatorName}`:""}.`,link:`/dashboard/creative/${task.id}`};
}

async function taskLifecycle(op:VivitoActionOp,args:any,role:string,userId:string){
 const t=await findTask(args,role,userId,true);
 if(op==="archive_task"){if(t.archived_at)throw new VivitoActionError("Task is already archived.",409);if(t.client_active===false)throw new VivitoActionError("The client is archived.",409);await db.execute(sql`update creative_tasks set archived_at=now(),archived_by=${userId},updated_at=now() where id=${t.id} and workspace_id=${W} and archived_at is null`);await audit(userId,"vivito_task_archived","creative_tasks",t.id,{title:t.title});return{success:true,action:op,entityId:t.id,message:`Task ${t.title} archived.`}}
 if(op==="restore_task"){if(!t.archived_at)throw new VivitoActionError("Task is already active.",409);if(t.client_active===false)throw new VivitoActionError("Restore the client before restoring this task.",409);await db.execute(sql`update creative_tasks set archived_at=null,archived_by=null,updated_at=now() where id=${t.id} and workspace_id=${W} and archived_at is not null`);await audit(userId,"vivito_task_restored","creative_tasks",t.id,{title:t.title});return{success:true,action:op,entityId:t.id,message:`Task ${t.title} restored.`,link:`/dashboard/creative/${t.id}`}}
 if(role!=="SUPER_ADMIN")throw new VivitoActionError("Only Super Admin can permanently delete a task.",403);if(!t.archived_at)throw new VivitoActionError("Archive the task before permanent deletion.",409);const [deps]=rows(await db.execute(sql`select (select count(*)::int from file_documents where task_id=${t.id}) files,(select count(*)::int from calendar_events where task_id=${t.id}) calendar,(select count(*)::int from task_comments where task_id=${t.id}) comments`));if(Number(deps?.files||0)+Number(deps?.calendar||0)+Number(deps?.comments||0)>0)throw new VivitoActionError("Task has linked files, comments, or calendar items.",409,{dependencies:deps});await db.execute(sql`delete from creative_tasks where id=${t.id} and workspace_id=${W}`);await audit(userId,"vivito_task_deleted","creative_tasks",t.id,{title:t.title});return{success:true,action:op,entityId:t.id,message:`Task ${t.title} permanently deleted.`};
}

async function logExpenseAction(args:any,userId:string){
 const category=clean(args.category||"Other",40),description=clean(args.description,500),value=amount(args.amount);if(!EXPENSES.has(category)||!description)throw new VivitoActionError("Expense category and description are required.");const now=args.date?parsedDate(args.date):new Date(),dateOnly=now.toISOString().slice(0,10);let id="";await db.transaction(async tx=>{const [row]=await tx.insert(companyExpenses).values({workspaceId:W,category,description,amount:value,date:now,approvedBy:userId}).returning();id=row.id;await tx.execute(sql`insert into financial_ledger_entries(id,workspace_id,entry_date,direction,entry_type,category,counterparty,description,amount,source_sheet,source_ref,source_key,approved_by,created_at) values(gen_random_uuid()::text,${W},${dateOnly}::date,'OUT','VIVITO_EXPENSE',${category},${description},${description},${value},'VIVITO',${row.id},${`vivito:expense:${row.id}`},${userId},now())`);await tx.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_expense_logged",entity:"company_expenses",entityId:row.id,newValues:JSON.stringify({category,description,amount:value,ledger:true})} as any)});return{success:true,action:"log_expense",entityId:id,message:`Expense ${value.toLocaleString("en-EG")} logged under ${category}.`,link:"/dashboard/finance"};
}

async function recordPaymentAction(args:any,role:string,userId:string){
 const client=await findClient(args.clientName,role,userId,false),value=amount(args.amount),method=clean(args.method||"bank",30).toLowerCase();if(!METHODS.has(method))throw new VivitoActionError("Invalid payment method.");const [workspace]=await db.select({currency:workspaces.currency}).from(workspaces).where(eq(workspaces.id,W)).limit(1),currency=workspace?.currency||"EGP";
 const invoices=rows(await db.execute(sql`select id,total_revenue,paid,outstanding,invoice_status,due_date,created_at from finance_records where workspace_id=${W} and client_id=${client.id} and outstanding>0 and coalesce(invoice_status,'SENT') not in ('PAID','CANCELLED') order by coalesce(due_date,created_at) asc,created_at asc`));if(!invoices.length)throw new VivitoActionError("This client has no outstanding invoice to receive the payment.",409);const totalOutstanding=invoices.reduce((s,x)=>s+Number(x.outstanding||0),0);if(value-totalOutstanding>0.01)throw new VivitoActionError(`Payment exceeds outstanding balance (${totalOutstanding.toFixed(2)} ${currency}).`,409,{outstanding:totalOutstanding,currency});
 let remaining=value;const allocations:any[]=[];await db.transaction(async tx=>{for(const inv of invoices){if(remaining<=0.009)break;const outstanding=Number(inv.outstanding||0),part=Number(Math.min(remaining,outstanding).toFixed(2));if(part<=0)continue;const total=Number(inv.total_revenue||0),newPaid=Number(Math.min(total,Number(inv.paid||0)+part).toFixed(2)),newOutstanding=Number(Math.max(0,total-newPaid).toFixed(2)),now=new Date();await tx.insert(paymentRecords).values({workspaceId:W,invoiceId:inv.id,clientId:client.id,amount:part,currency,method,status:"COMPLETED",paidAt:now});await tx.update(financeRecords).set({paid:newPaid,outstanding:newOutstanding,invoiceStatus:newOutstanding<=0.009?"PAID":inv.invoice_status,paidDate:newOutstanding<=0.009?now:null,paymentMethod:method,updatedAt:now} as any).where(and(eq(financeRecords.id,inv.id),eq(financeRecords.workspaceId,W)));allocations.push({invoiceId:inv.id,amount:part,remaining:newOutstanding});remaining=Number((remaining-part).toFixed(2))}await tx.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_payment_recorded",entity:"clients",entityId:client.id,newValues:JSON.stringify({clientName:client.company_name,amount:value,currency,method,allocations})} as any)});return{success:true,action:"record_payment",entityId:client.id,message:`Payment ${value.toLocaleString("en-EG")} ${currency} recorded for ${client.company_name}.`,allocations,link:"/dashboard/finance"};
}

async function createInvoiceAction(args:any,role:string,userId:string){
 const client=await findClient(args.clientName,role,userId,false),month=Number(args.month),year=Number(args.year),retainer=nonNegative(args.retainer),adSpend=nonNegative(args.adSpend),extraServices=nonNegative(args.extraServices);if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2020||year>2100)throw new VivitoActionError("Valid invoice month and year are required.");const [[workspace],[duplicate]]=await Promise.all([db.select({agencyFeePercent:workspaces.agencyFeePercent,currency:workspaces.currency}).from(workspaces).where(eq(workspaces.id,W)).limit(1),db.select({id:financeRecords.id}).from(financeRecords).where(and(eq(financeRecords.workspaceId,W),eq(financeRecords.clientId,client.id),eq(financeRecords.month,month),eq(financeRecords.year,year))).limit(1)]);if(duplicate)throw new VivitoActionError("An invoice already exists for this client and period.",409,{invoiceId:duplicate.id});const feePercent=Math.max(0,Number(workspace?.agencyFeePercent??20)),mediaBuyingFee=Number((adSpend*feePercent/100).toFixed(2)),total=Number((retainer+mediaBuyingFee+extraServices).toFixed(2)),dueDate=new Date(year,month,5),invoiceNumber=`INV-${year}-${String(month).padStart(2,"0")}-${client.id.slice(0,4).toUpperCase()}`;const [row]=await db.insert(financeRecords).values({workspaceId:W,clientId:client.id,month,year,retainer,mediaBuyingFee,extraServices,totalRevenue:total,paid:0,outstanding:total,invoiceStatus:"SENT",dueDate,invoiceNumber,commissionRate:10}).returning();await audit(userId,"vivito_invoice_created","finance_records",row.id,{clientId:client.id,clientName:client.company_name,month,year,retainer,adSpend,mediaBuyingFee,extraServices,total,currency:workspace?.currency||"EGP"});return{success:true,action:"create_invoice",entityId:row.id,message:`Invoice ${invoiceNumber} created for ${client.company_name}.`,link:"/dashboard/finance"};
}

async function attachFileAction(args:any,role:string,userId:string){
 const fileId=clean(args.fileId,100);if(!fileId)throw new VivitoActionError("Attachment file id is required.");const files=rows(await db.execute(sql`select id,name,uploaded_by,client_id,task_id,archived_at from file_documents where id=${fileId} and workspace_id=${W} limit 1`)),file=files[0];if(!file)throw new VivitoActionError("Uploaded file was not found.",404);if(file.archived_at)throw new VivitoActionError("Archived files cannot be attached.",409);if(role!=="SUPER_ADMIN"&&file.uploaded_by!==userId)throw new VivitoActionError("You can only attach a file you uploaded.",403);const client=await findClient(args.clientName,role,userId,false);let taskId:string|null=null;if(clean(args.taskId)||clean(args.taskTitle)){const task=await findTask({...args,clientName:client.company_name},role,userId,false);if(task.client_id!==client.id)throw new VivitoActionError("Task does not belong to the selected client.",409);if(role==="CREATOR"&&task.assigned_to_id!==userId)throw new VivitoActionError("This task is not assigned to you.",403);taskId=task.id}else if(role==="CREATOR"){const assigned=rows(await db.execute(sql`select id from creative_tasks where workspace_id=${W} and client_id=${client.id} and assigned_to_id=${userId} and archived_at is null limit 1`));if(!assigned.length)throw new VivitoActionError("You do not have an active task for this client.",403)}const category=clean(args.category||"CREATIVE",40).toUpperCase();if(!FILE_CATEGORIES.has(category))throw new VivitoActionError("Invalid file category.");if(role==="ACCOUNTANT"&&!new Set(["CONTRACT","INVOICE","FINANCE","SHEET"]).has(category))throw new VivitoActionError("Accountant attachments must use a finance/document category.",403);await db.execute(sql`update file_documents set client_id=${client.id},task_id=${taskId},category=${category} where id=${file.id} and workspace_id=${W}`);await audit(userId,"vivito_file_attached","file_documents",file.id,{fileName:file.name,clientId:client.id,clientName:client.company_name,taskId,category});return{success:true,action:"attach_file",entityId:file.id,message:`${file.name} attached to ${client.company_name}.`,link:"/dashboard/files"};
}

async function reminderAction(args:any,userId:string){const title=clean(args.title||"VIVITO reminder",160),message=clean(args.message||title,1000),linkRaw=clean(args.link||"/dashboard/today",500),link=linkRaw.startsWith("/")&&!linkRaw.startsWith("//")?linkRaw:"/dashboard/today";const [row]=await db.insert(notifications).values({userId,type:"VIVITO_REMINDER",title,message,link,priority:"normal"} as any).returning();await audit(userId,"vivito_reminder_created","notifications",row.id,{title,link});return{success:true,action:"remind_me",entityId:row.id,message:"Reminder created.",link};}

export async function executeVivitoAction(op:VivitoActionOp,args:any,role:string,userId:string){
 authorizeOp(role,op);
 if(op==="create_client")return createClientAction(args,role,userId);
 if(["archive_client","restore_client","delete_client"].includes(op))return clientLifecycle(op,args,role,userId);
 if(op==="create_task")return createTaskAction(args,role,userId);
 if(["archive_task","restore_task","delete_task"].includes(op))return taskLifecycle(op,args,role,userId);
 if(op==="log_expense")return logExpenseAction(args,userId);
 if(op==="record_payment")return recordPaymentAction(args,role,userId);
 if(op==="create_invoice")return createInvoiceAction(args,role,userId);
 if(op==="attach_file")return attachFileAction(args,role,userId);
 if(op==="remind_me")return reminderAction(args,userId);
 throw new VivitoActionError("Unsupported VIVITO action.");
}
