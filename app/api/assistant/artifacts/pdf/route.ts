export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {renderVivitoPdf,VivitoPdfRenderError} from "@/lib/vivito/pdf-renderer";
import {renderVivitoPrintHtml,vivitoPdfNeedsPrintRenderer} from "@/lib/vivito/print-renderer";
import type {VivitoPdfSpec} from "@/lib/vivito/artifact-intelligence";

const safe=(s:string)=>String(s||"vivito-report").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,80)||"vivito-report";
export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);if(!body?.spec)return NextResponse.json({error:"PDF spec is required."},{status:400});const spec=body.spec as VivitoPdfSpec;
 try{
  if(vivitoPdfNeedsPrintRenderer(spec)||body.renderMode==="print"){
   const html=renderVivitoPrintHtml(spec),name=safe(body.fileName||spec.title)+".html";return new NextResponse(html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`inline; filename="${name}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-VIVITO-Render-Mode":"browser-print","Content-Security-Policy":"default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"}})
  }
  const bytes=renderVivitoPdf(spec),name=safe(body.fileName||spec.title)+".pdf",payload=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;return new NextResponse(payload,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${name}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-VIVITO-Render-Mode":"binary"}})
 }catch(error){if(error instanceof VivitoPdfRenderError)return NextResponse.json({error:error.message},{status:error.status});console.error("VIVITO PDF render failed",error);return NextResponse.json({error:"PDF rendering failed safely."},{status:500})}
}
