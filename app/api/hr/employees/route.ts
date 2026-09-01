export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import bcrypt from "bcryptjs";

type Row=Record<string,unknown>;
const rows=(v:unknown)=>Array.from(v as Iterable<Row>);
const clean=(v:unknown,n=200)=>String(v??"").trim().slice(0,n);
const PRIMARY_ROLES=new Set(["ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES"]);
async function canProvision(userId:string,workspaceId:string,primaryRole:string){if(primaryRole==="SUPER_ADMIN")return true;const grants=rows(await db.execute(sql`select wr.name,wr.permissions from user_roles ur join workspace_roles wr on wr.id=ur.role_id and wr.workspace_id=ur.workspace_id where ur.user_id=${userId} and ur.workspace_id=${workspaceId}`));return grants.some(r=>String(r.name||"").toUpperCase()==="HR"||String(r.permissions||"").includes("hr.employee.create"));}

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=clean(session.user.workspaceId,160),actorId=clean(session.user.id,160),actorRole=clean(session.user.role,60);if(!workspaceId||!actorId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
 if(!(await canProvision(actorId,workspaceId,actorRole)))return NextResponse.json({error:"HR employee provisioning permission is required."},{status:403});
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const name=clean(body.name,160),email=clean(body.email,254).toLowerCase(),phone=clean(body.phone,60),password=String(body.initialPassword||""),primaryRole=clean(body.primaryRole,60),salary=Number(body.salary),roleIds=Array.isArray(body.roleIds)?[...new Set(body.roleIds.map(x=>clean(x,160)).filter(Boolean))].slice(0,12):[];
 if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Valid employee name and email are required."},{status:400});
 if(!PRIMARY_ROLES.has(primaryRole))return NextResponse.json({error:"Choose a valid primary role."},{status:400});
 if(!Number.isFinite(salary)||salary<0||salary>100000000)return NextResponse.json({error:"Enter a valid starting salary."},{status:400});
 if(password.length<12)return NextResponse.json({error:"Initial password must be at least 12 characters."},{status:400});
 const existing=rows(await db.execute(sql`select id from users where lower(email)=lower(${email}) limit 1`))[0];if(existing)return NextResponse.json({error:"An account with this email already exists."},{status:409});
 if(roleIds.length){const valid=rows(await db.execute(sql`select id from workspace_roles where workspace_id=${workspaceId} and id in (${sql.join(roleIds.map(id=>sql`${id}`),sql`,`)})`));if(valid.length!==roleIds.length)return NextResponse.json({error:"One or more selected roles are outside this workspace."},{status:400});}
 const hash=await bcrypt.hash(password,12),now=new Date(),month=now.getMonth()+1,year=now.getFullYear(),newId=crypto.randomUUID();
 await db.transaction(async tx=>{
  await tx.execute(sql`insert into users(id,workspace_id,name,email,password,role,phone,is_active,approval_status,approved_by,approved_at,created_at,updated_at) values(${newId},${workspaceId},${name},${email},${hash},${primaryRole},${phone||null},true,'APPROVED',${actorId},now(),now(),now())`);
  await tx.execute(sql`insert into workspace_members(id,workspace_id,user_id,status,joined_at,invited_by) values(${crypto.randomUUID()},${workspaceId},${newId},'ACTIVE',now(),${actorId}) on conflict do nothing`);
  for(const roleId of roleIds)await tx.execute(sql`insert into user_roles(id,user_id,role_id,workspace_id,assigned_by,assigned_at) values(${crypto.randomUUID()},${newId},${roleId},${workspaceId},${actorId},now()) on conflict do nothing`);
  await tx.execute(sql`insert into payroll(id,user_id,workspace_id,month,year,base_salary,bonus,deductions,net_pay,status,created_at,updated_at) values(${crypto.randomUUID()},${newId},${workspaceId},${month},${year},${salary},0,0,${salary},'DRAFT',now(),now())`);
  await tx.execute(sql`insert into audit_logs(id,workspace_id,user_id,action,entity,entity_id,new_values,created_at) values(${crypto.randomUUID()},${workspaceId},${actorId},'employee_provisioned','users',${newId},${JSON.stringify({name,email,primaryRole,additionalRoleCount:roleIds.length,salaryConfigured:true})},now())`);
 });
 return NextResponse.json({success:true,userId:newId,primaryRole,additionalRoles:roleIds.length},{status:201,headers:{"Cache-Control":"private, no-store"}});
}
