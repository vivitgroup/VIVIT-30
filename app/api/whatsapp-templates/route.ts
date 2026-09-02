export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,whatsappMessages,clients} from "@/lib/db";
import {eq,desc,and} from "drizzle-orm";

const allowedRoles=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"];
const normalizePhone=(value:string)=>String(value||"").replace(/[^0-9]/g,"");
const graphVersion=()=>process.env.WHATSAPP_GRAPH_VERSION||process.env.META_GRAPH_VERSION||"v23.0";

async function sendWhatsAppMessage(input:{workspaceId:string;to:string;body:string;clientId?:string;mode?:"text"|"template";templateName?:string;languageCode?:string}){
 const token=process.env.WHATSAPP_TOKEN,phoneId=process.env.WHATSAPP_PHONE_ID;
 if(!token||!phoneId)throw new Error("WhatsApp Cloud API is not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Vercel.");
 const to=normalizePhone(input.to);if(to.length<8||to.length>16)throw new Error("Enter the WhatsApp number in international format, for example 2010XXXXXXXX.");
 const mode=input.mode||"text",templateName=String(input.templateName||"").trim(),languageCode=String(input.languageCode||"en_US").trim();
 if(mode==="template"&&!templateName)throw new Error("Approved WhatsApp template name is required.");
 const [msg]=await db.insert(whatsappMessages).values({workspaceId:input.workspaceId,to,template:mode==="template"?templateName:"custom",body:input.body,clientId:input.clientId||null,status:"PENDING"}).returning();
 const payload=mode==="template"?{messaging_product:"whatsapp",to,type:"template",template:{name:templateName,language:{code:languageCode}}}:{messaging_product:"whatsapp",to,type:"text",text:{preview_url:false,body:input.body}};
 try{
  const res=await fetch(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(phoneId)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(10000)});
  const raw=await res.text();let data:{messages?:Array<{id?:string}>;error?:{message?:string}}={};try{data=raw?JSON.parse(raw):{}}catch{if(!res.ok)throw new Error(`WhatsApp returned an invalid response (${res.status}).`)}const messageId=data?.messages?.[0]?.id;
  if(!res.ok||!messageId)throw new Error(data?.error?.message||"WhatsApp rejected the message.");
  if(msg)await db.update(whatsappMessages).set({waMessageId:messageId,status:"SENT"}).where(and(eq(whatsappMessages.id,msg.id),eq(whatsappMessages.workspaceId,input.workspaceId)));
  return{success:true,messageId};
 }catch(error:unknown){if(msg)await db.update(whatsappMessages).set({status:"FAILED"}).where(and(eq(whatsappMessages.id,msg.id),eq(whatsappMessages.workspaceId,input.workspaceId)));throw error;}
}

export async function GET(){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!allowedRoles.includes(String(session.user.role)))return NextResponse.json({error:"Forbidden"},{status:403});
 const workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});const recent=await db.select().from(whatsappMessages).where(eq(whatsappMessages.workspaceId,workspaceId)).orderBy(desc(whatsappMessages.createdAt)).limit(20);
 const templates=[
  {id:"monthly_report",label:"📊 Monthly Performance Report",body:"Hi {name}! Your {month} report is ready. ROAS: {roas}× | Leads: {leads} | Spend: EGP {spend}. Full report: {link}"},
  {id:"creative_review",label:"🎨 Creative Ready for Review",body:"Hi {name}, your creative for {campaign} is ready for review: {link}"},
  {id:"invoice_reminder",label:"💳 Invoice Payment Reminder",body:"Hi {name}, invoice #{inv_num} for EGP {amount} is due on {due_date}."},
  {id:"lead_followup",label:"🎯 Sales Follow-up",body:"Hi {name}! Following up on our conversation about growing {company}. When is a good time to chat?"},
  {id:"campaign_alert",label:"🚨 Campaign Performance Alert",body:"Alert: {campaign} ROAS is {roas}×. We are optimizing it now."}
 ];
 return NextResponse.json({templates,recent,hasRealAPI:!!(process.env.WHATSAPP_TOKEN&&process.env.WHATSAPP_PHONE_ID),graphVersion:graphVersion()},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!allowedRoles.includes(String(session.user.role)))return NextResponse.json({error:"Forbidden"},{status:403});
 try{const workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});const body=await req.json();const text=String(body.body||"").trim().slice(0,4096),clientId=String(body.clientId||"").trim()||undefined;if(!body.to||!text)return NextResponse.json({error:"Phone number and message are required."},{status:400});if(clientId){const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);if(!client)return NextResponse.json({error:"Client not found in workspace"},{status:404})}const result=await sendWhatsAppMessage({workspaceId,to:body.to,body:text,clientId,mode:body.mode==="template"?"template":"text",templateName:body.templateName,languageCode:body.languageCode});return NextResponse.json(result);}catch(error:unknown){const msg=error instanceof Error?error.message:"WhatsApp send failed";const configuration=msg.includes("not configured");return NextResponse.json({error:msg},{status:configuration?503:400});}
}
