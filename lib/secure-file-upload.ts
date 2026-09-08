import {clearSavedTus,loadSavedTusContract,uploadTus,type TusUploadContract} from "@/lib/tus-browser";

export type SignedUpload={
 uploadUrl:string;
 resumableEndpoint?:string|null;
 token?:string|null;
 path:string;
 bucket?:string;
 maxSize:number;
 resumableThreshold?:number;
 chunkSize?:number;
 expectedMimeType:string;
};

const DEFAULT_RESUMABLE_THRESHOLD=6*1024*1024;

async function signFile(file:File){
 const response=await fetch("/api/files/upload-sign-v2",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name:file.name,size:file.size,mimeType:file.type})
 });
 const signed=await response.json().catch(()=>({})) as SignedUpload&{error?:string};
 if(!response.ok)throw new Error(signed.error||"Could not prepare upload");
 return signed;
}

function tusContract(signed:SignedUpload):TusUploadContract{
 if(!signed.resumableEndpoint||!signed.token||!signed.bucket||!signed.chunkSize){
  throw new Error("Storage did not return a resumable upload contract.");
 }
 return {
  resumableEndpoint:signed.resumableEndpoint,
  token:signed.token,
  path:signed.path,
  bucket:signed.bucket,
  chunkSize:signed.chunkSize
 };
}

function uploadStandard(file:File,url:string,onProgress?:(progress:number)=>void){
 return new Promise<void>((resolve,reject)=>{
  const xhr=new XMLHttpRequest();
  xhr.open("PUT",url);
  xhr.setRequestHeader("x-upsert","false");
  xhr.upload.onprogress=event=>{
   if(event.lengthComputable)onProgress?.(Math.round(event.loaded/event.total*100));
  };
  xhr.onerror=()=>reject(new Error("Network error while uploading."));
  xhr.onload=()=>{
   if(xhr.status>=200&&xhr.status<300){onProgress?.(100);resolve();return;}
   let message=`Storage rejected the file (${xhr.status}).`;
   try{const data=JSON.parse(xhr.responseText) as {message?:string;error?:string};message=data.message||data.error||message}catch{}
   reject(new Error(message));
  };
  const body=new FormData();
  body.append("cacheControl","3600");
  body.append("",file,file.name);
  xhr.send(body);
 });
}

export async function uploadSecureFile(file:File,onProgress?:(progress:number)=>void){
 const signed=await signFile(file);
 const threshold=Number(signed.resumableThreshold||DEFAULT_RESUMABLE_THRESHOLD);
 if(file.size<=threshold){
  await uploadStandard(file,signed.uploadUrl,onProgress);
  return {path:signed.path,mode:"standard" as const};
 }

 let contract=loadSavedTusContract(file);
 let fresh=false;
 if(!contract){contract=tusContract(signed);fresh=true}
 let path=contract.path;
 try{
  await uploadTus({file,contract,onProgress:onProgress||(()=>{})});
 }catch(firstError){
  if(fresh)throw firstError;
  clearSavedTus(file);
  const replacement=await signFile(file);
  contract=tusContract(replacement);
  path=contract.path;
  await uploadTus({file,contract,onProgress:onProgress||(()=>{})});
 }
 return {path,mode:"resumable" as const};
}
