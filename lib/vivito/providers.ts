export type VivitoProviderName="gemini"|"claude";
export type VivitoGeneration={text:string;provider:VivitoProviderName;attempted:VivitoProviderName[];errors:string[]};

type GenerateOptions={temperature?:number;maxTokens?:number;preferred?:VivitoProviderName[]};

const ANTHROPIC_URL="https://api.anthropic.com/v1/messages";

async function callClaude(prompt:string,system:string,options:GenerateOptions){
  if(!process.env.ANTHROPIC_API_KEY)throw new Error("claude-not-configured");
  const r=await fetch(ANTHROPIC_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-20250514",
      max_tokens:options.maxTokens||3200,
      temperature:options.temperature??0.18,
      system,
      messages:[{role:"user",content:prompt}],
    }),
  });
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||`claude-${r.status}`);
  const text=String(d?.content?.[0]?.text||"").trim();
  if(!text)throw new Error("claude-empty-response");
  return text;
}

async function callGemini(prompt:string,system:string,options:GenerateOptions){
  if(!process.env.GEMINI_API_KEY)throw new Error("gemini-not-configured");
  const model=process.env.GEMINI_MODEL||"gemini-2.0-flash";
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:system}]},
      contents:[{role:"user",parts:[{text:prompt}]}],
      generationConfig:{temperature:options.temperature??0.18,maxOutputTokens:options.maxTokens||3200},
    }),
  });
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||`gemini-${r.status}`);
  const text=String(d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join("\n")||"").trim();
  if(!text)throw new Error("gemini-empty-response");
  return text;
}

export function configuredVivitoProviders():VivitoProviderName[]{
  const providers:VivitoProviderName[]=[];
  if(process.env.GEMINI_API_KEY)providers.push("gemini");
  if(process.env.ANTHROPIC_API_KEY)providers.push("claude");
  return providers;
}

export async function generateVivito(prompt:string,system:string,options:GenerateOptions={}):Promise<VivitoGeneration>{
  const configured=configuredVivitoProviders();
  if(!configured.length)throw new Error("provider-not-configured");
  const preferred=(options.preferred||["gemini","claude"]).filter(p=>configured.includes(p));
  const order=[...preferred,...configured.filter(p=>!preferred.includes(p))];
  const attempted:VivitoProviderName[]=[];
  const errors:string[]=[];
  for(const provider of order){
    attempted.push(provider);
    try{
      const text=provider==="gemini"?await callGemini(prompt,system,options):await callClaude(prompt,system,options);
      return{text,provider,attempted,errors};
    }catch(error:any){
      errors.push(`${provider}:${String(error?.message||error)}`.slice(0,240));
    }
  }
  throw new Error(`all-providers-failed:${errors.join(" | ")}`);
}
