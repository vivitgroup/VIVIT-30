import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,adPlatformConnections,auditLogs,clients,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import {exchangeCode,verifyState,encryptToken,OAuthPlatform} from "@/lib/ad-oauth";

async function discoverSnapAccount(accessToken:string){const headers={Authorization:`Bearer ${accessToken}`};const orgRes=await fetch("https://adsapi.snapchat.com/v1/me/organizations",{headers,signal:AbortSignal.timeout(8000)});const orgJson=await orgRes.json();if(!orgRes.ok)throw new Error(orgJson?.request_status||"Unable to list Snapchat organizations");for(const item of orgJson.organizations||[]){const org=item.organization||item;if(!org?.id)continue;const accountRes=await fetch(`https://adsapi.snapchat.com/v1/organizations/${org.id}/adaccounts`,{headers,signal:AbortSignal.timeout(8000)});const accountJson=await accountRes.json();if(!accountRes.ok)continue;const first=(accountJson.adaccounts||[])[0];const account=first?.adaccount||first;if(account?.id)return{id:String(account.id),name:String(account.name||org.name||"Snapchat Ad Account")};}throw new Error("No Snapchat ad account is available for this user");}

export async function GET(req:NextRequest,{params}:{params:Promise<{platform:string}>}){const home=new URL("/dashboard/media/control-center",req.url);try{
 const session=await auth();if(!session?.user)throw new Error("Session expired — sign in and try again");
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"").trim();
 if(!workspaceId)throw new Error("Workspace context is missing");
 if(!["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"].includes(role))throw new Error("You no longer have permission to connect ad accounts");
 const {platform:raw}=await params,platform=raw.toUpperCase() as OAuthPlatform;const state=verifyState(req.nextUrl.searchParams.get("state")||"");if(state.platform!==platform||state.userId!==userId)throw new Error("OAuth state mismatch");
 const roleScope=role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):eq(clients.workspaceId,workspaceId);
 const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,state.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),roleScope)).limit(1);if(!client)throw new Error("Client access changed or the client was archived. Start the connection again.");
 const error=req.nextUrl.searchParams.get("error");if(error)throw new Error("OAuth provider denied or failed the authorization request");const code=req.nextUrl.searchParams.get("code")||req.nextUrl.searchParams.get("auth_code")||"";if(!code)throw new Error("Authorization code was not returned");
 const tokens=await exchangeCode(platform,code);const discovered=platform==="SNAPCHAT"&&state.adAccountId==="auto"?await discoverSnapAccount(tokens.accessToken):null;const adAccountId=String(discovered?.id||state.adAccountId).replace(/^act_/i,""),accountName=(state.accountName||discovered?.name||`${platform} Ad Account`).slice(0,160);
 const encryptedAccess=encryptToken(tokens.accessToken),encryptedRefresh=encryptToken(tokens.refreshToken),tokenExpiresAt=tokens.expiresIn?new Date(Date.now()+tokens.expiresIn*1000):null;
 const row=await db.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`oauth-connection:${platform}:${adAccountId}`}))`);
   const [existing]=await tx.select().from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);
   if(existing&&(existing.clientId!==state.clientId||existing.workspaceId!==workspaceId))throw new Error("This ad account is already connected outside this client workspace. Ask Super Admin to resolve the assignment.");
   let connected;
   if(existing){
     [connected]=await tx.update(adPlatformConnections).set({accountName,accessTokenEncrypted:encryptedAccess,refreshTokenEncrypted:encryptedRefresh,tokenExpiresAt,status:"CONNECTED",syncError:null,updatedAt:new Date()}).where(and(eq(adPlatformConnections.id,existing.id),eq(adPlatformConnections.workspaceId,workspaceId),eq(adPlatformConnections.clientId,state.clientId))).returning();
   }else{
     [connected]=await tx.insert(adPlatformConnections).values({workspaceId,clientId:state.clientId,platform,adAccountId,accountName,accessTokenEncrypted:encryptedAccess,refreshTokenEncrypted:encryptedRefresh,tokenExpiresAt,status:"CONNECTED",createdBy:userId}).returning();
   }
   if(!connected)throw new Error("OAuth connection changed concurrently. Start the connection again.");
   await tx.insert(auditLogs).values({workspaceId,userId,action:"ad_platform_oauth_connected",entity:"ad_platform_connections",entityId:connected.id,newValues:JSON.stringify({platform,adAccountId,clientId:state.clientId})});
   return connected;
 });
 home.searchParams.set("oauth","success");home.searchParams.set("platform",platform);home.searchParams.set("connectionId",row.id);return NextResponse.redirect(home);
 }catch(e:unknown){console.error("OAuth callback failed",e instanceof Error?e.name:"oauth_callback_failure");home.searchParams.set("oauth","error");home.searchParams.set("message","Connection failed. Please start the connection again.");return NextResponse.redirect(home);}}
