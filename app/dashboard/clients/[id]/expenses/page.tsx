export const dynamic="force-dynamic";

import Link from "next/link";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {auth} from "@/lib/auth";
import {db,sql,auditLogs} from "@/lib/db";
import {Role} from "@/lib/types";

const categories=["Production","Freelancers","Media","Tools","Travel","Office","Other"];
const money=(value:number|string,currency:string)=>new Intl.NumberFormat("en-EG",{style:"currency",currency,maximumFractionDigits:2}).format(Number(value||0));

async function addClientExpense(formData:FormData){
  "use server";
  const session=await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const role=session.user.role as Role;
  if(![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(role))throw new Error("Only Accountant or Super Admin can add client expenses.");
  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");
  const clientId=String(formData.get("clientId")||"").trim();
  const category=String(formData.get("category")||"").trim();
  const description=String(formData.get("description")||"").trim().slice(0,500);
  const amount=Number(formData.get("amount"));
  const currency=String(formData.get("currency")||"EGP").trim().toUpperCase().slice(0,3);
  const expenseDate=String(formData.get("expenseDate")||"").trim();
  if(!workspaceId||!userId||!clientId)throw new Error("Client context unavailable");
  if(!categories.includes(category)||!description||!Number.isFinite(amount)||amount<=0||!/^[A-Z]{3}$/.test(currency)||!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate))throw new Error("Invalid expense data");

  const clientRows=Array.from(await db.execute(sql`select id,company_name from clients where id=${clientId} and workspace_id=${workspaceId} and is_active=true limit 1`)) as Array<{id:string;company_name:string}>;
  const client=clientRows[0];
  if(!client)throw new Error("Client is archived or unavailable");
  const expenseId=crypto.randomUUID();
  await db.transaction(async tx=>{
    await tx.execute(sql`insert into client_expenses(id,workspace_id,client_id,category,description,amount,currency,expense_date,created_by,created_at,updated_at) values(${expenseId},${workspaceId},${clientId},${category},${description},${amount},${currency},${expenseDate}::date,${userId},now(),now())`);
    await tx.insert(auditLogs).values({workspaceId,userId,action:"client_expense_created",entity:"client_expenses",entityId:expenseId,newValues:JSON.stringify({clientId,companyName:client.company_name,category,description,amount,currency,expenseDate})});
  });
  revalidatePath(`/dashboard/clients/${clientId}/expenses`);
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export default async function ClientExpensesPage({params}:{params:Promise<{id:string}>}){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=session.user.role as Role,workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId)redirect("/login");
  if(![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes(role))redirect("/dashboard/clients");
  const {id}=await params;
  const clientRows=Array.from(await db.execute(sql`select id,company_name,currency from clients where id=${id} and workspace_id=${workspaceId} and is_active=true limit 1`)) as Array<{id:string;company_name:string;currency:string}>;
  const client=clientRows[0];
  if(!client)redirect("/dashboard/clients");
  const rows=Array.from(await db.execute(sql`select id,category,description,amount,currency,expense_date::text,created_at::text from client_expenses where workspace_id=${workspaceId} and client_id=${id} and archived_at is null order by expense_date desc,created_at desc limit 100`)) as Array<{id:string;category:string;description:string;amount:number|string;currency:string;expense_date:string;created_at:string}>;
  const total=rows.reduce((sum,row)=>sum+Number(row.amount||0),0),today=new Date().toISOString().slice(0,10),currency=String(client.currency||"EGP").toUpperCase();

  return <div style={{display:"grid",gap:18}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",flexWrap:"wrap"}}><div><h1 className="page-title">{client.company_name} · Expenses</h1><p className="page-subtitle">Expenses recorded specifically against this client. Company-wide expenses stay separate.</p></div><Link href={`/dashboard/clients/${id}`} className="btn btn-secondary" style={{textDecoration:"none"}}>Back to client</Link></div>
    <div className="card" style={{padding:18}}><div style={{fontSize:12,color:"var(--text-muted)",fontWeight:800}}>CLIENT EXPENSE TOTAL</div><div style={{fontSize:28,fontWeight:900,marginTop:6}}>{money(total,currency)}</div></div>
    <div className="card"><div className="card-header"><div><div className="card-title">Add expense</div><div className="page-subtitle">The client is already selected. No client ID or manual linking is needed.</div></div></div><div className="card-body"><form action={addClientExpense} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><input type="hidden" name="clientId" value={id}/><select name="category" className="form-select" required>{categories.map(category=><option key={category}>{category}</option>)}</select><input name="description" className="form-input" required maxLength={500} placeholder="What was this expense for?"/><input name="amount" className="form-input" required type="number" min="0.01" step="0.01" placeholder="Amount"/><input name="currency" className="form-input" required defaultValue={currency} maxLength={3} pattern="[A-Za-z]{3}"/><input name="expenseDate" className="form-input" required type="date" defaultValue={today}/><button className="btn btn-primary" type="submit">Save client expense</button></form></div></div>
    <div className="card"><div className="card-header"><div className="card-title">Expense history</div><span className="badge badge-gray">{rows.length}</span></div><div className="card-body-flush">{rows.length===0?<div className="empty-state"><p>No client expenses yet.</p></div>:<div className="responsive-table"><table className="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.expense_date}</td><td>{row.category}</td><td>{row.description}</td><td><b>{money(row.amount,row.currency||currency)}</b></td></tr>)}</tbody></table></div>}</div></div>
  </div>;
}
