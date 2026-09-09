import type {VivitoCapability} from "@/lib/vgroup/vivito-cross-workspace";

const idempotencyPattern=/^[A-Za-z0-9._:-]{8,128}$/;
const destructiveKey=/(delete|archive|cancel|reject|void|remove|terminate|deactivate|rollback)/i;

export type VivitoSafetyDecision={
  allowed:boolean;
  approvalRequired:boolean;
  reason?:string;
};
export type VivitoPayloadValidation={ok:true;payload:Record<string,unknown>}|{ok:false;code:string;message:string};

export function validVivitoIdempotencyKey(value:string){return idempotencyPattern.test(value)}

export function vivitoSafetyDecision(cap:VivitoCapability):VivitoSafetyDecision{
  if(!cap.enabled||!cap.endpoint)return {allowed:false,approvalRequired:true,reason:"CAPABILITY_DISABLED"};
  const destructive=destructiveKey.test(cap.key);
  const approvalRequired=cap.approvalRequired||cap.risk==="sensitive"||destructive||cap.method==="DELETE";
  return {allowed:true,approvalRequired};
}

export function validateVivitoCapabilityPayload(cap:VivitoCapability,value:unknown):VivitoPayloadValidation{
  if(value===null||value===undefined)value={};
  if(typeof value!=="object"||Array.isArray(value))return {ok:false,code:"INVALID_PAYLOAD",message:"Capability payload must be an object"};
  const payload=value as Record<string,unknown>;
  if(cap.allowedPayloadKeys){
    const allowed=new Set(cap.allowedPayloadKeys);
    const unknown=Object.keys(payload).filter(key=>!allowed.has(key));
    if(unknown.length)return {ok:false,code:"UNKNOWN_PAYLOAD_FIELD",message:`Unsupported payload field: ${unknown[0]}`};
  }
  for(const key of cap.requiredPayloadKeys??[]){
    const item=payload[key];
    if(item===undefined||item===null||(typeof item==="string"&&!item.trim()))return {ok:false,code:"MISSING_REQUIRED_FIELD",message:`Required payload field is missing: ${key}`};
  }
  return {ok:true,payload};
}

export function assertVivitoOutboundTarget(target:URL,requestUrl:string){
  const origin=new URL(requestUrl).origin;
  if(target.origin!==origin)throw new Error("CROSS_ORIGIN_TARGET_BLOCKED");
  if(!target.pathname.startsWith("/api/"))throw new Error("NON_API_TARGET_BLOCKED");
}

export function vivitoRetrySafety(error:unknown){
  const timeout=error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError");
  return {retrySafe:!timeout,errorCode:timeout?"EXECUTION_OUTCOME_UNKNOWN_TIMEOUT":error instanceof Error?error.message:"EXECUTION_FAILED"};
}
