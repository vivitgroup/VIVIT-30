import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {GET as runMediaCron} from "@/app/api/cron/media-sync/route";

export const dynamic="force-dynamic";
export const maxDuration=300;

const STAFF_ROLES=new Set(["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER","ACCOUNTANT","CREATOR","SALES"]);
const NO_STORE={"Cache-Control":"private, no-store"};

type ExistsRow={stale:boolean};
type ClaimRow={claimed:boolean};

export async function POST(req:NextRequest){
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:NO_STORE});
  const role=String(session.user.role||"");
  if(!STAFF_ROLES.has(role))return NextResponse.json({error:"Forbidden"},{status:403,headers:NO_STORE});

  const [staleRow]=Array.from(await db.execute<ExistsRow>(sql`
    select exists(
      select 1 from ad_campaigns
      where archived_at is null
        and (last_sync_at is null or last_sync_at < now()-interval '10 minutes')
    ) as stale
  `));
  if(!staleRow?.stale)return NextResponse.json({success:true,skipped:"fresh"},{headers:NO_STORE});

  const claim=Array.from(await db.execute<ClaimRow>(sql`
    insert into system_maintenance_state(maintenance_key,last_started_at,last_status,updated_at)
    values('media-sync',now(),'running',now())
    on conflict (maintenance_key) do update
      set last_started_at=excluded.last_started_at,last_status='running',updated_at=now()
      where system_maintenance_state.last_started_at is null
         or system_maintenance_state.last_started_at < now()-interval '10 minutes'
    returning true as claimed
  `));
  if(!claim.length)return NextResponse.json({success:true,skipped:"globally-throttled"},{headers:NO_STORE});

  const secret=String(process.env.CRON_SECRET||"");
  if(!secret){
    await db.execute(sql`update system_maintenance_state set last_status='unavailable',updated_at=now() where maintenance_key='media-sync'`);
    return NextResponse.json({error:"Media sync unavailable"},{status:503,headers:NO_STORE});
  }

  try{
    const cronReq=new NextRequest(new URL("/api/cron/media-sync",req.nextUrl.origin),{headers:{authorization:`Bearer ${secret}`}});
    const response=await runMediaCron(cronReq);
    const body=await response.text();
    await db.execute(sql`
      update system_maintenance_state
      set last_completed_at=now(),last_status=${response.ok?"success":"failed"},updated_at=now()
      where maintenance_key='media-sync'
    `);
    return new NextResponse(body,{status:response.status,headers:{"Content-Type":"application/json",...NO_STORE}});
  }catch{
    await db.execute(sql`update system_maintenance_state set last_completed_at=now(),last_status='failed',updated_at=now() where maintenance_key='media-sync'`);
    return NextResponse.json({error:"Media sync failed"},{status:502,headers:NO_STORE});
  }
}
