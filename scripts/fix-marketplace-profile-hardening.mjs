import fs from "node:fs";
const file="app/dashboard/marketplace/page.tsx";
let s=fs.readFileSync(file,"utf8");
const repls=[
 ['import { db, users, creatorProfiles, creativeTasks, clients } from "@/lib/db";','import { db, users, creatorProfiles, creativeTasks, clients, auditLogs } from "@/lib/db";'],
 ['  const { db, creatorProfiles } = await import("@/lib/db");','  const { db, creatorProfiles, users, auditLogs } = await import("@/lib/db");'],
 ['  const { eq } = await import("drizzle-orm");','  const { eq, and } = await import("drizzle-orm");'],
 ['  const existing = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, session.user.id!));','  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");\n  if(!workspaceId||!userId)throw new Error("Workspace unavailable");\n  const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,userId),eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);\n  if(!creator)throw new Error("Creator account is not active in this workspace");\n  const existing = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId,userId));'],
 ['    userId: session.user.id!, bio: fd.get("bio") as string,','    userId, bio: String(fd.get("bio")||"").trim().slice(0,1000),'],
 ['    portfolioUrl: fd.get("portfolio") as string || null,','    portfolioUrl: String(fd.get("portfolio")||"").trim().slice(0,1000) || null,'],
 ['    specialties: fd.get("specialties") as string,','    specialties: String(fd.get("specialties")||"").trim().slice(0,500),'],
 ['  if (existing.length > 0) await db.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId, session.user.id!));\n  else await db.insert(creatorProfiles).values(data);','  await db.transaction(async tx=>{\n    if (existing.length > 0) await tx.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId,userId));\n    else await tx.insert(creatorProfiles).values(data);\n    await tx.insert(auditLogs).values({workspaceId,userId,action:"creator_profile_saved",entity:"creator_profiles",entityId:existing[0]?.id||userId,newValues:JSON.stringify({isAvailable:data.isAvailable,ratePerTask:data.ratePerTask,hasPortfolio:Boolean(data.portfolioUrl)})});\n  });'],
 ['  const myProfile = role === Role.CREATOR ? await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, session.user.id!)).then(r=>r[0]) : null;','  const myProfile = role === Role.CREATOR ? await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId,userId)).then(r=>r[0]) : null;']
];
let changed=0;
for(const [from,to] of repls){if(s.includes(to))continue;if(!s.includes(from))throw new Error(`Missing marketplace hardening anchor: ${from.slice(0,120)}`);s=s.replace(from,to);changed++;}
if(changed){fs.writeFileSync(file,s);console.log(`Applied ${changed} marketplace profile hardening replacements.`)}else console.log("Marketplace profile hardening already applied.");