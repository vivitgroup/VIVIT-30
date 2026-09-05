import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

export const OPENROUTER_KEY_COOKIE="__Host-vivito_openrouter_key";
export const OPENROUTER_PKCE_COOKIE="__Host-vivito_openrouter_pkce";

function keyMaterial(){const secret=String(process.env.OAUTH_ENCRYPTION_KEY||process.env.AUTH_SECRET||"").trim();if(secret.length<32)throw new Error("OpenRouter OAuth encryption secret is not configured");return createHash("sha256").update(secret).digest()}
export function sealOpenRouterSecret(value:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",keyMaterial(),iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]),tag=cipher.getAuthTag();return ["v1",iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".")}
export function unsealOpenRouterSecret(token:string){const [version,ivRaw,tagRaw,dataRaw]=String(token||"").split(".");if(version!=="v1"||!ivRaw||!tagRaw||!dataRaw)return "";try{const decipher=createDecipheriv("aes-256-gcm",keyMaterial(),Buffer.from(ivRaw,"base64url"));decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));return Buffer.concat([decipher.update(Buffer.from(dataRaw,"base64url")),decipher.final()]).toString("utf8")}catch{return ""}}
export function createOpenRouterPkce(){const verifier=randomBytes(32).toString("base64url"),challenge=createHash("sha256").update(verifier).digest("base64url"),state=randomBytes(18).toString("base64url");return {verifier,challenge,state}}
export function openRouterCookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge}}
