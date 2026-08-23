export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, creativeTasks, clients, users, financeRecords, notifications } from "@/lib/db";
import { eq, inArray, lte, and } from "drizzle-orm";

const TASK_STATUSES=["PENDING","IN_PROGRESS","REVIEW","REVISION","APPROVED","COMPLETED","REJECTED"];

async function managedClientIds(role:string,userId:string){
  if(role==="SUPER_ADMIN") return null;
  if(role!=="ACCOUNT_MANAGER") return [] as string[];
  return (await db.select({id:clients.id}).from(clients).where(and(eq(clients.accountManagerId,userId),eq(clients.isActive,true)))).map(c=>c.id);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role=String((session.user as any).role||"");
  const userId=String((session.user as any).id||"");
  let payload:any;
  try{payload=await req.json();}catch{return NextResponse.json({error:"Invalid JSON body"},{status:400});}
  const action=String(payload?.action||"");
  const ids=Array.from(new Set((Array.isArray(payload?.ids)?payload.ids:[]).map((v:any)=>String(v)).filter(Boolean))).slice(0,100);
  const data=payload?.data&&typeof payload.data==="object"?payload.data:{};
  const updated:string[]=[];

  switch(action) {
    case "tasks.status": {
      if (!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if(!ids.length||!TASK_STATUSES.includes(String(data.status||""))) return NextResponse.json({error:"Invalid task IDs or status"},{status:400});
      let where:any=inArray(creativeTasks.id,ids);
      if(role==="ACCOUNT_MANAGER"){
        const owned=await managedClientIds(role,userId); if(!owned?.length) return NextResponse.json({success:true,updated:0,ids:[]});
        where=and(inArray(creativeTasks.id,ids),inArray(creativeTasks.clientId,owned));
      }
      const rows=await db.update(creativeTasks).set({status:String(data.status) as any,updatedAt:new Date()}).where(where).returning({id:creativeTasks.id});
      updated.push(...rows.map(r=>r.id));
      break;
    }
    case "tasks.assign": {
      if (!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const assignedToId=String(data.assignedToId||"");
      if(!ids.length||!assignedToId) return NextResponse.json({error:"Task IDs and creator are required"},{status:400});
      const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,assignedToId),eq(users.role,"CREATOR"),eq(users.isActive,true))).limit(1);
      if(!creator) return NextResponse.json({error:"Selected creator is not active"},{status:400});
      let where:any=inArray(creativeTasks.id,ids);
      if(role==="ACCOUNT_MANAGER"){
        const owned=await managedClientIds(role,userId); if(!owned?.length) return NextResponse.json({success:true,updated:0,ids:[]});
        where=and(inArray(creativeTasks.id,ids),inArray(creativeTasks.clientId,owned));
      }
      const rows=await db.update(creativeTasks).set({assignedToId,updatedAt:new Date()}).where(where).returning({id:creativeTasks.id});
      updated.push(...rows.map(r=>r.id));
      break;
    }
    case "clients.recalculate":
    case "clients.update_health": {
      if(role!=="SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
      const base=process.env.NEXTAUTH_URL??new URL(req.url).origin;
      const cookie=req.headers.get("cookie")||"";
      const result=await fetch(`${base}/api/performance-score`,{method:"POST",headers:{"Content-Type":"application/json",cookie},body:"{}"});
      if(!result.ok) return NextResponse.json({error:"Health recalculation failed"},{status:502});
      const response=await result.json().catch(()=>({}));
      return NextResponse.json({success:true,action:"health_recalculated",processed:response.processed??null});
    }
    case "clients.export": {
      if(!["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)) return NextResponse.json({error:"Forbidden"},{status:403});
      const condition=role==="ACCOUNT_MANAGER"?and(eq(clients.isActive,true),eq(clients.accountManagerId,userId))
        :role==="MEDIA_BUYER"?and(eq(clients.isActive,true),eq(clients.mediaBuyerId,userId))
        :eq(clients.isActive,true);
      const rows=await db.select().from(clients).where(condition);
      return NextResponse.json({data:rows,count:rows.length});
    }
    case "tasks.export": {
      if(!["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"].includes(role)) return NextResponse.json({error:"Forbidden"},{status:403});
      let condition:any=ids.length?inArray(creativeTasks.id,ids):undefined;
      if(role==="ACCOUNT_MANAGER"){
        const owned=await managedClientIds(role,userId); if(!owned?.length)return NextResponse.json({data:[],count:0});
        condition=ids.length?and(inArray(creativeTasks.id,ids),inArray(creativeTasks.clientId,owned)):inArray(creativeTasks.clientId,owned);
      }else if(role==="CREATOR"){
        condition=ids.length?and(inArray(creativeTasks.id,ids),eq(creativeTasks.assignedToId,userId)):eq(creativeTasks.assignedToId,userId);
      }
      const rows=condition?await db.select().from(creativeTasks).where(condition):await db.select().from(creativeTasks);
      return NextResponse.json({data:rows,count:rows.length});
    }
    case "tasks.notify": {
      if(!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)) return NextResponse.json({error:"Forbidden"},{status:403});
      if(!ids.length)return NextResponse.json({success:true,notified:0});
      let condition:any=inArray(creativeTasks.id,ids);
      if(role==="ACCOUNT_MANAGER"){
        const owned=await managedClientIds(role,userId); if(!owned?.length)return NextResponse.json({success:true,notified:0});
        condition=and(inArray(creativeTasks.id,ids),inArray(creativeTasks.clientId,owned));
      }
      const tasks=await db.select({id:creativeTasks.id,title:creativeTasks.title,assignedToId:creativeTasks.assignedToId}).from(creativeTasks).where(condition);
      let notified=0;
      for(const t of tasks){if(!t.assignedToId)continue;await db.insert(notifications).values({userId:t.assignedToId,type:"DEADLINE_UPCOMING",priority:"high",title:`📬 Reminder: ${t.title}`,message:"Your task needs attention — please check the latest status.",link:`/dashboard/creative/${t.id}`} as any);notified++;}
      return NextResponse.json({success:true,notified});
    }
    case "invoices.mark_overdue": {
      if(!["SUPER_ADMIN","ACCOUNTANT"].includes(role)) return NextResponse.json({error:"Forbidden"},{status:403});
      const now2=new Date();
      const rows=await db.update(financeRecords).set({invoiceStatus:"OVERDUE" as any} as any)
        .where(and(lte(financeRecords.dueDate!,now2),eq(financeRecords.invoiceStatus,"SENT" as any))).returning({id:financeRecords.id});
      return NextResponse.json({success:true,action:"overdue_marked",updated:rows.length});
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, updated: updated.length, ids: updated });
}
