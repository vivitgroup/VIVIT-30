import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {syncAllAirbnbChannels} from "@/lib/vgroup/airbnb-sync-service";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};

export async function POST(){
  try{
    const session=await requireApiPermission("hospitality","reservations:create");
    const result=await syncAllAirbnbChannels(session.userId);
    return NextResponse.json({ok:result.failed===0,...result},{status:result.total===0?409:200,headers:NO_STORE});
  }catch(error){return apiErrorResponse(error)}
}
