"use client";

export type TusUploadContract={
  resumableEndpoint:string;
  token:string;
  path:string;
  bucket:string;
  chunkSize:number;
};

type SavedTusState={contract:TusUploadContract;url?:string};
type UploadOptions={file:File;contract:TusUploadContract;onProgress?:(percent:number)=>void};

const TUS_VERSION="1.0.0";
const DEFAULT_CHUNK=6*1024*1024;
const RETRIES=[0,3000,5000,10000,20000];
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const fingerprint=(file:File)=>`vivit:tus:${file.name}:${file.size}:${file.lastModified}:${file.type}`;
const b64=(value:string)=>{const bytes=new TextEncoder().encode(value);let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)};
const metadata=(contract:TusUploadContract,file:File)=>[["bucketName",contract.bucket],["objectName",contract.path],["contentType",file.type],["cacheControl","3600"]].map(([k,v])=>`${k} ${b64(v)}`).join(",");
const validContract=(v:unknown):v is TusUploadContract=>{const x=v as Partial<TusUploadContract>|null;return Boolean(x&&x.resumableEndpoint&&x.token&&x.path&&x.bucket&&x.chunkSize===DEFAULT_CHUNK)};

export function loadSavedTusContract(file:File){try{const saved=JSON.parse(sessionStorage.getItem(fingerprint(file))||"null") as SavedTusState|null;return validContract(saved?.contract)?saved!.contract:null}catch{return null}}
export function clearSavedTus(file:File){try{sessionStorage.removeItem(fingerprint(file))}catch{}}
function saveState(file:File,contract:TusUploadContract,url?:string){try{sessionStorage.setItem(fingerprint(file),JSON.stringify({contract,url} satisfies SavedTusState))}catch{}}
function absoluteLocation(location:string,endpoint:string){return new URL(location,endpoint).toString()}

async function createUpload(file:File,contract:TusUploadContract){
  const r=await fetch(contract.resumableEndpoint,{method:"POST",headers:{"Tus-Resumable":TUS_VERSION,"Upload-Length":String(file.size),"Upload-Metadata":metadata(contract,file),"x-signature":contract.token,"x-upsert":"false"}});
  if(!r.ok)throw new Error(`Could not start resumable upload (${r.status}).`);
  const location=r.headers.get("Location");if(!location)throw new Error("Storage did not return a resumable upload URL.");
  return absoluteLocation(location,contract.resumableEndpoint);
}

async function remoteOffset(uploadUrl:string,token:string){
  const r=await fetch(uploadUrl,{method:"HEAD",headers:{"Tus-Resumable":TUS_VERSION,"x-signature":token},cache:"no-store"});
  if(!r.ok)throw new Error(`Could not resume upload (${r.status}).`);
  const offset=Number(r.headers.get("Upload-Offset")||0);if(!Number.isFinite(offset)||offset<0)throw new Error("Storage returned an invalid upload offset.");return offset;
}

function patchChunk(uploadUrl:string,token:string,offset:number,chunk:Blob,onChunkProgress:(loaded:number)=>void){
  return new Promise<number>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PATCH",uploadUrl);xhr.setRequestHeader("Tus-Resumable",TUS_VERSION);xhr.setRequestHeader("Upload-Offset",String(offset));xhr.setRequestHeader("Content-Type","application/offset+octet-stream");xhr.setRequestHeader("x-signature",token);xhr.upload.onprogress=ev=>ev.lengthComputable&&onChunkProgress(ev.loaded);xhr.onerror=()=>reject(new Error("Network interrupted during resumable upload."));xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){const next=Number(xhr.getResponseHeader("Upload-Offset")||offset+chunk.size);return resolve(Number.isFinite(next)?next:offset+chunk.size)}reject(new Error(`Storage rejected an upload chunk (${xhr.status}).`))};xhr.send(chunk)});
}

export async function uploadTus({file,contract,onProgress}:UploadOptions){
  if(!validContract(contract))throw new Error("Resumable upload contract is incomplete.");
  const key=fingerprint(file);let uploadUrl="";
  try{const saved=JSON.parse(sessionStorage.getItem(key)||"null") as SavedTusState|null;if(saved?.url&&saved.contract?.path===contract.path&&saved.contract?.token===contract.token)uploadUrl=saved.url}catch{}
  if(!uploadUrl){uploadUrl=await createUpload(file,contract);saveState(file,contract,uploadUrl)}
  let offset=0;
  try{offset=await remoteOffset(uploadUrl,contract.token)}catch{uploadUrl=await createUpload(file,contract);saveState(file,contract,uploadUrl);offset=0}
  onProgress?.(Math.round(offset/file.size*100));
  while(offset<file.size){
    const start=offset,chunk=file.slice(start,Math.min(start+contract.chunkSize,file.size));let completed=false,lastError:Error|null=null;
    for(const delay of RETRIES){if(delay)await sleep(delay);try{offset=await patchChunk(uploadUrl,contract.token,start,chunk,loaded=>onProgress?.(Math.min(99,Math.round((start+loaded)/file.size*100))));completed=true;break}catch(error){lastError=error instanceof Error?error:new Error("Upload interrupted.");try{const recovered=await remoteOffset(uploadUrl,contract.token);if(recovered>start){offset=recovered;completed=true;break}}catch{}}}
    if(!completed)throw lastError||new Error("Resumable upload failed.");
  }
  clearSavedTus(file);onProgress?.(100);
}
