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
const qa="scripts/qa-tasks-archive.mjs";
let q=fs.readFileSync(qa,"utf8");
if(!q.includes("Creative board reserves COMPLETED for client approval")){
 const marker='check("Creative board rejects status mutations on archived tasks"';
 const pos=q.indexOf(marker);
 if(pos<0)throw new Error("Missing tasks QA marker");
 const lineEnd=q.indexOf("\n",pos);
 q=q.slice(0,lineEnd+1)+'check("Creative board reserves COMPLETED for client approval",!creativePage.includes(\'task.status==="APPROVED"&&next==="COMPLETED"\')&&!creativePage.includes(\'status="COMPLETED" label="Complete"\')&&!creativePage.includes(\'completedAt:next==="COMPLETED"\'));\n'+q.slice(lineEnd+1);
}
fs.writeFileSync(qa,q);
console.log("creative board client-only completion contract enforced");
