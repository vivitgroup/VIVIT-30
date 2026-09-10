const REDACTED="[REDACTED]";
const MAX_DEPTH=6;
const MAX_ARRAY=50;
const MAX_STRING=1000;

const SECRET_KEY=/(?:authorization|cookie|password|passwd|secret|token|api[-_]?key|client[-_]?secret|private[-_]?key|access[-_]?token|refresh[-_]?token)/i;
const BEARER=/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT=/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

function safeString(value:string){
 return value.replace(BEARER,"Bearer [REDACTED]").replace(JWT,REDACTED).slice(0,MAX_STRING);
}

export function redactAuditValue(value:unknown,depth=0):unknown{
 if(depth>MAX_DEPTH)return "[TRUNCATED]";
 if(value===null||value===undefined||typeof value==="number"||typeof value==="boolean")return value??null;
 if(typeof value==="string")return safeString(value);
 if(value instanceof Date)return value.toISOString();
 if(Array.isArray(value))return value.slice(0,MAX_ARRAY).map(item=>redactAuditValue(item,depth+1));
 if(typeof value==="object"){
  const out:Record<string,unknown>={};
  for(const [key,item] of Object.entries(value as Record<string,unknown>))out[key]=SECRET_KEY.test(key)?REDACTED:redactAuditValue(item,depth+1);
  return out;
 }
 return safeString(String(value));
}

export function auditStringify(value:unknown){return JSON.stringify(redactAuditValue(value));}

export function parseSanitizedAudit(value:unknown):unknown{
 try{return redactAuditValue(typeof value==="string"?JSON.parse(value):value)}catch{return null}
}
