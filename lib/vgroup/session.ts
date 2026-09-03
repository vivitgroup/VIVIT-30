import {createHash} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {getVGroupSql} from "@/lib/vgroup/db";
import type {BusinessUnitCode, GroupMembershipClaim, GroupRoleCode, GroupSessionClaims, PermissionKey} from "@/lib/vgroup/contracts";

const ACCESS_COOKIE="vgroup_access_token";
const REFRESH_COOKIE="vgroup_refresh_token";

export type VGroupSession = GroupSessionClaims & {
  email: string;
  fullName: string;
};

type SupabaseUser={id:string;email?:string};
type GroupUserRow={id:string;email:string;full_name:string;status:string};
type MembershipRow={business_unit:BusinessUnitCode;role:GroupRoleCode;permissions:string[]|null};
type OverrideRow={business_unit:BusinessUnitCode;permission:string;effect:"allow"|"deny"};

function requirePublicAuthConfig(){
  const url=process.env.VGROUP_SUPABASE_URL;
  const key=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Vivit Group auth runtime is not configured");
  return {url,key};
}

export function hashRateLimitKey(value:string){return createHash("sha256").update(value).digest("hex")}

async function fetchSupabaseUser(accessToken:string):Promise<SupabaseUser|null>{
  const {url,key}=requirePublicAuthConfig();
  const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${accessToken}`},cache:"no-store",signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  return await response.json() as SupabaseUser;
}

export async function getVGroupSession():Promise<VGroupSession|null>{
  const sql=getVGroupSql();
  const jar=await cookies();
  const accessToken=jar.get(ACCESS_COOKIE)?.value;
  let user:GroupUserRow|undefined;
  let bridgedFromMarketing=false;

  if(accessToken){
    const authUser=await fetchSupabaseUser(accessToken);
    if(authUser?.id){
      [user]=await sql<GroupUserRow[]>`
        select id::text,email,full_name,status from vgroup.users
        where external_auth_id=${authUser.id} and status='active' limit 1
      `;
    }
  }

  // Reuse an already-authenticated Marketing SUPER_ADMIN identity only when
  // the same active identity exists in Group. Group RBAC remains authoritative.
  if(!user){
    const marketingSession=await auth();
    const marketingUser=marketingSession?.user as {email?:string|null;role?:string}|undefined;
    const email=String(marketingUser?.email||"").trim().toLowerCase();
    if(marketingUser?.role!=="SUPER_ADMIN"||!email)return null;
    [user]=await sql<GroupUserRow[]>`
      select id::text,email,full_name,status from vgroup.users
      where lower(email)=lower(${email}) and status='active' limit 1
    `;
    if(!user)return null;
    bridgedFromMarketing=true;
  }

  const memberships=await sql<MembershipRow[]>`
    select bu.code as business_unit,
           r.code as role,
           coalesce(array_agg(distinct (p.module || ':' || p.action)) filter (where p.id is not null), '{}') as permissions
    from vgroup.user_business_unit_roles ubr
    join vgroup.business_units bu on bu.id=ubr.business_unit_id and bu.status='active'
    join vgroup.roles r on r.id=ubr.role_id
    left join vgroup.role_permissions rp on rp.role_id=r.id
    left join vgroup.permissions p on p.id=rp.permission_id
    where ubr.user_id=${user.id}::uuid and ubr.status='active'
    group by bu.code,r.code
  `;
  const overrides=await sql<OverrideRow[]>`
    select bu.code as business_unit,(p.module || ':' || p.action) as permission,ep.effect
    from vgroup.employees e
    join vgroup.business_units bu on bu.id=e.business_unit_id
    join vgroup.employee_permissions ep on ep.employee_id=e.id
    join vgroup.permissions p on p.id=ep.permission_id
    where e.user_id=${user.id}::uuid and e.status='active'
  `;

  const claims:GroupMembershipClaim[]=memberships.map(row=>{
    const set=new Set((row.permissions??[]) as PermissionKey[]);
    for(const override of overrides.filter(item=>item.business_unit===row.business_unit)){
      const permission=override.permission as PermissionKey;
      if(override.effect==='allow')set.add(permission);else set.delete(permission);
    }
    return {businessUnit:row.business_unit,role:row.role,permissions:Array.from(set)};
  });

  if(bridgedFromMarketing&&!claims.some(claim=>String(claim.role)==="GROUP_SUPER_ADMIN"))return null;

  return {userId:user.id,email:user.email,fullName:user.full_name,memberships:claims};
}

export async function requireVGroupSession():Promise<VGroupSession>{
  const session=await getVGroupSession();
  if(!session)redirect('/group/login');
  return session;
}

export const VGROUP_ACCESS_COOKIE=ACCESS_COOKIE;
export const VGROUP_REFRESH_COOKIE=REFRESH_COOKIE;
