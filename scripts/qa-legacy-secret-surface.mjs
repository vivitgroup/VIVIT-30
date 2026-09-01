import fs from "node:fs";
import path from "node:path";

const roots=["app","components","lib"];
const extensions=new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs"]);
const forbidden=[
  {label:"legacy workspace Resend key",patterns:[/\bresendApiKey\b/,/["'`]resend_api_key["'`]/]},
  {label:"legacy workspace Anthropic key",patterns:[/\banthropicApiKey\b/,/["'`]anthropic_api_key["'`]/]},
  {label:"legacy personal user API key",patterns:[/\busers\.apiKey\b/,/["'`]api_key["'`]/]},
];
const hits=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(extensions.has(path.extname(entry.name))){
      const text=fs.readFileSync(full,"utf8");
      for(const item of forbidden)for(const pattern of item.patterns)if(pattern.test(text))hits.push(`${item.label}: ${full}`);
    }
  }
}
for(const root of roots)walk(root);
if(hits.length){console.error("Legacy raw secret columns are referenced by runtime code:\n"+[...new Set(hits)].join("\n"));process.exit(1)}
console.log("PASS  Legacy raw workspace/user secret columns are inert in runtime code.");
