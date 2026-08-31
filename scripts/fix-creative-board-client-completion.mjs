import fs from "node:fs";
const page="app/dashboard/creative/page.tsx";
let s=fs.readFileSync(page,"utf8");
const replace=(from,to,label)=>{if(s.includes(to))return;if(!s.includes(from))throw new Error(`Missing anchor ${label}`);s=s.replace(from,to)};
replace('if(role===Role.ACCOUNT_MANAGER)allowed=(task.status==="REVIEW"&&["APPROVED","REVISION"].includes(next))||(task.status==="APPROVED"&&next==="COMPLETED");','if(role===Role.ACCOUNT_MANAGER)allowed=task.status==="REVIEW"&&["APPROVED","REVISION"].includes(next);','AM completion transition');
replace('if(role===Role.SUPER_ADMIN)allowed=(task.status==="REVIEW"&&["APPROVED","REVISION"].includes(next))||(task.status==="APPROVED"&&next==="COMPLETED")||(task.status==="PENDING"&&next==="IN_PROGRESS");','if(role===Role.SUPER_ADMIN)allowed=(task.status==="REVIEW"&&["APPROVED","REVISION"].includes(next))||(task.status==="PENDING"&&next==="IN_PROGRESS");','SA completion transition');
replace('completedAt:next==="COMPLETED"?now:task.completedAt','completedAt:null','completion stamp');
s=s.replace('{role===Role.ACCOUNT_MANAGER&&t.status==="APPROVED"&&<Action id={t.id} status="COMPLETED" label="Complete"/>}','');
s=s.replace('{role===Role.SUPER_ADMIN&&t.status==="APPROVED"&&<Action id={t.id} status="COMPLETED" label="Complete"/>}','');
fs.writeFileSync(page,s);

const archiveFile="app/dashboard/archive/page.tsx";
let a=fs.readFileSync(archiveFile,"utf8");
const oldRow='const key=`${entity}:${x.id}`,canHardDelete=entity==="lead"?(role==="SUPER_ADMIN"||role==="SALES"):entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role):role==="SUPER_ADMIN";return <tr key={x.id}><td style={{fontWeight:700}}>{x.name}</td><td>{x.archived_at?new Date(x.archived_at).toLocaleString():"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-secondary btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"restore")}>Restore</button>{canHardDelete&&<button className="btn btn-danger btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"delete")}>{busy===key?"Working…":"Delete permanently"}</button>}</div></td></tr>';
const newRow='const key=`${entity}:${x.id}`,canRestore=entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role):entity==="task"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role):(role==="SUPER_ADMIN"||role==="SALES"),canHardDelete=entity==="lead"?(role==="SUPER_ADMIN"||role==="SALES"):entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role):role==="SUPER_ADMIN";return <tr key={x.id}><td style={{fontWeight:700}}>{x.name}</td><td>{x.archived_at?new Date(x.archived_at).toLocaleString():"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{canRestore&&<button className="btn btn-secondary btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"restore")}>Restore</button>}{canHardDelete&&<button className="btn btn-danger btn-sm" disabled={busy===key} onClick={()=>act(entity,x,"delete")}>{busy===key?"Working…":"Delete permanently"}</button>}</div></td></tr>';
if(!a.includes(newRow)){if(!a.includes(oldRow))throw new Error("Missing archive actions anchor");a=a.replace(oldRow,newRow)}
fs.writeFileSync(archiveFile,a);

const qa="scripts/qa-tasks-archive.mjs";
let q=fs.readFileSync(qa,"utf8");
q=q.replaceAll("!creativePage.includes(","!board.includes(");
q=q.replace('check("Archive Center only exposes task hard delete to Super Admin",archive.includes(\'entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role):role==="SUPER_ADMIN"\'));','check("Archive Center client lifecycle controls exclude Media Buyer",archive.includes(\'canRestore=entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)\')&&archive.includes(\'entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role):role==="SUPER_ADMIN"\')&&!archive.includes(\'["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)\'));\ncheck("Archive Center only exposes task hard delete to Super Admin",archive.includes(\'entity==="client"?["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role):role==="SUPER_ADMIN"\'));');
if(!q.includes("Creative board reserves COMPLETED for client approval")){
 const marker='check("Creative board rejects status mutations on archived tasks"';
 const pos=q.indexOf(marker);
 if(pos<0)throw new Error("Missing tasks QA marker");
 const lineEnd=q.indexOf("\n",pos);
 q=q.slice(0,lineEnd+1)+'check("Creative board reserves COMPLETED for client approval",!board.includes(\'task.status==="APPROVED"&&next==="COMPLETED"\')&&!board.includes(\'status="COMPLETED" label="Complete"\')&&!board.includes(\'completedAt:next==="COMPLETED"\'));\n'+q.slice(lineEnd+1);
}
fs.writeFileSync(qa,q);
console.log("creative board and archive RBAC completion contracts enforced");
