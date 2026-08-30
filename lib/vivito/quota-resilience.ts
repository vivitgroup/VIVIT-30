export type VivitoProviderHealth="HEALTHY"|"RATE_LIMITED"|"QUOTA_EXHAUSTED"|"TEMPORARY_FAILURE"|"AUTH_FAILURE"|"UNKNOWN_FAILURE";

export type VivitoProviderFailure={
  health:VivitoProviderHealth;
  retryable:boolean;
  cooldownMs:number;
  safeCode:string;
};

const DEFAULT_RATE_LIMIT_COOLDOWN_MS=60_000;
const DEFAULT_QUOTA_COOLDOWN_MS=15*60_000;
const providerCooldownUntil=new Map<string,number>();

export function classifyVivitoProviderFailure(error:unknown,status?:number):VivitoProviderFailure{
  const raw=String(error instanceof Error?error.message:error||"").toLowerCase();
  const code=Number(status||0);
  if(code===401||code===403||/invalid api key|authentication|unauthorized|permission denied/.test(raw))return{health:"AUTH_FAILURE",retryable:false,cooldownMs:0,safeCode:"provider-auth-failure"};
  if(code===429||/rate limit|too many requests|resource_exhausted/.test(raw)){
    const quota=/quota|billing|free tier|daily limit|per day/.test(raw);
    return quota
      ?{health:"QUOTA_EXHAUSTED",retryable:true,cooldownMs:DEFAULT_QUOTA_COOLDOWN_MS,safeCode:"provider-quota-exhausted"}
      :{health:"RATE_LIMITED",retryable:true,cooldownMs:DEFAULT_RATE_LIMIT_COOLDOWN_MS,safeCode:"provider-rate-limited"};
  }
  if(code>=500||/timeout|temporar|unavailable|network|fetch failed|overloaded/.test(raw))return{health:"TEMPORARY_FAILURE",retryable:true,cooldownMs:15_000,safeCode:"provider-temporary-failure"};
  return{health:"UNKNOWN_FAILURE",retryable:false,cooldownMs:0,safeCode:"provider-failure"};
}

export function markVivitoProviderCooldown(provider:string,failure:VivitoProviderFailure,now=Date.now()){
  if(failure.cooldownMs>0)providerCooldownUntil.set(provider,now+failure.cooldownMs);
}

export function vivitoProviderCooldownRemaining(provider:string,now=Date.now()){
  const until=providerCooldownUntil.get(provider)||0;
  if(until<=now){providerCooldownUntil.delete(provider);return 0;}
  return until-now;
}

export function clearVivitoProviderCooldown(provider:string){providerCooldownUntil.delete(provider)}

export function buildVivitoDegradedModeMessage(configuredProviders:number,cachedKnowledgeAvailable:boolean){
  if(configuredProviders>0)return"Live model provider is temporarily constrained. VIVITO should fail over to another configured provider when available; otherwise preserve the request and report a temporary provider limit without inventing an answer.";
  if(cachedKnowledgeAvailable)return"No live model provider is currently available. Use deterministic calculations and cached verified knowledge only; label the response as degraded mode and do not present stale knowledge as live.";
  return"No live model provider is currently available. Do not fabricate an AI answer; report the provider limitation and keep deterministic/local capabilities available.";
}
