export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {renderVivitoPdf,VivitoPdfRenderError} from "@/lib/vivito/pdf-renderer";
import type {VivitoPdfSpec} from "@/lib/vivito/artifact-intelligence";

const safe=(s:string)=>String(s||"vivito-report").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,80)||"vivito-report";
export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);if(!body?.spec)return NextResponse.json({error:"PDF spec is required."},{status:400});
 try{const bytes=renderVivitoPdf(body.spec as VivitoPdfSpec),name=safe(body.fileName||body.spec.title)+".pdf",payload=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;return new NextResponse(payload,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${name}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}catch(error){if(error instanceof VivitoPdfRenderError)return NextResponse.json({error:error.message},{status:error.status});console.error("VIVITO PDF render failed",error);return NextResponse.json({error:"PDF rendering failed safely."},{status:500})}
}
