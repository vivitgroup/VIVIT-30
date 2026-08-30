export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {analyzeVivitoImage} from "@/lib/vivito/multimodal";
export async function POST(req:NextRequest){const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});const body=await req.json().catch(()=>null);if(!body?.base64||!body?.mimeType)return NextResponse.json({error:"Image data and MIME type are required."},{status:400});try{const result=await analyzeVivitoImage({base64:String(body.base64),mimeType:String(body.mimeType),prompt:String(body.prompt||"")});return NextResponse.json({success:true,...result},{headers:{"Cache-Control":"private, no-store"}})}catch(e){const m=e instanceof Error?e.message:"Vision analysis failed.";return NextResponse.json({error:m},{status:m.includes("not-configured")?503:422})}}
