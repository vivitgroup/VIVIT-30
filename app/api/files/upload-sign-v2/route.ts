export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";

const BUCKET="vivit-files";
const MAX_SIZE=500*1024*1024;
const ALLOWED_MIME=new Set([
 "application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 "application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation",
 "text/plain","text/csv","image/jpeg","image/png","image/webp","image/gif",
 "video/mp4","video/quicktime","video/webm","audio/mpeg","audio/wav","audio/x-wav"
]);
const DANGEROUS_EXT=/\.(?:exe|dll|msi|bat|cmd|com|scr|ps1|psm1|vbs|vbe|js|mjs|cjs|jar|apk|dmg|pkg|sh|bash|zsh|php|py|rb|pl|cgi|htm|html|xhtml|svg|svgz)$/i;
const clean=(v:unknown,n=255)=>String(v||"").trim().slice(0,n);
const safeName=(name:string)=>name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(-140)||"file";
const base=()=>String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const storageHeaders=()=>({apikey:process.env.SUPABASE_SERVICE_KEY!,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY!}`});
const resumableEndpoint=()=>{try{const u=new URL(base()),projectRef=u.hostname.split(".")[0];return projectRef?`https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable/sign`:null}catch{return null}};

async function ensureBucketPolicy(){
 const get=await fetch(`${base()}/storage/v1/bucket/${BUCKET}`,{headers:storageHeaders(),cache:"no-store"});
 const current=await get.json().catch(()=>({})) as Record<string,unknown>;
 const desired=[...ALLOWED_MIME].sort();
 if(get.status===404){
  const create=await fetch(`${base()}/storage/v1/bucket`,{method:"POST",headers:{...storageHeaders(),"Content-Type":"application/json"},body:JSON.stringify({id:BUCKET,name:BUCKET,public:false,file_size_limit:MAX_SIZE,allowed_mime_types:desired})});
  if(!create.ok)throw new Error("Storage bucket could not be created.");
  return;
 }
 if(!get.ok)throw new Error("Storage bucket is unavailable.");
 const currentLimit=Number(current.file_size_limit||current.fileSizeLimit||0);
 const currentPublic=Boolean(current.public);
 const rawMime=Array.isArray(current.allowed_mime_types)?current.allowed_mime_types:Array.isArray(current.allowedMimeTypes)?current.allowedMimeTypes:[];
 const currentMime=rawMime.map(x=>String(x)).sort();
 const policyMatches=currentLimit>=MAX_SIZE&&!currentPublic&&currentMime.length===desired.length&&desired.every((m,i)=>currentMime[i]===m);
 if(policyMatches)return;
 const update=await fetch(`${base()}/storage/v1/bucket/${BUCKET}`,{method:"PUT",headers:{...storageHeaders(),"Content-Type":"application/json"},body:JSON.stringify({id:BUCKET,name:BUCKET,public:false,file_size_limit:Math.max(currentLimit,MAX_SIZE),allowed_mime_types:desired})});
 if(!update.ok){const d=await update.json().catch(()=>({})) as Record<string,unknown>;throw new Error(String(d.message||d.error||"Storage rejected the required bucket policy."))}
}

export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!base()||!process.env.SUPABASE_SERVICE_KEY)return NextResponse.json({error:"Storage is not configured."},{status:503});
 const u=session.user as unknown as Record<string,unknown>;
 const workspaceId=clean(u.workspaceId,160),userId=clean(u.id,160);
 if(!workspaceId||!userId)return NextResponse.json({error:"Workspace session is incomplete."},{status:403});
 const body=await req.json().catch(()=>null) as null|Record<string,unknown>;
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const name=clean(body.name),size=Number(body.size||0),mime=clean(body.mimeType,160).toLowerCase();
 if(!name||!Number.isFinite(size)||size<=0)return NextResponse.json({error:"Choose a valid file."},{status:400});
 if(size>MAX_SIZE)return NextResponse.json({error:"Maximum file size is 500 MB."},{status:413});
 if(DANGEROUS_EXT.test(name)||!ALLOWED_MIME.has(mime))return NextResponse.json({error:"This file type is not allowed."},{status:415});
 try{await ensureBucketPolicy()}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Storage bucket is unavailable."},{status:503})}
 const path=`${workspaceId}/${new Date().getFullYear()}/${userId}/${crypto.randomUUID()}-${safeName(name)}`;
 const signed=await fetch(`${base()}/storage/v1/object/upload/sign/${BUCKET}/${path}`,{method:"POST",headers:{...storageHeaders(),"Content-Type":"application/json"},body:"{}"});
 const data=await signed.json().catch(()=>({})) as Record<string,unknown>;
 if(!signed.ok)return NextResponse.json({error:String(data.message||data.error||"Could not prepare the upload.")},{status:502});
 const relative=String(data.url||data.signedURL||data.signedUrl||"");
 const token=String(data.token||"");
 if(!relative||!token)return NextResponse.json({error:"Storage did not return a complete signed upload contract."},{status:502});
 return NextResponse.json({uploadUrl:relative.startsWith("http")?relative:`${base()}/storage/v1${relative}`,resumableEndpoint:resumableEndpoint(),token,path,bucket:BUCKET,maxSize:MAX_SIZE,resumableThreshold:6*1024*1024,chunkSize:6*1024*1024,expectedMimeType:mime},{headers:{"Cache-Control":"private, no-store"}});
}
