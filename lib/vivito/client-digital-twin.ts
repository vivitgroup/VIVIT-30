export type VivitoTwinSignal={kind:string;text:string;createdAt:string;source:string;scopeId?:string};
export type VivitoClientTwin={clientId:string;signalCount:number;profile:string[];preferences:string[];corrections:string[];facts:string[];lessons:string[];confidence:"LOW"|"MEDIUM"|"HIGH"};

const clean=(v:unknown,n=600)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const uniq=(xs:string[])=>[...new Set(xs.map(x=>clean(x)).filter(Boolean))];

export function buildVivitoClientTwin(clientId:string,signals:VivitoTwinSignal[]):VivitoClientTwin{
 const scoped=signals.filter(s=>s.text&&String(s.scopeId||clientId)===clientId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,120);
 const by=(kind:string)=>uniq(scoped.filter(s=>s.kind===kind).map(s=>s.text)).slice(0,12);
 const facts=by("FACT"),preferences=by("PREFERENCE"),corrections=by("CORRECTION"),lessons=uniq(scoped.filter(s=>["LEARNING","OUTCOME"].includes(s.kind)).map(s=>s.text)).slice(0,16);
 const profile=uniq([...facts,...preferences,...corrections,...lessons]).slice(0,24);
 const signalCount=scoped.length,confidence=signalCount>=12?"HIGH":signalCount>=4?"MEDIUM":"LOW";
 return{clientId,signalCount,profile,preferences,corrections,facts,lessons,confidence};
}

export function clientTwinContext(twins:VivitoClientTwin[]){
 if(!twins.length)return"No client digital-twin evidence available.";
 return twins.map(t=>`CLIENT TWIN ${t.clientId} | confidence=${t.confidence} | signals=${t.signalCount}\n${t.profile.map(x=>`- ${x}`).join("\n")}`).join("\n\n");
}

export const VIVITO_DIGITAL_TWIN_DOCTRINE=[
 "A client twin is derived evidence, never a source of invented live metrics.",
 "Live ERP facts override historical twin signals when they conflict.",
 "Corrections override older preferences or assumptions.",
 "Low-confidence twins must be treated as hypotheses, not facts.",
 "Client-scoped signals must never cross authorization boundaries.",
] as const;
