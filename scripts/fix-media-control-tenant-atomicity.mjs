import fs from "node:fs";
const file="app/api/media-control/route.ts";
let s=fs.readFileSync(file,"utf8");
const replacements=[
  [
    'const [row]=await db.insert(adCampaigns).values({clientId:body.clientId,platform:parsed.platform,externalId:parsed.externalId,',
    'const [foreignCampaign]=await db.select({id:adCampaigns.id,workspaceId:adCampaigns.workspaceId}).from(adCampaigns).where(and(eq(adCampaigns.platform,parsed.platform),eq(adCampaigns.externalId,parsed.externalId))).limit(1);if(foreignCampaign&&foreignCampaign.workspaceId!==ctx.workspaceId)return NextResponse.json({error:"This campaign is already linked outside this workspace."},{status:409});const [row]=await db.insert(adCampaigns).values({workspaceId:ctx.workspaceId,clientId:body.clientId,platform:parsed.platform,externalId:parsed.externalId,'
  ],
  [
    'await db.insert(auditLogs).values({userId:ctx.userId,action:"campaign_linked",entity:"ad_campaigns",entityId:row.id,newValues:JSON.stringify(parsed)});',
    'await db.insert(auditLogs).values({workspaceId:ctx.workspaceId,userId:ctx.userId,action:"campaign_linked",entity:"ad_campaigns",entityId:row.id,newValues:JSON.stringify(parsed)});'
  ],
  [
    'db.select().from(adCampaigns).where(eq(adCampaigns.id,body.campaignId)).limit(1)',
    'db.select().from(adCampaigns).where(and(eq(adCampaigns.id,body.campaignId),eq(adCampaigns.workspaceId,ctx.workspaceId))).limit(1)'
  ],
  [
    'db.insert(mediaPlans).values({clientId:body.clientId,name:',
    'db.insert(mediaPlans).values({workspaceId:ctx.workspaceId,clientId:body.clientId,name:'
  ],
  [
    '.from(mediaPlans).where(eq(mediaPlans.id,body.planId)).limit(1)',
    '.from(mediaPlans).where(and(eq(mediaPlans.id,body.planId),eq(mediaPlans.workspaceId,ctx.workspaceId))).limit(1)'
  ],
  [
    'await db.update(mediaPlans).set({status:decision,clientNote:note||null,approvedBy:ctx.userId,approvedAt:decision==="APPROVED"?new Date():null,updatedAt:new Date()}).where(eq(mediaPlans.id,body.planId));if(plan.submittedBy)await db.insert(notifications).values({userId:plan.submittedBy,type:"MEDIA_PLAN_REVIEW",title:`Media plan ${decision.toLowerCase()}`,message:`${plan.name} was ${decision.toLowerCase()} by the account manager.${note?` Note: ${note}`:""}`,link:"/dashboard/media/control-center",priority:decision==="APPROVED"?"normal":"high"});await db.insert(auditLogs).values({userId:ctx.userId,action:`media_plan_${decision.toLowerCase()}`,entity:"media_plans",entityId:plan.id,newValues:JSON.stringify({note,role:ctx.role})});',
    'const reviewed=await db.transaction(async tx=>{const changed=await tx.update(mediaPlans).set({status:decision,clientNote:note||null,approvedBy:ctx.userId,approvedAt:decision==="APPROVED"?new Date():null,updatedAt:new Date()}).where(and(eq(mediaPlans.id,body.planId),eq(mediaPlans.workspaceId,ctx.workspaceId),inArray(mediaPlans.status,["PENDING_APPROVAL","REVISION"]))).returning({id:mediaPlans.id});if(!changed.length)return false;if(plan.submittedBy)await tx.insert(notifications).values({userId:plan.submittedBy,type:"MEDIA_PLAN_REVIEW",title:`Media plan ${decision.toLowerCase()}`,message:`${plan.name} was ${decision.toLowerCase()} by the account manager.${note?` Note: ${note}`:""}`,link:"/dashboard/media/control-center",priority:decision==="APPROVED"?"normal":"high"});await tx.insert(auditLogs).values({workspaceId:ctx.workspaceId,userId:ctx.userId,action:`media_plan_${decision.toLowerCase()}`,entity:"media_plans",entityId:plan.id,newValues:JSON.stringify({note,role:ctx.role})});return true});if(!reviewed)return NextResponse.json({error:"Media plan state changed before review completed."},{status:409});'
  ],
  [
    'const [row]=await db.insert(adPlatformConnections).values({clientId:body.clientId,platform,adAccountId:String(body.adAccountId||""),',
    'const adAccountId=String(body.adAccountId||"").trim();const [foreignConnection]=await db.select({id:adPlatformConnections.id,workspaceId:adPlatformConnections.workspaceId}).from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);if(foreignConnection&&foreignConnection.workspaceId!==ctx.workspaceId)return NextResponse.json({error:"This ad account is already linked outside this workspace."},{status:409});const [row]=await db.insert(adPlatformConnections).values({workspaceId:ctx.workspaceId,clientId:body.clientId,platform,adAccountId,'
  ],
  [
    '.from(adPlatformConnections).where(eq(adPlatformConnections.id,campaign.connectionId)).limit(1)',
    '.from(adPlatformConnections).where(and(eq(adPlatformConnections.id,campaign.connectionId),eq(adPlatformConnections.workspaceId,ctx.workspaceId))).limit(1)'
  ],
  [
    '.from(adPlatformConnections).where(and(eq(adPlatformConnections.clientId,campaign.clientId),eq(adPlatformConnections.platform,campaign.platform))).limit(1)',
    '.from(adPlatformConnections).where(and(eq(adPlatformConnections.workspaceId,ctx.workspaceId),eq(adPlatformConnections.clientId,campaign.clientId),eq(adPlatformConnections.platform,campaign.platform))).limit(1)'
  ],
  [
    '.where(eq(adCampaigns.id,campaign.id));if(connection)await db.update(adPlatformConnections).set({lastSyncAt:new Date(),syncError:null,status:"CONNECTED"}).where(eq(adPlatformConnections.id,connection.id));',
    '.where(and(eq(adCampaigns.id,campaign.id),eq(adCampaigns.workspaceId,ctx.workspaceId)));if(connection)await db.update(adPlatformConnections).set({lastSyncAt:new Date(),syncError:null,status:"CONNECTED"}).where(and(eq(adPlatformConnections.id,connection.id),eq(adPlatformConnections.workspaceId,ctx.workspaceId)));'
  ]
];
let changed=0;
for(const [from,to] of replacements){
  if(s.includes(to))continue;
  if(!s.includes(from))throw new Error(`Missing media-control hardening anchor: ${from.slice(0,140)}`);
  s=s.replaceAll(from,to);changed++;
}
if(changed){fs.writeFileSync(file,s);console.log(`Applied ${changed} media-control tenant/atomicity hardening replacements.`)}else console.log("Media-control tenant/atomicity hardening already applied.");