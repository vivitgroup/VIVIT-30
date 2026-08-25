export const dynamic="force-dynamic";
export const maxDuration=120;
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {generateImage} from "@/lib/copilot/provider";
const ALLOWED=["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"];
export async function POST(req:NextRequest){const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});const role=String((s.user as any).role||"");if(!ALLOWED.includes(role))return NextResponse.json({error:"Your role cannot generate creative images."},{status:403});const body=await req.json().catch(()=>({})),prompt=String(body.prompt||"").trim().slice(0,3000),size=String(body.size||"1024x1024"),referenceDataUrl=body.referenceDataUrl?String(body.referenceDataUrl):null;if(!prompt)return NextResponse.json({error:"Prompt is required."},{status:400});if(!["1024x1024","1536x1024","1024x1536"].includes(size))return NextResponse.json({error:"Unsupported size."},{status:400});try{const out=await generateImage({prompt,size,referenceDataUrl});return NextResponse.json({image:out.b64?`data:image/png;base64,${out.b64}`:out.url,provider:out.provider})}catch(e:any){return NextResponse.json({error:String(e?.message||"Image generation failed").slice(0,400)},{status:503})}}
