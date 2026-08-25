export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {buildOperatingIntelligence} from "@/lib/copilot/intelligence";
export async function GET(){const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});const role=String((s.user as any).role||"CLIENT"),userId=String((s.user as any).id||"");const data=await buildOperatingIntelligence({role,userId});return NextResponse.json({role,...data,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"private, no-store"}})}
