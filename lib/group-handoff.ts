import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {Role} from "@/lib/types";

type HandoffClaims={v:1;sub:string;email:string;name?:string;business_unit:"marketing";iat:number;exp:number;nonce:string};
type MarketingUser={id:string;name:string;email:string;role:string;workspace_id:string;is_active:boolean;approval_status:string};
type WorkspaceRow={id:string;is_active:boolean};

const isRole=(value:unknown):value is Role=>typeof value==="string"&&Object.values(Role).some(role=>role===value);
const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const b64urlDecode=(value:string)=>Buffer.from(value,"base64url");

function getConfig(){
  const secret=process.env.VGROUP_MARKETING_HANDOFF_SECRET;
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_KEY;
  if(!secret||secret.length<32)throw new Error("handoff_secret_unavailable");
  if(!url||!key)throw new Error("marketing_database_unavailable");
  return {secret,url,headers:{apikey:key,Authorization:`Bearer ${key}`}};
}

export function verifyGroupHandoffAssertion(assertion:string):HandoffClaims{
  const {secret}=getConfig();
  const parts=assertion.split(".");
  if(parts.length!==2)throw new Error("invalid_handoff_assertion");
  const [payloadPart,signaturePart]=parts;
  const expected=createHmac("sha256",secret).update(payloadPart).digest();
  let provided:Buffer;
  try{provided=b64urlDecode(signaturePart)}catch{throw new Error("invalid_handoff_signature")}
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw new Error("invalid_handoff_signature");
  let claims:unknown;
  try{claims=JSON.parse(b64urlDecode(payloadPart).toString("utf8"))}catch{throw new Error("invalid_handoff_payload")}
  if(!claims||typeof claims!=="object")throw new Error("invalid_handoff_payload");
  const c=claims as Partial<HandoffClaims>;
  const now=Math.floor(Date.now()/1000);
  if(c.v!==1||c.business_unit!=="marketing"||typeof c.sub!=="string"||!c.sub||typeof c.email!=="string"||!c.email||typeof c.nonce!=="string"||c.nonce.length<16||typeof c.iat!=="number"||typeof c.exp!=="number")throw new Error("invalid_handoff_claims");
  if(c.exp<=now||c.iat>now+5||c.exp<=c.iat||c.exp-c.iat>60)throw new Error("expired_handoff_assertion");
  return {...c,email:normalizeEmail(c.email)} as HandoffClaims;
}

async function findMarketingUser(email:string):Promise<MarketingUser|null>{
  const {url,headers}=getConfig();
  const response=await fetch(`${url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,name,email,role,workspace_id,is_active,approval_status&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw new Error("marketing_user_lookup_failed");
  const rows=await response.json() as MarketingUser[];
  return rows[0]??null;
}

async function verifyWorkspace(workspaceId:string):Promise<boolean>{
  const {url,headers}=getConfig();
  const response=await fetch(`${url}/rest/v1/workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=id,is_active&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(!response.ok)return false;
  const rows=await response.json() as WorkspaceRow[];
  return rows[0]?.is_active===true;
}

async function consumeNonce(claims:HandoffClaims):Promise<void>{
  const {url,headers}=getConfig();
  const nonceHash=createHash("sha256").update(claims.nonce).digest("hex");
  const response=await fetch(`${url}/rest/v1/group_handoff_nonces`,{method:"POST",headers:{...headers,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({nonce_hash:nonceHash,group_user_id:claims.sub,email:claims.email,expires_at:new Date(claims.exp*1000).toISOString()}),cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(response.status===409)throw new Error("handoff_replay_detected");
  if(!response.ok)throw new Error("handoff_nonce_store_failed");
}

export async function authorizeGroupHandoff(assertion:string){
  const claims=verifyGroupHandoffAssertion(assertion);
  const user=await findMarketingUser(claims.email);
  if(!user||normalizeEmail(user.email)!==claims.email)throw new Error("marketing_user_not_found");
  if(!user.is_active||user.approval_status!=="APPROVED"||!user.workspace_id||!isRole(user.role))throw new Error("marketing_user_not_authorized");
  if(!await verifyWorkspace(user.workspace_id))throw new Error("marketing_workspace_not_authorized");
  await consumeNonce(claims);
  return {id:user.id,email:user.email,name:user.name,role:user.role,workspaceId:user.workspace_id};
}
