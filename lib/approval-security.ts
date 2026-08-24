import crypto from "crypto";
export const hashApprovalToken=(raw:string)=>crypto.createHash("sha256").update(raw).digest("hex");
export const escapeHtml=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
export function safeHttpUrl(value:unknown){const raw=String(value??"").trim();if(!raw)return null;try{const u=new URL(raw);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}}
