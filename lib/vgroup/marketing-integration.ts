import {createHmac,randomUUID} from "node:crypto";
import type {VGroupSession} from "@/lib/vgroup/session";

export const VGROUP_MARKETING_BASE_SHA="b66542a3cfee8d5d54299450e8bc6a79b2a51062";
export const VGROUP_PINNED_MARKETING_SHA="3fc3f24b991fbc1f9b9802d7196d37910393226c";

export type MarketingIntegrationState={
  enabled:boolean;
  candidateSha:string;
  certified:boolean;
};

type MarketingHandoffClaims={
  v:1;
  sub:string;
  email:string;
  name:string;
  business_unit:"marketing";
  iat:number;
  exp:number;
  nonce:string;
};

export function getMarketingIntegrationState():MarketingIntegrationState{
  const enabled=process.env.VGROUP_MARKETING_INTEGRATION_ENABLED==="true";
  const candidateSha=(process.env.VGROUP_MARKETING_CANDIDATE_SHA||VGROUP_PINNED_MARKETING_SHA).trim();
  const certified=candidateSha===VGROUP_PINNED_MARKETING_SHA;
  if(enabled&&!certified)throw new Error("Marketing candidate SHA changed; re-certification required");
  return {enabled,candidateSha,certified};
}

function normalizeEmail(value:string){return value.trim().toLowerCase()}

export function createMarketingHandoff(session:VGroupSession){
  const state=getMarketingIntegrationState();
  if(!state.enabled||!state.certified)throw new Error("Marketing integration is not enabled and certified");
  const secret=process.env.VGROUP_MARKETING_HANDOFF_SECRET;
  const endpoint=process.env.VGROUP_MARKETING_HANDOFF_URL;
  if(!secret||secret.length<32)throw new Error("Marketing handoff secret is not configured");
  if(!endpoint)throw new Error("Marketing handoff URL is not configured");
  const target=new URL(endpoint);
  if(target.protocol!=="https:"&&!(target.hostname==="localhost"||target.hostname==="127.0.0.1"))throw new Error("Marketing handoff URL must use HTTPS");
  const now=Math.floor(Date.now()/1000);
  const claims:MarketingHandoffClaims={
    v:1,
    sub:session.userId,
    email:normalizeEmail(session.email),
    name:session.fullName,
    business_unit:"marketing",
    iat:now,
    exp:now+45,
    nonce:randomUUID(),
  };
  const payload=Buffer.from(JSON.stringify(claims),"utf8").toString("base64url");
  const signature=createHmac("sha256",secret).update(payload).digest("base64url");
  return {endpoint:target.toString(),assertion:`${payload}.${signature}`,expiresAt:claims.exp};
}
