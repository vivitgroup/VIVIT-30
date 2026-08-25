type TextArgs={system:string;prompt:string};
export type AIProviderResult={text:string;provider:string};

async function gemini({system,prompt}:TextArgs):Promise<AIProviderResult>{
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("GEMINI_NOT_CONFIGURED");
 const model=process.env.GEMINI_MODEL||"gemini-2.0-flash";
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.45,maxOutputTokens:2200}})});
 const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"Gemini failed");const text=d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join("\n");if(!text)throw new Error("Gemini empty");return{text,provider:"gemini"};
}
async function anthropic({system,prompt}:TextArgs):Promise<AIProviderResult>{
 const key=process.env.ANTHROPIC_API_KEY;if(!key)throw new Error("ANTHROPIC_NOT_CONFIGURED");
 const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-20250514",max_tokens:2200,system,messages:[{role:"user",content:prompt}]})});
 const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"Anthropic failed");const text=d?.content?.[0]?.text;if(!text)throw new Error("Anthropic empty");return{text,provider:"anthropic"};
}
async function openai({system,prompt}:TextArgs):Promise<AIProviderResult>{
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_NOT_CONFIGURED");
 const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||"gpt-4.1-mini",temperature:.45,messages:[{role:"system",content:system},{role:"user",content:prompt}]})});
 const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"OpenAI failed");const text=d?.choices?.[0]?.message?.content;if(!text)throw new Error("OpenAI empty");return{text,provider:"openai"};
}
export async function generateText(args:TextArgs):Promise<AIProviderResult>{
 const order=(process.env.AI_PROVIDER_ORDER||"gemini,anthropic,openai").split(",").map(x=>x.trim());const errors:string[]=[];
 for(const p of order){try{if(p==="gemini")return await gemini(args);if(p==="anthropic")return await anthropic(args);if(p==="openai")return await openai(args)}catch(e:any){errors.push(`${p}:${String(e?.message||e).slice(0,120)}`)}}
 throw new Error(`No AI provider available. ${errors.join(" | ")}`);
}

export async function generateImage(input:{prompt:string;size?:string;referenceDataUrl?:string|null}){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("Image generation needs OPENAI_API_KEY");
 const size=input.size||"1024x1024";
 if(input.referenceDataUrl){
  const m=input.referenceDataUrl.match(/^data:(.*?);base64,(.*)$/);if(!m)throw new Error("Invalid reference image");const bytes=Buffer.from(m[2],"base64");const fd=new FormData();fd.append("model",process.env.OPENAI_IMAGE_MODEL||"gpt-image-1");fd.append("prompt",input.prompt);fd.append("size",size);fd.append("image",new Blob([bytes],{type:m[1]}),"reference.png");
  const r=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:fd});const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"Image edit failed");return{b64:d?.data?.[0]?.b64_json,url:d?.data?.[0]?.url,provider:"openai"};
 }
 const r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-1",prompt:input.prompt,size})});const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||"Image generation failed");return{b64:d?.data?.[0]?.b64_json,url:d?.data?.[0]?.url,provider:"openai"};
}
