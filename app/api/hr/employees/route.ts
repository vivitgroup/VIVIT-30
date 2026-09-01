export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {auth} from "@/lib/auth";
import {db,sql,auditLogs} from "@/lib/db";
import {PERMISSION_GROUPS} from "@/lib/permissions";
import {hasEffectiveRole} from "@/lib/session-access";

const EMPLOYEE_ROLES=new Set(["HR","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES"]);
const KNOWN_PERMISSIONS=new Set(PERMISSION_GROUPS.flatMap(group=>group.permissions.map(permission=>String(permission.key))));
const clean=(value:unknown,max=254)=>String(value??"").trim().slice(0,max);
const asRows=(value:unknown)=>Array.from(value as Iterable<Record<string,unknown>>);

export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=clean(session.user.workspaceId,160),actorId=clean(session.user.id,100);
 if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
 if(!hasEffectiveRole(session.user,["SUPER_ADMIN","HR"]))return NextResponse.json({error:"Only HR or Super Admin can add employees."},{status:403});
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body)return NextResponse.json({error:"Invalid request"},{status:400});
 const name=clean(body.name,160),email=clean(body.email,254).toLowerCase(),phone=clean(body.phone,60)||null,password=String(body.password??""),salary=Number(body.salary??0);
 const roles=Array.isArray(body.roles)?[...new Set(body.roles.map(role=>clean(role,40)).filter(role=>EMPLOYEE_ROLES.has(role)))]:[];
 const permissions=Array.isArray(body.permissions)?[...new Set(body.permissions.map(permission=>clean(permission,80)).filter(permission=>KNOWN_PERMISSIONS.has(permission)))]:[];
 if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Employee name and a valid email are required."},{status:400});
 if(password.length<10)return NextResponse.json({error:"Temporary password must be at least 10 characters."},{status:400});
 if(!roles.length)return NextResponse.json({error:"Choose at least one employee role."},{status:400});
 if(!Number.isFinite(salary)||salary<0)return NextResponse.json({error:"Salary must be zero or more."},{status:400});
 const existing=asRows(await db.execute(sql`select id from users where lower(email)=lower(${email}) limit 1`));
 if(existing.length)return NextResponse.json({error:"An account with this email already exists."},{status:409});
 const passwordHash=await bcrypt.hash(password,12),userId=crypto.randomUUID(),primaryRole=roles[0],now=new Date(),month=now.getMonth()+1,year=now.getFullYear();
 try{
  await db.transaction(async tx=>{
   await tx.execute(sql`insert into users(id,workspace_id,name,email,password,role,phone,is_active,approval_status,approved_by,approved_at,created_by,created_at,updated_at) values(${userId},${workspaceId},${name},${email},${passwordHash},${primaryRole}::role,${phone},true,'APPROVED',${actorId},now(),${actorId},now(),now())`);
   for(const role of roles)await tx.execute(sql`insert into user_role_assignments(workspace_id,user_id,role,created_by) values(${workspaceId},${userId},${role},${actorId}) on conflict(workspace_id,user_id,role) do nothing`);
   for(const permission of permissions)await tx.execute(sql`insert into user_permission_grants(workspace_id,user_id,permission,created_by) values(${workspaceId},${userId},${permission},${actorId}) on conflict(workspace_id,user_id,permission) do nothing`);
   await tx.execute(sql`insert into payroll(id,user_id,workspace_id,month,year,base_salary,bonus,deductions,net_pay,status,created_at,updated_at) values(${crypto.randomUUID()},${userId},${workspaceId},${month},${year},${salary},0,0,${salary},'DRAFT',now(),now()) on conflict do nothing`);
  });
 }catch(error){console.error("HR employee creation failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Employee could not be created."},{status:500})}
 await db.insert(auditLogs).values({workspaceId,userId:actorId,action:"employee_created",entity:"users",entityId:userId,newValues:JSON.stringify({name,email,roles,permissions,salary})});
 return NextResponse.json({success:true,userId,primaryRole,roles,permissions},{status:201,headers:{"Cache-Control":"private, no-store"}});
}
