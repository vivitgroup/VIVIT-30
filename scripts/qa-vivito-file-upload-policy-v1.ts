import assert from "node:assert/strict";
import {isVivitoFilenameSafe,isVivitoFileTypeAllowed,normalizeVivitoFileMime,validateVivitoUploadDeclaration,VIVITO_ALLOWED_FILE_MIME_TYPES,VIVITO_FILE_MAX_SIZE} from "../lib/vivito/file-upload-policy-v1";
import fs from "node:fs";

let passed=0;
const check=(name:string,fn:()=>void)=>{fn();passed++;console.log(`PASS  ${name}`)};

check("upload cap stays at 500 MB",()=>assert.equal(VIVITO_FILE_MAX_SIZE,500*1024*1024));
check("approved business media/document MIME set remains explicit",()=>{
 assert.ok(VIVITO_ALLOWED_FILE_MIME_TYPES.includes("application/pdf"));
 assert.ok(VIVITO_ALLOWED_FILE_MIME_TYPES.includes("image/jpeg"));
 assert.ok(VIVITO_ALLOWED_FILE_MIME_TYPES.includes("video/mp4"));
 assert.equal(VIVITO_ALLOWED_FILE_MIME_TYPES.includes("text/html"),false);
});
check("MIME is normalized before policy evaluation",()=>assert.equal(normalizeVivitoFileMime(" IMAGE/JPEG "),"image/jpeg"));
check("extension and MIME must agree",()=>{
 assert.equal(isVivitoFileTypeAllowed("creative.jpg","image/jpeg"),true);
 assert.equal(isVivitoFileTypeAllowed("creative.jpg","application/pdf"),false);
 assert.equal(isVivitoFileTypeAllowed("invoice.pdf","image/png"),false);
});
check("dangerous executable/script/html extensions fail closed",()=>{
 for(const name of ["a.exe","a.js","a.html","a.svg","a.apk","a.sh"])assert.equal(isVivitoFilenameSafe(name),false,name);
});
check("path traversal names fail closed",()=>{
 assert.equal(isVivitoFilenameSafe("../invoice.pdf"),false);
 assert.equal(isVivitoFilenameSafe("..\\invoice.pdf"),false);
});
check("missing extension fails closed",()=>assert.equal(isVivitoFileTypeAllowed("README","text/plain"),false));
check("invalid and oversized declarations are rejected",()=>{
 assert.equal(validateVivitoUploadDeclaration({name:"a.pdf",mimeType:"application/pdf",size:0}).ok,false);
 const big=validateVivitoUploadDeclaration({name:"a.pdf",mimeType:"application/pdf",size:VIVITO_FILE_MAX_SIZE+1});
 assert.equal(big.ok,false);if(!big.ok)assert.equal(big.status,413);
});
check("valid declaration returns canonical MIME and size",()=>{
 const ok=validateVivitoUploadDeclaration({name:"photo.JPEG",mimeType:" IMAGE/JPEG ",size:1024});
 assert.equal(ok.ok,true);if(ok.ok){assert.equal(ok.mime,"image/jpeg");assert.equal(ok.size,1024)}
});
check("multipart route is wired to centralized policy and fails closed on stored MIME",()=>{
 const route=fs.readFileSync("app/api/files/multipart/route.ts","utf8");
 assert.match(route,/validateVivitoUploadDeclaration/);
 assert.match(route,/!info\.mime\|\|info\.mime!==mime/);
 assert.match(route,/X-Content-Type-Options/);
 assert.match(route,/workspaceId/);
 assert.match(route,/uploadedBy/);
});
check("multipart completion requires the canonical workspace-year-user-object path",()=>{
 const route=fs.readFileSync("app/api/files/multipart/route.ts","utf8");
 const signer=fs.readFileSync("app/api/files/upload-sign-v2/route.ts","utf8");
 assert.match(route,/function isOwnedMultipartPath/);
 assert.match(route,/segments\.length===4/);
 assert.match(route,/segments\[0\]===workspaceId/);
 assert.match(route,/segments\[2\]===userId/);
 assert.match(route,/\\\^\\d\{4\}\\\$/.source);
 assert.match(signer,/\$\{workspaceId\}\/\$\{new Date\(\)\.getFullYear\(\)\}\/\$\{userId\}\//);
});

console.log(`\n${passed}/11 VIVITO file upload policy checks passed.`);
assert.equal(passed,11);
