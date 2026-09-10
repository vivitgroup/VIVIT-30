const MIME_EXTENSIONS:Readonly<Record<string,readonly string[]>>={
  "application/pdf":["pdf"],
  "application/msword":["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":["docx"],
  "application/vnd.ms-excel":["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":["xlsx"],
  "application/vnd.ms-powerpoint":["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":["pptx"],
  "text/plain":["txt"],
  "text/csv":["csv"],
  "image/jpeg":["jpg","jpeg"],
  "image/png":["png"],
  "image/webp":["webp"],
  "image/gif":["gif"],
  "video/mp4":["mp4"],
  "video/quicktime":["mov"],
  "video/webm":["webm"],
  "audio/mpeg":["mp3","mpeg"],
  "audio/wav":["wav"],
  "audio/x-wav":["wav"],
};

export const VIVITO_FILE_MAX_SIZE=500*1024*1024;
export const VIVITO_ALLOWED_FILE_MIME_TYPES=Object.freeze(Object.keys(MIME_EXTENSIONS));
const ALLOWED_MIME=new Set(VIVITO_ALLOWED_FILE_MIME_TYPES);
const DANGEROUS_EXT=/\.(?:exe|dll|msi|bat|cmd|com|scr|ps1|psm1|vbs|vbe|js|mjs|cjs|jar|apk|dmg|pkg|sh|bash|zsh|php|py|rb|pl|cgi|htm|html|xhtml|svg|svgz)$/i;

export function normalizeVivitoFileMime(value:unknown){return String(value||"").trim().toLowerCase().slice(0,160)}
export function vivitoFileExtension(name:unknown){
  const safe=String(name||"").trim().replace(/\\/g,"/").split("/").pop()||"";
  const at=safe.lastIndexOf(".");
  return at>0&&at<safe.length-1?safe.slice(at+1).toLowerCase():"";
}
export function isVivitoFilenameSafe(name:unknown){
  const value=String(name||"").trim();
  if(!value||value.length>255||value.includes("\0")||DANGEROUS_EXT.test(value))return false;
  if(value.includes("../")||value.includes("..\\"))return false;
  return true;
}
export function isVivitoFileTypeAllowed(name:unknown,mimeValue:unknown){
  const mime=normalizeVivitoFileMime(mimeValue),ext=vivitoFileExtension(name);
  if(!isVivitoFilenameSafe(name)||!ALLOWED_MIME.has(mime)||!ext)return false;
  return Boolean(MIME_EXTENSIONS[mime]?.includes(ext));
}
export function validateVivitoUploadDeclaration(input:{name:unknown;mimeType:unknown;size:unknown},maxSize=VIVITO_FILE_MAX_SIZE){
  const size=Number(input.size),mime=normalizeVivitoFileMime(input.mimeType);
  if(!Number.isFinite(size)||size<=0)return{ok:false as const,status:400,code:"invalid-file-size"};
  if(size>maxSize)return{ok:false as const,status:413,code:"file-too-large"};
  if(!isVivitoFileTypeAllowed(input.name,mime))return{ok:false as const,status:415,code:"file-type-mismatch-or-disallowed"};
  return{ok:true as const,size,mime};
}
