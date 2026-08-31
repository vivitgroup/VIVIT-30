import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root=process.cwd();
const roots=["app","components"];
const files:string[]=[];
function walk(dir:string){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.tsx$/.test(entry.name))files.push(p)}}
for(const dir of roots)walk(path.join(root,dir));

type Finding={file:string;line:number;kind:string;detail:string};
const findings:Finding[]=[];
let buttons=0,anchors=0,links=0,forms=0,roleButtons=0,pages=0,legacyListeners=0;
const attr=(node:ts.JsxOpeningLikeElement,name:string)=>node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&ts.isIdentifier(p.name)&&p.name.text===name) as ts.JsxAttribute|undefined;
const has=(node:ts.JsxOpeningLikeElement,name:string)=>Boolean(attr(node,name));
const staticText=(a:ts.JsxAttribute|undefined)=>{if(!a?.initializer)return a?"true":"";if(ts.isStringLiteral(a.initializer))return a.initializer.text;if(ts.isJsxExpression(a.initializer)&&a.initializer.expression&&ts.isStringLiteral(a.initializer.expression))return a.initializer.expression.text;if(ts.isJsxExpression(a.initializer)&&a.initializer.expression?.kind===ts.SyntaxKind.TrueKeyword)return"true";return""};
const tag=(node:ts.JsxOpeningLikeElement)=>ts.isIdentifier(node.tagName)?node.tagName.text:node.tagName.getText();
const lineOf=(sf:ts.SourceFile,node:ts.Node)=>sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1;
function insideForm(node:ts.Node){for(let p=node.parent;p;p=p.parent){if(ts.isJsxElement(p)&&tag(p.openingElement)==="form")return true}return false}
function formHasSubmit(node:ts.JsxElement){let ok=false;const visit=(n:ts.Node)=>{if(ok)return;if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))){const t=tag(n);if(t==="button"){const type=staticText(attr(n,"type"));if(type!=="button")ok=true}else if(t==="input"&&["submit","image"].includes(staticText(attr(n,"type")).toLowerCase()))ok=true}ts.forEachChild(n,visit)};for(const child of node.children)visit(child);return ok}
function hasLegacyListener(source:string,id:string){if(!id)return false;const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return new RegExp(`getElementById\\(\\s*['\"]${escaped}['\"]\\s*\\)\\s*\\.addEventListener\\(`).test(source)}

for(const file of files){
 const source=fs.readFileSync(file,"utf8"),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(file.endsWith(`${path.sep}page.tsx`))pages++;
 const visit=(node:ts.Node)=>{
  if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)){
   const open=ts.isJsxElement(node)?node.openingElement:node,t=tag(open),line=lineOf(sf,open),rel=path.relative(root,file).replaceAll("\\","/");
   const spread=open.attributes.properties.some(p=>ts.isJsxSpreadAttribute(p));
   if(t==="button"){
    buttons++;const type=staticText(attr(open,"type")).toLowerCase(),staticDisabled=staticText(attr(open,"disabled"))==="true",id=staticText(attr(open,"id")),legacy=hasLegacyListener(source,id);if(legacy)legacyListeners++;
    if(staticDisabled)findings.push({file:rel,line,kind:"static-disabled-button",detail:"Button is permanently disabled"});
    if(!spread&&!has(open,"onClick")&&!has(open,"formAction")&&!insideForm(open)&&type!=="submit"&&type!=="reset"&&!legacy)findings.push({file:rel,line,kind:"dead-button",detail:"Button has no React/form action or verified id-based addEventListener wiring"});
   }
   if(t==="a"){
    anchors++;const href=staticText(attr(open,"href")).trim();
    if(!spread&&!has(open,"href")&&!has(open,"onClick"))findings.push({file:rel,line,kind:"dead-anchor",detail:"Anchor has no href or click handler"});
    if(href==="#"||href.toLowerCase().startsWith("javascript:"))findings.push({file:rel,line,kind:"unsafe-placeholder-link",detail:`Static href ${href}`});
   }
   if(t==="Link"){
    links++;const href=staticText(attr(open,"href")).trim();
    if(!spread&&!has(open,"href"))findings.push({file:rel,line,kind:"dead-link",detail:"Next Link has no href"});
    if(href==="#"||href.toLowerCase().startsWith("javascript:"))findings.push({file:rel,line,kind:"unsafe-placeholder-link",detail:`Static href ${href}`});
   }
   const role=staticText(attr(open,"role")).toLowerCase();if(role==="button"&&t!=="button"){
    roleButtons++;if(!spread&&!has(open,"onClick"))findings.push({file:rel,line,kind:"dead-role-button",detail:"role=button has no onClick"});
    if(!spread&&has(open,"onClick")&&!has(open,"onKeyDown")&&!has(open,"onKeyUp"))findings.push({file:rel,line,kind:"keyboard-inaccessible-button",detail:"role=button click target lacks keyboard handler"});
   }
   if(t==="form"&&ts.isJsxElement(node)){
    forms++;if(!spread&&!has(open,"action")&&!has(open,"onSubmit")&&!formHasSubmit(node))findings.push({file:rel,line,kind:"dead-form",detail:"Form has no action/onSubmit/submit control"});
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(sf);
}

for(const f of findings)console.log(`FAIL  ${f.kind} — ${f.file}:${f.line} — ${f.detail}`);
console.log(`\nInteractive inventory: ${files.length} TSX files · ${pages} pages · ${buttons} buttons · ${anchors} anchors · ${links} Links · ${forms} forms · ${roleButtons} role-buttons · ${legacyListeners} verified legacy listeners.`);
if(findings.length){console.error(`${findings.length} interactive-control issue(s) found.`);process.exit(1)}
console.log("PASS  No statically dead or placeholder interactive controls found.");
