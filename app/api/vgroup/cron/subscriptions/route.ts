import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

function safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}

export async function POST(request:Request){
  const configured=process.env.VGROUP_CRON_SECRET;
  const supplied=request.headers.get("x-vgroup-cron-secret")??"";
  if(!configured||!supplied||!safeEqual(configured,supplied))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const sql=getVGroupSql();
    const [row]=await sql`select tech.generate_due_subscription_invoices(now())::int generated`;
    return NextResponse.json({generated:Number(row?.generated??0),ranAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("VGROUP_SUBSCRIPTION_CRON",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Billing run failed"},{status:500})}
}
