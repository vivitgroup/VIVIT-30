import fs from "node:fs";
import crypto from "node:crypto";
import {mutateExternalCampaign} from "../lib/vivito/ad-platform-writes";

type ProviderName="meta"|"google"|"tiktok"|"snapchat"|"linkedin";
const cfg:Record<ProviderName,{platform:string;token:string;campaignId:string;accountId:string;status:string;extra?:()=>string[]}>= {
 meta:{platform:"META",token:process.env.VIVITO_CERT_META_TOKEN||"",campaignId:process.env.VIVITO_CERT_META_CAMPAIGN_ID||"",accountId:process.env.VIVITO_CERT_META_ACCOUNT_ID||"",status:process.env.VIVITO_CERT_META_CURRENT_STATUS||""},
 google:{platform:"GOOGLE",token:process.env.VIVITO_CERT_GOOGLE_TOKEN||"",campaignId:process.env.VIVITO_CERT_GOOGLE_CAMPAIGN_ID||"",accountId:process.env.VIVITO_CERT_GOOGLE_ACCOUNT_ID||"",status:process.env.VIVITO_CERT_GOOGLE_CURRENT_STATUS||"",extra:()=>process.env.GOOGLE_ADS_DEVELOPER_TOKEN?[]:["GOOGLE_ADS_DEVELOPER_TOKEN"]},
 tiktok:{platform:"TIKTOK",token:process.env.VIVITO_CERT_TIKTOK_TOKEN||"",campaignId:process.env.VIVITO_CERT_TIKTOK_CAMPAIGN_ID||"",accountId:process.env.VIVITO_CERT_TIKTOK_ACCOUNT_ID||"",status:process.env.VIVITO_CERT_TIKTOK_CURRENT_STATUS||""},
 snapchat:{platform:"SNAPCHAT",token:process.env.VIVITO_CERT_SNAPCHAT_TOKEN||"",campaignId:process.env.VIVITO_CERT_SNAPCHAT_CAMPAIGN_ID||"",accountId:process.env.VIVITO_CERT_SNAPCHAT_ACCOUNT_ID||"",status:process.env.VIVITO_CERT_SNAPCHAT_CURRENT_STATUS||""},
 linkedin:{platform:"LINKEDIN",token:process.env.VIVITO_CERT_LINKEDIN_TOKEN||"",campaignId:process.env.VIVITO_CERT_LINKEDIN_CAMPAIGN_ID||"",accountId:process.env.VIVITO_CERT_LINKEDIN_ACCOUNT_ID||"",status:process.env.VIVITO_CERT_LINKEDIN_CURRENT_STATUS||""},
};
const digest=(v:string)=>crypto.createHash("sha256").update(v).digest("hex").slice(0,16);

async function main(){
 fs.mkdirSync('.vivito',{recursive:true});
 const providers:any={};
 let all=true;
 for(const [name,c] of Object.entries(cfg) as [ProviderName,(typeof cfg)[ProviderName]][]){
  const missing:string[]=[];
  if(!c.token)missing.push(`VIVITO_CERT_${name.toUpperCase()}_TOKEN`);
  if(!c.campaignId)missing.push(`VIVITO_CERT_${name.toUpperCase()}_CAMPAIGN_ID`);
  if(!c.accountId)missing.push(`VIVITO_CERT_${name.toUpperCase()}_ACCOUNT_ID`);
  if(!c.status)missing.push(`VIVITO_CERT_${name.toUpperCase()}_CURRENT_STATUS`);
  if(c.extra)missing.push(...c.extra());
  if(missing.length){providers[name]={passed:false,blocked:true,missing};all=false;continue;}
  try{
   // Certification performs a same-state status mutation only. The supplied CURRENT_STATUS must match the live test campaign state.
   const result=await mutateExternalCampaign({platform:c.platform,campaignId:c.campaignId,adAccountId:c.accountId,accessToken:c.token,status:c.status});
   providers[name]={passed:true,blocked:false,liveWrite:true,sameState:true,campaignRef:digest(c.campaignId),accountRef:digest(c.accountId),applied:result.applied,providerRequest:result.providerRequest};
  }catch(error){providers[name]={passed:false,blocked:false,error:String((error as any)?.message||error).slice(0,500),campaignRef:digest(c.campaignId),accountRef:digest(c.accountId)};all=false;}
 }
 const report={passed:all,mode:"same-state-live-provider-certification",createdAt:new Date().toISOString(),providers};
 fs.writeFileSync('.vivito/provider-e2e.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!all)process.exit(1);
}
main().catch(error=>{console.error(error);process.exit(1)});
