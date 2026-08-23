// @ts-nocheck -- Drizzle's generated WhatsApp shapes are narrower than the live schema.
export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,whatsappMessages,clients} from "@/lib/db";
import {eq,desc,and} from "drizzle-orm";

const allowedRoles=["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"];
function normalizePhone(value:string){
 let p=String(value||"").replace(/[^0-9]/g,"");
 if(p.startsWith("00"))p=p.slice(2);
 if(p.startsWith("0"))p=`20${p.slice(1)}`;
 if(p.length<8||p.length>15)throw new Error("Enter a valid WhatsApp number, e.g. 010XXXXXXXX or +2010XXXXXXXX.");
 return p;
}
const graphVersion=()=>process.env.WHATSAPP_GRAPH_VERSION||process.env.META_GRAPH_VERSION||"v23.0";

async function canUseClient(role:string,userId:string,clientId?:string|null){
 if(!clientId)return true;
 if(role==="SUPER_ADMIN"||role==="SALES")return true;
 if(role==="ACCOUNT_MANAGER"){
  const [owned]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.accountManagerId,userId))).limit(1);
  return !!owned;
 }
 return false;
}

async function sendWhatsAppMessage(input:{to:string;body:string;clientId?:string;mode?:"text"|"template";templateName?:string;languageCode?:string}){
 const token=process.env.WHATSAPP_TOKEN,phoneId=process.env.WHATSAPP_PHONE_ID;
 if(!token||!phoneId)throw new Error("WhatsApp Cloud API is not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Vercel.");
 const to=normalizePhone(input.to),mode=input.mode||"text",templateName=String(input.templateName||"").trim(),languageCode=String(input.languageCode||"en_US").trim();
 if(mode==="template"&&!templateName)throw new Error("Approved WhatsApp template name is required.");
 const [msg]=await db.insert(whatsappMessages).values({to,template:mode==="template"?templateName:"custom",body:input.body,clientId:input.clientId||null,status:"PENDING"}).returning();
 const payload=mode==="template"?{messaging_product:"whatsapp",to,type:"template",template:{name:templateName,language:{code:languageCode}}}:{messaging_product:"whatsapp",to,type:"text",text:{preview_url:false,body:input.body}};
 try{
  const res=await fetch(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(phoneId)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
  const data=await res.json(),messageId=data?.messages?.[0]?.id;
  if(!res.ok||!messageId)throw new Error(data?.error?.message||"WhatsApp rejected the message.");
  if(msg)await db.update(whatsappMessages).set({waMessageId:messageId,status:"SENT"}).where(eq(whatsappMessages.id,msg.id));
  return{success:true,messageId};
 }catch(error:any){if(msg)await db.update(whatsappMessages).set({status:"FAILED"}).where(eq(whatsappMessages.id,msg.id));throw error;}
}

export async function GET(){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((session.user as any).role||"");if(!allowedRoles.includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
 const userId=String((session.user as any).id||"");
 const recent=role==="ACCOUNT_MANAGER"
  ? await db.select().from(whatsappMessages).leftJoin(clients,eq(whatsappMessages.clientId,clients.id)).where(eq(clients.accountManagerId,userId)).orderBy(desc(whatsappMessages.createdAt)).limit(20).then(rows=>rows.map((r:any)=>r.whatsapp_messages))
  : await db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.createdAt)).limit(20);
 const templates=[
  {id:"monthly_report",label:"📊 Monthly Performance Report",body:"Hi {name}! Your {month} report is ready. ROAS: {roas}× | Leads: {leads} | Spend: EGP {spend}. Full report: {link}"},
  {id:"creative_review",label:"🎨 Creative Ready for Review",body:"Hi {name}, your creative for {campaign} is ready for review: {link}"},
  {id:"invoice_reminder",label:"💳 Invoice Payment Reminder",body:"Hi {name}, invoice #{inv_num} for EGP {amount} is due on {due_date}."},
  {id:"lead_followup",label:"🎯 Sales Follow-up",body:"Hi {name}! Following up on our conversation about growing {company}. When is a good time to chat?"},
  {id:"campaign_alert",label:"🚨 Campaign Performance Alert",body:"Alert: {campaign} ROAS is {roas}×. We are optimizing it now."}
 ];
 return NextResponse.json({templates,recent,hasRealAPI:!!(process.env.WHATSAPP_TOKEN&&process.env.WHATSAPP_PHONE_ID),graphVersion:graphVersion()});
}

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");if(!allowedRoles.includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
 try{
  const body=await req.json(),clientId=body.clientId?String(body.clientId):undefined;
  if(!(await canUseClient(role,userId,clientId)))return NextResponse.json({error:"Client access denied"},{status:403});
  const text=String(body.body||"").trim().slice(0,4096);if(!body.to||!text)return NextResponse.json({error:"Phone number and message are required."},{status:400});
  const result=await sendWhatsAppMessage({to:body.to,body:text,clientId,mode:body.mode==="template"?"template":"text",templateName:body.templateName,languageCode:body.languageCode});return NextResponse.json(result);
 }catch(error:any){const msg=String(error?.message||"WhatsApp send failed"),configuration=msg.includes("not configured");return NextResponse.json({error:msg},{status:configuration?503:400});}
}
