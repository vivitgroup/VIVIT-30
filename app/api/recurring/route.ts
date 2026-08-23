// @ts-nocheck -- Drizzle's generated recurring shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, financeRecords, notifications, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const money=(n:number)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});

  const now=new Date(),month=now.getMonth()+1,year=now.getFullYear();
  const generated:string[]=[];
  const activeClients=await db.select().from(clients).where(eq(clients.isActive,true));
  const admins=await db.select({id:users.id}).from(users).where(and(eq(users.role,"SUPER_ADMIN"),eq(users.isActive,true)));

  for(const client of activeClients){
    const retainer=Number(client.monthlyRetainer||0);
    if(!Number.isFinite(retainer)||retainer<=0)continue;
    const existing=await db.select({id:financeRecords.id}).from(financeRecords)
      .where(and(eq(financeRecords.clientId,client.id),eq(financeRecords.month,month),eq(financeRecords.year,year))).limit(1);
    if(existing.length)continue;
    const dueDate=new Date(year,month-1,15);
    await db.insert(financeRecords).values({
      clientId:client.id,month,year,retainer,mediaBuyingFee:0,extraServices:0,
      totalRevenue:retainer,paid:0,outstanding:retainer,invoiceStatus:"SENT",
      invoiceNumber:`INV-${year}-${String(month).padStart(2,"0")}-${client.companyName.replace(/\s/g,"").slice(0,4).toUpperCase()}`,
      dueDate,
    });
    for(const admin of admins){
      await db.insert(notifications).values({
        userId:admin.id,type:"GENERAL",priority:"normal",
        title:`🧾 Invoice generated: ${client.companyName}`,
        message:`Monthly retainer invoice of ${money(retainer)} for ${month}/${year} created.`,
        link:"/dashboard/finance",
      });
    }
    generated.push(client.companyName);
  }
  return NextResponse.json({success:true,generated:generated.length,clients:generated,month,year});
}

export async function GET(req: NextRequest) {
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});

  const now=new Date(),month=now.getMonth()+1,year=now.getFullYear();
  const activeClients=await db.select({id:clients.id,companyName:clients.companyName,monthlyRetainer:clients.monthlyRetainer})
    .from(clients).where(eq(clients.isActive,true));
  const pending:typeof activeClients=[];
  for(const c of activeClients){
    if(Number(c.monthlyRetainer||0)<=0)continue;
    const existing=await db.select({id:financeRecords.id}).from(financeRecords)
      .where(and(eq(financeRecords.clientId,c.id),eq(financeRecords.month,month),eq(financeRecords.year,year))).limit(1);
    if(!existing.length)pending.push(c);
  }
  const dueDate=new Date(year,month-1,15);
  const preview=pending.map(c=>({clientId:c.id,clientName:c.companyName,retainer:c.monthlyRetainer,willGenerate:true,alreadyDone:false,dueDate:dueDate.toLocaleDateString("en-GB")}));
  return NextResponse.json({pending,preview,count:pending.length,month,year,totalAmount:pending.reduce((s,c)=>s+Number(c.monthlyRetainer||0),0),message:`${pending.length} invoice(s) ready to generate for ${new Date(year,month-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"})}`});
}
