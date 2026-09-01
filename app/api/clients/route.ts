export const dynamic="force-dynamic";
import { NextRequest,NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db,clients,contacts,auditLogs,users,notifications } from "@/lib/db";
import {and,eq,ilike,inArray} from "drizzle-orm";

const CLIENT_LIST_LIMIT=250;
const CREATOR_TASK_SCOPE_LIMIT=1000;
const str=(v:unknown,n=500)=>String(v??"").trim().slice(0,n);
const date=(v:unknown)=>v&&!Number.isNaN(new Date(String(v)).getTime())?new Date(String(v)):null;
const sessionScope=async()=>{const session=await auth();if(!session?.user)return null;const workspaceId=str(session.user.workspaceId,160);if(!workspaceId)return null;return{session,workspaceId,role:String(session.user.role??""),userId:session.user.id}};
const parseBody=async(req:NextRequest):Promise<Record<string,unknown>|null>=>{const value:unknown=await req.json().catch(()=>null);return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;};
const hasFinancePayload=(b:Record<string,unknown>)=>["monthlyRetainer","mediaBudget","contractValue","amountDue","amountPaid"].some(k=>b[k]!==undefined&&str(b[k],80)!=="");
const required=(b:Record<string,unknown>,key:string,label:string,n=500)=>{const value=str(b[key],n);return value?{value}:{error:`${label} is required.`}};

