export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,clients,contacts,auditLogs,users} from "@/lib/db";
import {and,eq,ilike,inArray} from "drizzle-orm";

const str=(v:any,n=500)=>String(v||"").trim().slice(0,n);
const num=(v:any)=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?n:0};
const date=(v:any)=>v&&!Number.isNaN(new Date(v).getTime())?new Date(v):null;
export async function GET(){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const role=String((session.user as any).role),userId=String((session.user as any).id);
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT","CREATOR","CLIENT"].includes(role))return NextResponse.json({clients:[]});
  let rows:{id:string;companyName:string}[]=[];
  if(role==="CREATOR"){
    const {creativeTasks}=await import("@/lib/db");
    const taskRows=await db.select({clientId:creativeTasks.clientId}).from(creativeTasks).where(eq(creativeTasks.assignedToId,userId));
    const ids=[...new Set(taskRows.map(t=>t.clientId))];
    rows=ids.length?await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),inArray(clients.id,ids))):[];
  }else{
    rows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),
      role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="CLIENT"?eq(clients.userId,userId):eq(clients.workspaceId,"default")));
  }
  return NextResponse.json({clients:rows});
}
export async function POST(req:NextRequest){
  const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const role=String((session.user as any).role),userId=String((session.user as any).id);
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"].includes(role))return NextResponse.json({error:"You do not have permission to add clients."},{status:403});
  const b=await req.json().catch(()=>null);if(!b)return NextResponse.json({error:"Invalid form data."},{status:400});
  const companyName=str(b.companyName,160);if(companyName.length<2)return NextResponse.json({error:"Company name is required."},{status:400});
  const duplicate=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,"default"),ilike(clients.companyName,companyName))).limit(1);
  if(duplicate[0])return NextResponse.json({error:"A client with this company name already exists.",clientId:duplicate[0].id},{status:409});
  const canSetupMarketing=role!=="ACCOUNTANT";
  const portalUserId=canSetupMarketing?(str(b.portalUserId,80)||null):null;
  if(portalUserId){const [portalUser]=await db.select({id:users.id}).from(users).where(and(eq(users.id,portalUserId),eq(users.role,"CLIENT"),eq(users.isActive,true))).limit(1);if(!portalUser)return NextResponse.json({error:"Choose a valid active client portal user."},{status:400});const existingLink=await db.select({id:clients.id}).from(clients).where(eq(clients.userId,portalUserId)).limit(1);if(existingLink[0])return NextResponse.json({error:"This portal user is already linked to another client."},{status:409});}
  const accountManagerId=canSetupMarketing?(role==="ACCOUNT_MANAGER"?userId:str(b.accountManagerId,80)||null):null;
  const mediaBuyerId=canSetupMarketing?(str(b.mediaBuyerId,80)||null):null;
  if(accountManagerId){const [manager]=await db.select({id:users.id}).from(users).where(and(eq(users.id,accountManagerId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true))).limit(1);if(!manager)return NextResponse.json({error:"Choose a valid active account manager."},{status:400});}
  if(mediaBuyerId){const [buyer]=await db.select({id:users.id}).from(users).where(and(eq(users.id,mediaBuyerId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true))).limit(1);if(!buyer)return NextResponse.json({error:"Choose a valid active media buyer."},{status:400});}
  const contractStart=date(b.contractStart),contractEnd=date(b.contractEnd);
  if(contractStart&&contractEnd&&contractEnd<contractStart)return NextResponse.json({error:"Contract end date must be on or after the start date."},{status:400});
  const [client]=await db.insert(clients).values({companyName,industry:str(b.industry,100)||null,website:str(b.website,500)||null,monthlyRetainer:num(b.monthlyRetainer),mediaBudget:canSetupMarketing?num(b.mediaBudget):0,contractValue:num(b.contractValue),userId:portalUserId,accountManagerId,mediaBuyerId,metaAdsLink:canSetupMarketing?(str(b.metaAdsLink)||null):null,tiktokAdsLink:canSetupMarketing?(str(b.tiktokAdsLink)||null):null,snapchatAdsLink:canSetupMarketing?(str(b.snapchatAdsLink)||null):null,googleAdsLink:canSetupMarketing?(str(b.googleAdsLink)||null):null,internalNotes:canSetupMarketing?(str(b.internalNotes,2000)||null):null,contractStart,contractEnd} as any).returning();
  if(str(b.contactName,160))await db.insert(contacts).values({clientId:client.id,name:str(b.contactName,160),title:str(b.contactTitle,120)||null,email:str(b.contactEmail,254)||null,phone:str(b.contactPhone,60)||null,whatsapp:str(b.contactPhone,60)||null,isPrimary:true} as any);
  await db.insert(auditLogs).values({userId,action:"client_created",entity:"Client",entityId:client.id,newValues:JSON.stringify({companyName})} as any);
  return NextResponse.json({success:true,clientId:client.id},{status:201});
}
