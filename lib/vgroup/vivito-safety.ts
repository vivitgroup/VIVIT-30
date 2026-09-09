import type {VivitoCapability} from "@/lib/vgroup/vivito-cross-workspace";

const idempotencyPattern=/^[A-Za-z0-9._:-]{8,128}$/;
const destructiveKey=/(delete|archive|cancel|reject|void|remove|terminate|deactivate|rollback)/i;

export type VivitoSafetyDecision={
  allowed:boolean;
  approvalRequired:boolean;
  reason?:string;
};

export function validVivitoIdempotencyKey(value:string){return idempotencyPattern.test(value)}

export function vivitoSafetyDecision(cap:VivitoCapability):VivitoSafetyDecision{
  if(!cap.enabled||!cap.endpoint)return {allowed:false,approvalRequired:true,reason:"CAPABILITY_DISABLED"};
  const destructive=destructiveKey.test(cap.key);
  const approvalRequired=cap.approvalRequired||cap.risk==="sensitive"||destructive||cap.method==="DELETE";
  return {allowed:true,approvalRequired};
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