export async function GET(){
  const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {workspaceId,role,userId}=s;
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT","CREATOR","CLIENT"].includes(role))return NextResponse.json({clients:[]});
  let rows:{id:string;companyName:string}[]=[];
  if(role==="CREATOR"){
    const {creativeTasks}=await import("@/lib/db");
    const taskRows=await db.select({clientId:creativeTasks.clientId}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.assignedToId,userId))).limit(CREATOR_TASK_SCOPE_LIMIT);
    const ids=[...new Set(taskRows.map(t=>t.clientId))].slice(0,CLIENT_LIST_LIMIT);
    rows=ids.length?await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),inArray(clients.id,ids))).limit(CLIENT_LIST_LIMIT):[];
  }else{
    const base=and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true));
    const roleFilter=role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="CLIENT"?eq(clients.userId,userId):undefined;
    rows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(base,roleFilter)).limit(CLIENT_LIST_LIMIT);
  }
  return NextResponse.json({clients:rows,limit:CLIENT_LIST_LIMIT},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
  const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {workspaceId,role,userId}=s;
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT"].includes(role))return NextResponse.json({error:"You do not have permission to add clients."},{status:403});
  const b=await parseBody(req);if(!b)return NextResponse.json({error:"Invalid form data."},{status:400});

  // Client creation is operational onboarding only. Finance is a separate
  // Accountant/Super Admin handoff and cannot be smuggled through this API.
  if(hasFinancePayload(b))return NextResponse.json({error:"Financial amounts must be entered from Accounts Payment by Finance or Super Admin after the client is created."},{status:403});

  const company=required(b,"companyName","Company name",160);if("error" in company)return NextResponse.json({error:company.error},{status:400});
  const industryField=required(b,"industry","Industry",100);if("error" in industryField)return NextResponse.json({error:industryField.error},{status:400});
  const websiteField=required(b,"website","Website",500);if("error" in websiteField)return NextResponse.json({error:websiteField.error},{status:400});
  const contactNameField=required(b,"contactName","Primary contact name",160);if("error" in contactNameField)return NextResponse.json({error:contactNameField.error},{status:400});
  const contactEmailField=required(b,"contactEmail","Primary contact email",254);if("error" in contactEmailField)return NextResponse.json({error:contactEmailField.error},{status:400});
  const contactPhoneField=required(b,"contactPhone","Primary contact phone",60);if("error" in contactPhoneField)return NextResponse.json({error:contactPhoneField.error},{status:400});
  const companyName=company.value,industry=industryField.value,website=websiteField.value;
  const contactName=contactNameField.value,contactEmail=contactEmailField.value,contactPhone=contactPhoneField.value;
  if(!/^\S+@\S+\.\S+$/.test(contactEmail))return NextResponse.json({error:"Enter a valid primary contact email."},{status:400});

  const contractStart=date(b.contractStart),contractEnd=date(b.contractEnd);
  if(!contractStart||!contractEnd)return NextResponse.json({error:"Contract start and end dates are required."},{status:400});
  if(contractEnd<contractStart)return NextResponse.json({error:"Contract end date must be on or after the start date."},{status:400});

  const duplicate=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);
  if(duplicate[0])return NextResponse.json({error:"A client with this company name already exists.",clientId:duplicate[0].id},{status:409});

  const canSetupMarketing=role!=="ACCOUNTANT";
  const portalUserId=canSetupMarketing?(str(b.portalUserId,80)||null):null;
  if(canSetupMarketing&&!portalUserId)return NextResponse.json({error:"Client portal user is required before the account can be created."},{status:400});
  if(portalUserId){
    const [portalUser]=await db.select({id:users.id}).from(users).where(and(eq(users.id,portalUserId),eq(users.workspaceId,workspaceId),eq(users.role,"CLIENT"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
    if(!portalUser)return NextResponse.json({error:"Choose a valid active approved client portal user."},{status:400});
    const existingLink=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.userId,portalUserId))).limit(1);
    if(existingLink[0])return NextResponse.json({error:"This portal user is already linked to another client."},{status:409});
  }

  const accountManagerId=canSetupMarketing?(role==="ACCOUNT_MANAGER"?userId:str(b.accountManagerId,80)||null):null;
  const mediaBuyerId=canSetupMarketing?(role==="MEDIA_BUYER"?userId:str(b.mediaBuyerId,80)||null):null;
  if(canSetupMarketing&&!accountManagerId)return NextResponse.json({error:"Account manager assignment is required."},{status:400});
  if(canSetupMarketing&&!mediaBuyerId)return NextResponse.json({error:"Media buyer assignment is required."},{status:400});
  if(accountManagerId){
    const [manager]=await db.select({id:users.id}).from(users).where(and(eq(users.id,accountManagerId),eq(users.workspaceId,workspaceId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
    if(!manager)return NextResponse.json({error:"Choose a valid active approved account manager."},{status:400});
  }
  if(mediaBuyerId){
    const [buyer]=await db.select({id:users.id}).from(users).where(and(eq(users.id,mediaBuyerId),eq(users.workspaceId,workspaceId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
    if(!buyer)return NextResponse.json({error:"Choose a valid active approved media buyer."},{status:400});
  }

  try{
    const clientId=await db.transaction(async tx=>{
      const [raceDuplicate]=await tx.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);
      if(raceDuplicate)throw new Error(`CLIENT_EXISTS:${raceDuplicate.id}`);
      const [client]=await tx.insert(clients).values({
        workspaceId,companyName,industry,website,
        monthlyRetainer:0,mediaBudget:0,contractValue:0,
        userId:portalUserId,accountManagerId,mediaBuyerId,
        metaAdsLink:canSetupMarketing?(str(b.metaAdsLink)||null):null,
        tiktokAdsLink:canSetupMarketing?(str(b.tiktokAdsLink)||null):null,
        snapchatAdsLink:canSetupMarketing?(str(b.snapchatAdsLink)||null):null,
        googleAdsLink:canSetupMarketing?(str(b.googleAdsLink)||null):null,
        internalNotes:canSetupMarketing?(str(b.internalNotes,2000)||null):null,
        contractStart,contractEnd,
      }).returning({id:clients.id});
      await tx.insert(contacts).values({clientId:client.id,name:contactName,title:str(b.contactTitle,120)||null,email:contactEmail,phone:contactPhone,whatsapp:contactPhone,isPrimary:true});
      await tx.insert(auditLogs).values({workspaceId,userId,action:"client_created",entity:"Client",entityId:client.id,newValues:JSON.stringify({companyName,createdByRole:role,financeSetup:"PENDING"})});

      const financeUsers=await tx.select({id:users.id}).from(users).where(and(
        eq(users.workspaceId,workspaceId),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"),inArray(users.role,["ACCOUNTANT","SUPER_ADMIN"]),
      ));
      if(financeUsers.length){
        await tx.insert(notifications).values(financeUsers.map(u=>({
          userId:u.id,
          type:"finance_setup_required",
          title:"New client needs finance setup",
          message:`${companyName} was added. Enter the client amount and payment details.`,
          link:"/dashboard/clients/accounts-payment",
          priority:"high",
        })));
      }
      return client.id;
    });
    return NextResponse.json({success:true,clientId,financeSetup:"PENDING"},{status:201,headers:{"Cache-Control":"private, no-store"}});
  }catch(error){
    if(error instanceof Error&&error.message.startsWith("CLIENT_EXISTS:")){
      const clientId=error.message.slice("CLIENT_EXISTS:".length);
      return NextResponse.json({error:"A client with this company name already exists.",clientId},{status:409});
    }
    throw error;
  }
}
