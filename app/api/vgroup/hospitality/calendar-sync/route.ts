import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {syncAirbnbChannel} from "@/lib/vgroup/airbnb-sync-service";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","reservations:create");
    const body=await request.json().catch(()=>null) as {channelId?:string}|null;
    const channelId=String(body?.channelId??"");
    if(!uuid.test(channelId))return NextResponse.json({error:"Invalid channel id"},{status:400,headers:NO_STORE});
    try{return NextResponse.json(await syncAirbnbChannel(channelId,session.userId),{headers:NO_STORE})}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Airbnb calendar sync failed"},{status:502,headers:NO_STORE})}
  }catch(error){return apiErrorResponse(error)}
}
