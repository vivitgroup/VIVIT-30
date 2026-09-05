import crypto from "crypto";
import {db,adPlatformConnections} from "@/lib/db";
import {eq,and} from "drizzle-orm";

// OAuth production configuration is resolved server-side from deployment secrets.
export type OAuthPlatform="META"|"TIKTOK"|"GOOGLE"|"SNAPCHAT"|"LINKEDIN";
type State={platform:OAuthPlatform;clientId:string;adAccountId:string;accountName:string;userId:string;exp:number};
type TokenSet={accessToken:string;refreshToken?:string;expiresIn?:number};
type OAuthErrorShape={message?:string};
type OAuthTokenPayload={access_token?:string;refresh_token?:string;expires_in?:number;error?:OAuthErrorShape|string;error_description?:string;message?:string;code?:number;data?:OAuthTokenPayload};
type ConnectionRow=typeof adPlatformConnections.$inferSelect;
type ConnectionTokenInput=Pick<ConnectionRow,"id"|"workspaceId"|"accessTokenEncrypted"|"refreshTokenEncrypted"|"tokenExpiresAt"|"platform"|"adAccountId">;

function appBase(){
 const raw=String(process.env.NEXTAUTH_URL||process.env.AUTH_URL||"").trim();
 if(!raw){if(process.env.NODE_ENV==="production")throw new Error("OAuth application URL is not configured");return"http://localhost:3000";}
 const u=new URL(raw);
 if(process.env.NODE_ENV==="production"&&(u.protocol!=="https:"||["localhost","127.0.0.1","::1"].includes(u.hostname.toLowerCase())))throw new Error("OAuth application URL must be a public HTTPS origin in production");
 return u.origin;
}
const callback=(p:string)=>`${appBase()}/api/ad-oauth/${p.toLowerCase()}/callback`;
function encryptionSecret(){const secret=String(process.env.OAUTH_ENCRYPTION_KEY||process.env.OAUTH_ENCRYPTION_SECRET||"").trim();if(!secret)throw new Error("OAuth encryption secret is not configured");if(secret.length<32)throw new Error("OAuth encryption secret is too short");return secret;}
const deriveKey=(secret:string)=>crypto.createHash("sha256").update(secret).digest();
const key=()=>deriveKey(encryptionSecret());
function legacyDecryptSecrets(){return [...new Set([process.env.OAUTH_ENCRYPTION_KEY,process.env.OAUTH_ENCRYPTION_SECRET,process.env.AUTH_SECRET,process.env.NEXTAUTH_SECRET].map(value=>String(value||"").trim()).filter(Boolean))];}
const META_APP_ID="1009736748777817";
const META_CONFIG_ID="1591787738522063";
const providerFetch=(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:init?.signal??AbortSignal.timeout(10000)});

