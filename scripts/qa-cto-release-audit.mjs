import fs from "node:fs";
import path from "node:path";

const ROOTS=["app","components","lib"];
const EXT=new Set([".ts",".tsx",".js",".jsx",".mjs"]);
const IGNORE_PARTS=["/node_modules/","/.next/","/generated/","/migrations/"];
const findings=[];

function walk(dir){
  if(!fs.existsSync(dir))return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(p));
    else if(EXT.has(path.extname(entry.name)))out.push(p.replaceAll("\\","/"));
  }
  return out;
}
function lineOf(src,index){return src.slice(0,index).split("\n").length}
function add(file,kind,index,snippet){findings.push({file,kind,line:lineOf(files[file],index),snippet:snippet.replace(/\s+/g," ").trim().slice(0,180)})}
const files={};
for(const file of ROOTS.flatMap(walk).filter(f=>!IGNORE_PARTS.some(x=>`/${f}/`.includes(x)))) files[file]=fs.readFileSync(file,"utf8");

for(const [file,src] of Object.entries(files)){
  const checks=[
    ["TENANT_DEFAULT",/(?:workspaceId|workspace_id|workspace|WORKSPACE|\bW\b)\s*(?:=|:|\|\||\?\?)\s*["']default["']/g],
    ["TENANT_SQL_DEFAULT",/workspace_id\s*=\s*["']default["']/g],
    ["TENANT_ORM_DEFAULT",/(?:eq|where)\([^\n]{0,120}(?:workspaceId|workspace_id)[^\n]{0,80}["']default["']/g],
    ["PLACEHOLDER_HREF",/href\s*=\s*["']#["']/g],
    ["UNIMPLEMENTED_RUNTIME",/\b(?:TODO|FIXME|NOT_IMPLEMENTED|Not implemented|not implemented|Coming soon|coming soon)\b/g],
    ["PERMA_DISABLED_JSX",/<(?:button|input|select|textarea)\b[^>]*\bdisabled(?:\s*=\s*\{?true\}?|\s|>)/g],
  ];
  for(const [kind,re] of checks){for(const m of src.matchAll(re))add(file,kind,m.index??0,m[0])}
}

const grouped=Object.groupBy?Object.groupBy(findings,x=>x.kind):findings.reduce((a,x)=>((a[x.kind]??=[]).push(x),a),{});
console.log(`CTO STATIC AUDIT · ${Object.keys(files).length} runtime source files scanned`);
for(const kind of Object.keys(grouped).sort()){
  console.log(`\n${kind} · ${grouped[kind].length}`);
  for(const f of grouped[kind])console.log(`- ${f.file}:${f.line} · ${f.snippet}`);
}
if(findings.length){console.error(`\nFAIL · ${findings.length} release-blocking static finding(s). Review/fix or explicitly redesign the gate if a pattern is proven safe.`);process.exit(1)}
console.log("\nPASS · no release-blocking static findings.");
