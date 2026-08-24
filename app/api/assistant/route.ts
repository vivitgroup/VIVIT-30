export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,creativeTasks,clients} from "@/lib/db";
import {and,eq,inArray,notInArray,desc} from "drizzle-orm";

const ACTIVE=["PENDING","IN_PROGRESS","REVIEW","APPROVED","REVISION"];
const ar=(s:string)=>/[\u0600-\u06ff]/.test(s);
const cairoDay=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const dateLabel=(d:Date,arabic:boolean)=>new Intl.DateTimeFormat(arabic?"ar-EG":"en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",year:"numeric"}).format(d);

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>({})),question=String(body.question||"").trim().slice(0,500);if(!question)return NextResponse.json({error:"Ask a question first."},{status:400});
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),arabic=ar(question),q=question.toLowerCase();
 let clientRows:{id:string;companyName:string}[]=[];
 if(role==="SUPER_ADMIN")clientRows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.isActive,true));
 else if(role==="ACCOUNT_MANAGER")clientRows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),eq(clients.accountManagerId,userId)));
 else if(role==="MEDIA_BUYER")clientRows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),eq(clients.mediaBuyerId,userId)));
 else if(role==="CLIENT")clientRows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.userId,userId));
 const clientIds=clientRows.map(c=>c.id),clientMap=Object.fromEntries(clientRows.map(c=>[c.id,c.companyName]));
 let scope:any;
 if(role==="CREATOR")scope=eq(creativeTasks.assignedToId,userId);
 else if(["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"].includes(role))scope=clientIds.length?inArray(creativeTasks.clientId,clientIds):eq(creativeTasks.id,"__none__");
 else scope=eq(creativeTasks.id,"__none__");
 const tasks=await db.select({id:creativeTasks.id,title:creativeTasks.title,status:creativeTasks.status,priority:creativeTasks.priority,deadline:creativeTasks.deadline,clientId:creativeTasks.clientId,assignedToId:creativeTasks.assignedToId}).from(creativeTasks).where(and(scope,notInArray(creativeTasks.status,["COMPLETED","REJECTED"]))).orderBy(desc(creativeTasks.updatedAt)).limit(100);
 const today=cairoDay(new Date()),todayTasks=tasks.filter(t=>cairoDay(new Date(t.deadline))===today),overdue=tasks.filter(t=>new Date(t.deadline).getTime()<Date.now()&&cairoDay(new Date(t.deadline))!==today),pending=tasks.filter(t=>t.status==="PENDING"),soon=[...tasks].filter(t=>new Date(t.deadline)>=new Date()).sort((a,b)=>+new Date(a.deadline)-+new Date(b.deadline)).slice(0,8);
 const line=(t:any)=>`• ${t.title} — ${clientMap[t.clientId]||"Client"} — ${dateLabel(new Date(t.deadline),arabic)} — ${String(t.status).replace(/_/g," ")}`;
 let answer="";
 if(/today|today's|النهارده|اليوم|انهاردة|انهارده/.test(q)){
  answer=todayTasks.length?(arabic?`عندك ${todayTasks.length} تاسك ديدلاين النهارده:\n${todayTasks.map(line).join("\n")}`:`${todayTasks.length} task(s) are due today:\n${todayTasks.map(line).join("\n")}`):(arabic?"مفيش تاسكات ديدلاينها النهارده في نطاق شغلك الحالي.":"No tasks are due today in your current scope.");
 }else if(/overdue|late|متأخر|متاخر|فات/.test(q)){
  answer=overdue.length?(arabic?`في ${overdue.length} تاسك متأخرة:\n${overdue.slice(0,10).map(line).join("\n")}`:`There are ${overdue.length} overdue task(s):\n${overdue.slice(0,10).map(line).join("\n")}`):(arabic?"مفيش تاسكات متأخرة حاليًا.":"There are no overdue tasks right now.");
 }else if(/pending|معلق|معلقة|بندنج|قيد الانتظار/.test(q)){
  answer=pending.length?(arabic?`عندك ${pending.length} تاسك Pending:\n${pending.slice(0,10).map(line).join("\n")}`:`You have ${pending.length} pending task(s):\n${pending.slice(0,10).map(line).join("\n")}`):(arabic?"مفيش Pending tasks في نطاقك الحالي.":"There are no pending tasks in your current scope.");
 }else if(/deadline|dead line|ديدلاين|ميعاد|موعد|امتى|متي/.test(q)){
  answer=soon.length?(arabic?`أقرب الديدلاينز:\n${soon.map(line).join("\n")}`:`Upcoming deadlines:\n${soon.map(line).join("\n")}`):(arabic?"مفيش ديدلاينز قادمة مسجلة حاليًا.":"No upcoming deadlines are recorded right now.");
 }else if(/task|tasks|تاسك|تاسكات|مهام|مهمة/.test(q)){
  answer=tasks.length?(arabic?`عندك ${tasks.length} تاسك نشطة في نطاقك. الأقرب:\n${soon.slice(0,6).map(line).join("\n")}`:`You have ${tasks.length} active task(s). Nearest deadlines:\n${soon.slice(0,6).map(line).join("\n")}`):(arabic?"مفيش تاسكات نشطة في نطاقك الحالي.":"There are no active tasks in your current scope.");
 }else{
  answer=arabic?`أقدر أجاوبك مباشرة من بيانات الـERP عن التهيئات الحالية: التأسكات، ديدلاينز النهارده، المتأخر، والـPending. مثال: “عندنا تاسكات إيه النهارده؟” أو “أقرب ديدلاين إمتى؟”`:`I can answer directly from ERP data about your tasks, today's deadlines, overdue work and pending items. Try “What tasks are due today?” or “Show upcoming deadlines.”`;
 }
 return NextResponse.json({answer,counts:{active:tasks.length,today:todayTasks.length,overdue:overdue.length,pending:pending.length}});
}