export function encryptToken(value?:string|null){if(!value)return null;const secret=encryptionSecret();if(!secret)throw new Error("OAuth encryption secret is missing");const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),encrypted.toString("base64url")].join(".");}
export function decryptToken(value?:string|null){if(!value)return "";const parts=value.split(".");if(parts.length!==3)throw new Error("Invalid encrypted OAuth token");const [iv,tag,data]=parts;let lastError:unknown;for(const secret of legacyDecryptSecrets()){try{const decipher=crypto.createDecipheriv("aes-256-gcm",deriveKey(secret),Buffer.from(iv,"base64url"));decipher.setAuthTag(Buffer.from(tag,"base64url"));return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8")}catch(error){lastError=error}}if(!legacyDecryptSecrets().length)throw new Error("OAuth encryption secret is not configured");throw new Error("Unable to decrypt OAuth token with configured keys",{cause:lastError});}
export function signState(input:Omit<State,"exp">){const payload=Buffer.from(JSON.stringify({...input,exp:Date.now()+10*60_000})).toString("base64url");const sig=crypto.createHmac("sha256",key()).update(payload).digest("base64url");return `${payload}.${sig}`;}
export function verifyState(value:string):State{const [payload,sig]=value.split(".");if(!payload||!sig)throw new Error("Invalid OAuth state");const expected=crypto.createHmac("sha256",key()).update(payload).digest("base64url");if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error("Invalid OAuth state");let state:State;try{state=JSON.parse(Buffer.from(payload,"base64url").toString()) as State}catch{throw new Error("Invalid OAuth state")}if(!state||typeof state.exp!=="number"||!state.userId||!state.clientId||!state.platform)throw new Error("Invalid OAuth state");if(state.exp<Date.now())throw new Error("OAuth request expired");return state;}

const credentials=(p:OAuthPlatform)=>{
 const prefix=p==="META"?"META":p;
 const clientId=process.env[`${prefix}_CLIENT_ID`]||process.env[`${prefix}_APP_ID`]||(p==="META"?META_APP_ID:"");
 const clientSecret=process.env[`${prefix}_CLIENT_SECRET`]||process.env[`${prefix}_APP_SECRET`]||"";
 if(!clientId||!clientSecret)throw new Error(`${p} OAuth Client ID/Secret are not configured in Vercel`);
 return{clientId,clientSecret};
};

export function oauthConfigured(p:string){try{credentials(p as OAuthPlatform);encryptionSecret();appBase();return true}catch{return false}}

export function authorizationUrl(platform:OAuthPlatform,state:string){
 const {clientId}=credentials(platform),redirect=callback(platform);
 if(platform==="META"){
  const configId=process.env.META_CONFIG_ID||META_CONFIG_ID;
  const q=new URLSearchParams({client_id:clientId,redirect_uri:redirect,state,response_type:"code"});
  if(configId)q.set("config_id",configId);else q.set("scope","ads_read,ads_management");
  return `https://www.facebook.com/${process.env.META_GRAPH_VERSION||"v23.0"}/dialog/oauth?${q.toString()}`;
 }
 if(platform==="GOOGLE")return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}`;
 if(platform==="LINKEDIN")return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent("r_ads r_ads_reporting rw_ads")}`;
 if(platform==="SNAPCHAT")return `https://accounts.snapchat.com/login/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent("snapchat-marketing-api")}&state=${encodeURIComponent(state)}`;
 return `https://business-api.tiktok.com/portal/auth?app_id=${clientId}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirect)}`;
}

async function parseResponse(r:Response):Promise<OAuthTokenPayload>{const text=await r.text();let data:OAuthTokenPayload;try{data=JSON.parse(text) as OAuthTokenPayload}catch{data=Object.fromEntries(new URLSearchParams(text)) as OAuthTokenPayload}const errorMessage=typeof data.error==="string"?data.error:data.error?.message;if(!r.ok||data.error||(data.code!==undefined&&data.code!==0))throw new Error(data.error_description||errorMessage||data.message||"OAuth token exchange failed");return data;}
const requiredAccessToken=(data:OAuthTokenPayload)=>{if(!data.access_token)throw new Error("OAuth provider returned no access token");return data.access_token};
export async function exchangeCode(platform:OAuthPlatform,code:string):Promise<TokenSet>{const {clientId,clientSecret}=credentials(platform),redirect=callback(platform);if(platform==="META"){const q=new URLSearchParams({client_id:clientId,client_secret:clientSecret,redirect_uri:redirect,code});const d=await parseResponse(await providerFetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION||"v23.0"}/oauth/access_token?${q.toString()}`));return{accessToken:requiredAccessToken(d),expiresIn:d.expires_in};}if(platform==="TIKTOK"){const d=await parseResponse(await providerFetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:clientId,secret:clientSecret,auth_code:code})}));const t=d.data||d;return{accessToken:requiredAccessToken(t),refreshToken:t.refresh_token,expiresIn:t.expires_in};}const tokenUrl=platform==="GOOGLE"?"https://oauth2.googleapis.com/token":platform==="LINKEDIN"?"https://www.linkedin.com/oauth/v2/accessToken":"https://accounts.snapchat.com/login/oauth2/access_token";const body=new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:redirect,client_id:clientId,client_secret:clientSecret});const d=await parseResponse(await providerFetch(tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}));return{accessToken:requiredAccessToken(d),refreshToken:d.refresh_token,expiresIn:d.expires_in};}

async function refresh(platform:OAuthPlatform,refreshToken:string):Promise<TokenSet>{const {clientId,clientSecret}=credentials(platform);if(platform==="TIKTOK"){const d=await parseResponse(await providerFetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:clientId,secret:clientSecret,grant_type:"refresh_token",refresh_token:refreshToken})}));const t=d.data||d;return{accessToken:requiredAccessToken(t),refreshToken:t.refresh_token||refreshToken,expiresIn:t.expires_in};}const tokenUrl=platform==="GOOGLE"?"https://oauth2.googleapis.com/token":platform==="LINKEDIN"?"https://www.linkedin.com/oauth/v2/accessToken":"https://accounts.snapchat.com/login/oauth2/access_token";const d=await parseResponse(await providerFetch(tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:refreshToken,client_id:clientId,client_secret:clientSecret})}));return{accessToken:requiredAccessToken(d),refreshToken:d.refresh_token||refreshToken,expiresIn:d.expires_in};}

export async function connectionAccessToken(connection:ConnectionTokenInput){if(!connection.workspaceId)throw new Error("Connection workspace context is required");if(!connection.accessTokenEncrypted)return"";const exp=connection.tokenExpiresAt?new Date(connection.tokenExpiresAt).getTime():0;if(!exp||exp>Date.now()+5*60_000)return decryptToken(connection.accessTokenEncrypted);const refreshToken=decryptToken(connection.refreshTokenEncrypted);if(!refreshToken)return decryptToken(connection.accessTokenEncrypted);const next=await refresh(connection.platform as OAuthPlatform,refreshToken);const values:Partial<typeof adPlatformConnections.$inferInsert>={accessTokenEncrypted:encryptToken(next.accessToken),refreshTokenEncrypted:encryptToken(next.refreshToken||refreshToken),tokenExpiresAt:next.expiresIn?new Date(Date.now()+next.expiresIn*1000):null,status:"CONNECTED",syncError:null,updatedAt:new Date()};const changed=await db.update(adPlatformConnections).set(values).where(and(eq(adPlatformConnections.id,connection.id),eq(adPlatformConnections.workspaceId,connection.workspaceId))).returning({id:adPlatformConnections.id});if(!changed.length)throw new Error("OAuth connection is no longer available in this workspace");return next.accessToken;}
