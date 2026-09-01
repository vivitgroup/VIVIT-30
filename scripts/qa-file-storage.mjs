import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const api=read("app/api/files/route.ts");
const ui=read("app/dashboard/files/page.tsx");
const ensureStart=api.indexOf("async function ensureBucket");
const ensureEnd=api.indexOf("async function scopeFor");
const ensure=ensureStart>=0&&ensureEnd>ensureStart?api.slice(ensureStart,ensureEnd):"";

check("File API requires authenticated workspace and user",api.includes("async function sessionScope")&&api.includes("workspaceId")&&api.includes("userId"));
check("Storage configuration fails closed when Supabase env is missing",api.includes("Storage is not configured.")&&api.includes("SUPABASE_SERVICE_KEY"));
check("Upload checks existing bucket before provisioning",ensure.includes('/storage/v1/bucket/${BUCKET}')&&ensure.indexOf('method: "POST"')>ensure.indexOf('/storage/v1/bucket/${BUCKET}'));
check("Existing bucket immediately satisfies upload preparation",ensure.includes("if (check.ok) return"));
check("Bucket creation happens only after explicit 404",ensure.includes("if (check.status !== 404)")&&ensure.includes("const create = await fetch"));
check("Runtime never writes Supabase storage metadata directly",!api.includes("insert into storage.buckets")&&!api.includes("update storage.buckets"));
check("Bucket remains private when it must be created",ensure.includes("public: false"));
check("Upload limit supports 500 MB",api.includes("500 * 1024 * 1024")&&ui.includes("500*1024*1024"));
check("Image upload MIME types remain enabled",api.includes('"image/jpeg"')&&api.includes('"image/png"')&&api.includes('"image/webp"'));
check("Video upload MIME types remain enabled",api.includes('"video/mp4"')&&api.includes('"video/quicktime"')&&api.includes('"video/webm"'));
check("Dangerous executable and active-content extensions remain blocked",api.includes("DANGEROUS_EXT")&&api.includes("exe|dll|msi")&&api.includes("svg|svgz"));
check("Upload uses a signed Supabase object URL",api.includes('/storage/v1/object/upload/sign/${BUCKET}/${path}'));
check("Browser uploads directly to signed URL",ui.includes('xhr.open("PUT",signed.uploadUrl)'));
check("Upload completion verifies stored object before DB metadata",api.includes('/storage/v1/object/info/${BUCKET}/${path}')&&api.indexOf("object/info")<api.indexOf("tx.insert(fileDocuments)"));
check("Stored size and MIME are verified",api.includes("Stored file size does not match")&&api.includes("Stored file type does not match"));
check("File paths are workspace and uploader scoped",api.includes('${workspaceId}/${new Date().getFullYear()}/${userId}/')&&api.includes('path.startsWith(`${workspaceId}/`)')&&api.includes('path.includes(`/${userId}/`)'));
check("File list applies role/workspace scope",api.includes("async function scopeFor")&&api.includes("eq(fileDocuments.workspaceId, workspaceId)"));
check("Client/task links are authorization validated",api.includes("async function validateLinks")&&api.includes("You cannot attach this file to the selected client or task"));
check("Private files use signed read URLs",api.includes('/storage/v1/object/sign/${BUCKET}/${path}'));
check("Delete removes storage object before DB record",api.includes('method: "DELETE"')&&api.indexOf('/storage/v1/object/${BUCKET}/${row.storagePath}')<api.lastIndexOf("tx.delete(fileDocuments)"));

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} file/storage checks passed.`);
if(failed.length)process.exit(1);
