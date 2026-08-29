export const dynamic="force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, financeRecords, notifications, users, workspaces } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const money=(n:number,currency="EGP")=>new Intl.NumberFormat("en-EG",{style:"currency",currency,maximumFractionDigits:0}).format(Number(n||0));

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=String((session.user as any).workspaceId||"");
  if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});

  const now=new Date(),month=now.getMonth()+1,year=now.getFullYear();
  const generated:string[]=[];
  const [activeClients,admins,workspace]=await Promise.all([
    db.select().from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))),
    db.select({id:users.id}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"SUPER_ADMIN"),eq(users.isActive,true))),
    db.select({currency:workspaces.currency}).from(workspaces).where(eq(workspaces.id,workspaceId)).limit(1).then(r=>r[0])
  ]);
  const currency=workspace?.currency||"EGP";

  for(const client of activeClients){
    const retainer=Number(client.monthlyRetainer||0);
    if(!Number.isFinite(retainer)||retainer<=0)continue;
    const existing=await db.select({id:financeRecords.id}).from(financeRecords)
      .where(and(eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.clientId,client.id),eq(financeRecords.month,month),eq(financeRecords.year,year))).limit(1);
    if(existing.length)continue;
    const dueDate=new Date(year,month-1,15);
    await db.insert(financeRecords).values({
      workspaceId:workspaceId,clientId:client.id,month,year,retainer,mediaBuyingFee:0,extraServices:0,
      totalRevenue:retainer,paid:0,outstanding:retainer,invoiceStatus:"SENT",
      invoiceNumber:`INV-${year}-${String(month).padStart(2,"0")}-${client.companyName.replace(/\s/g,"").slice(0,4).toUpperCase()}`,
      dueDate,
    });
    for(const admin of admins){
      await db.insert(notifications).values({
        workspaceId:workspaceId,userId:admin.id,type:"GENERAL",priority:"normal",
        title:`🧾 Invoice generated: ${client.companyName}`,
        message:`Monthly retainer invoice of ${money(retainer,currency)} for ${month}/${year} created.`,
        link:"/dashboard/finance",
      });
    }
    generated.push(client.companyName);
  }
  return NextResponse.json({success:true,generated:generated.length,clients:generated,month,year,currency},{headers:{"Cache-Control":"private, no-store"}});
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=String((session.user as any).workspaceId||"");
  if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});

  const now=new Date(),month=now.getMonth()+1,year=now.getFullYear();
  const [activeClients,workspace]=await Promise.all([
    db.select({id:clients.id,companyName:clients.companyName,monthlyRetainer:clients.monthlyRetainer})
      .from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))),
    db.select({currency:workspaces.currency}).from(workspaces).where(eq(workspaces.id,workspaceId)).limit(1).then(r=>r[0])
  ]);
  const pending:typeof activeClients=[];
  for(const c of activeClients){
    if(Number(c.monthlyRetainer||0)<=0)continue;
    const existing=await db.select({id:financeRecords.id}).from(financeRecords)
      .where(and(eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.clientId,c.id),eq(financeRecords.month,month),eq(financeRecords.year,year))).limit(1);
    if(!existing.length)pending.push(c);
  }
  const dueDate=new Date(year,month-1,15),currency=workspace?.currency||"EGP";
  const preview=pending.map(c=>({clientId:c.id,clientName:c.companyName,retainer:c.monthlyRetainer,currency,willGenerate:true,alreadyDone:false,dueDate:dueDate.toLocaleDateString("en-GB")}));
  return NextResponse.json({pending,preview,count:pending.length,month,year,currency,totalAmount:pending.reduce((s,c)=>s+Number(c.monthlyRetainer||0),0),message:`${pending.length} invoice(s) ready to generate for ${new Date(year,month-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"})}`},{headers:{"Cache-Control":"private, no-store"}});
}
