export const DUAL_OPERATOR_EMAILS=new Set(["noha@vivitgroup.com","yossef@vivitgroup.com"]);

export function isDualOperator(email:unknown){
 return DUAL_OPERATOR_EMAILS.has(String(email||"").trim().toLowerCase());
}

export function hasOperatorCapability(role:unknown,email:unknown,capability:"ACCOUNT_MANAGER"|"MEDIA_BUYER"){
 const value=String(role||"");
 if(value==="SUPER_ADMIN")return true;
 if(isDualOperator(email))return value==="ACCOUNT_MANAGER"||value==="MEDIA_BUYER";
 return value===capability;
}
