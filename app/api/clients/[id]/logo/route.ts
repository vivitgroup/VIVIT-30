import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,contacts,auditLogs,sql} from "@/lib/db";
import {eq,and} from "drizzle-orm";

type ClientRow={id:unknown;company_name:unknown;logo:unknown;website:unknown;facebook_url:unknown;instagram_url:unknown;account_manager_id:unknown;media_buyer_id:unknown};
const url=(v:unknown)=>{const s=String(v||"").trim().slice(0,1000);if(!s)return null;try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.toString():null}catch{return null}};

async function access(id:string){
  const session=await auth();if(!session?.user)return{error:NextResponse.json({error:"Unauthorized"},{status:401})};
  const role=String(session.user.role),userId=String(session.user.id),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return{error:NextResponse.json({error:"Workspace unavailable"},{status:403})};
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT"].includes(role))return{error:NextResponse.json({error:"Forbidden"},{status:403})};
  const rows=Array.from(await db.execute(sql`select id,company_name,logo,website,facebook_url,instagram_url,account_manager_id,media_buyer_id from clients where id=${id} and workspace_id=${workspaceId} and is_active=true limit 1`)) as ClientRow[],client=rows[0];
  if(!client)return{error:NextResponse.json({error:"Client not found"},{status:404})};
  if((role==="ACCOUNT_MANAGER"&&client.account_manager_id!==userId)||(role==="MEDIA_BUYER"&&client.media_buyer_id!==userId))return{error:NextResponse.json({error:"Client access denied"},{status:403})};
  return{session,role,userId,workspaceId,client};
}

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const{id}=await params,a=await access(id);if("error" in a)return a.error;
  const [primary]=await db.select({whatsapp:contacts.whatsapp,phone:contacts.phone}).from(contacts).where(and(eq(contacts.clientId,id),eq(contacts.isPrimary,true))).limit(1);
  return NextResponse.json({profile:{companyName:a.client.company_name,logo:a.client.logo||"",facebookUrl:a.client.facebook_url||"",instagramUrl:a.client.instagram_url||"",website:a.client.website||"",whatsapp:primary?.whatsapp||primary?.phone||""}},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const{id}=await params,a=await access(id);if("error" in a)return a.error;if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(a.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json().catch(()=>({})),logo=String(b.logo||"").trim();if(logo.length>600000)return NextResponse.json({error:"Logo image is too large"},{status:413});if(logo&&!logo.startsWith("data:image/")&&!url(logo))return NextResponse.json({error:"Invalid logo image"},{status:400});
  const facebookUrl=url(b.facebookUrl),instagramUrl=url(b.instagramUrl),website=url(b.website),whatsapp=String(b.whatsapp||"").replace(/[^0-9+]/g,"").slice(0,30);
  await db.transaction(async tx=>{
    const updated=Array.from(await tx.execute(sql`update clients set logo=${logo||null},facebook_url=${facebookUrl},instagram_url=${instagramUrl},website=${website},updated_at=now() where id=${id} and workspace_id=${a.workspaceId} and is_active=true returning id`));
    if(!updated.length)throw new Error("Client is no longer active");
    const [primary]=await tx.select({id:contacts.id}).from(contacts).where(and(eq(contacts.clientId,id),eq(contacts.isPrimary,true))).limit(1);
    if(primary)await tx.update(contacts).set({whatsapp:whatsapp||null}).where(and(eq(contacts.id,primary.id),eq(contacts.clientId,id)));
    await tx.insert(auditLogs).values({workspaceId:a.workspaceId,userId:a.userId,action:"client_profile_identity_updated",entity:"clients",entityId:id,newValues:JSON.stringify({hasLogo:Boolean(logo),facebookUrl,instagramUrl,website,hasWhatsapp:Boolean(whatsapp)})});
  });
  return NextResponse.json({success:true,profile:{companyName:a.client.company_name,logo,facebookUrl:facebookUrl||"",instagramUrl:instagramUrl||"",website:website||"",whatsapp}},{headers:{"Cache-Control":"private, no-store"}});
}
