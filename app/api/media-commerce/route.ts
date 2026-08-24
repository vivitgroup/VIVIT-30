export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,clients} from "@/lib/db";
import {and,eq,sql} from "drizzle-orm";

export async function GET(){
 try{
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");if(!["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"].includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
  const owned=await db.select({id:clients.id}).from(clients).where(and(eq(clients.isActive,true),role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):eq(clients.workspaceId,"default")));
  const ids=owned.map(x=>x.id);if(!ids.length)return NextResponse.json({campaigns:[]});
  const idList=sql.join(ids.map(id=>sql`${id}`),sql`, `);
  const rows=Array.from(await db.execute(sql`select c.id as campaign_id, c.client_id, c.platform, c.external_id, c.name, coalesce(sum(p.add_to_cart),0)::int as add_to_cart, coalesce(sum(p.purchases),0)::int as purchases, coalesce(sum(p.revenue),0)::float as revenue from ad_campaigns c left join ad_performance_daily p on p.campaign_id=c.id and p.date >= now()-interval '31 days' and p.breakdown_type='TOTAL' and p.ad_id is null where c.client_id in (${idList}) group by c.id,c.client_id,c.platform,c.external_id,c.name order by c.updated_at desc`));
  return NextResponse.json({campaigns:rows});
 }catch(error){
  console.error("/api/media-commerce failed",error);
  return NextResponse.json({campaigns:[],error:"Failed to load media commerce data"},{status:500});
 }
}
