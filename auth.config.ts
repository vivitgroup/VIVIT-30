import type {NextAuthConfig} from "next-auth";

type LiveState={role?:string;is_active?:boolean;passwordChangedAt?:string|null};
async function liveUserState(userId:string):Promise<LiveState|null>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return null;
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 try{
  const [userRes,auditRes]=await Promise.all([
   fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=role,is_active&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)}),
   fetch(`${url}/rest/v1/audit_logs?user_id=eq.${encodeURIComponent(userId)}&action=eq.password_changed&select=created_at&order=created_at.desc&limit=1`,{headers,cache:"no-store",signal:AbortSignal.timeout(3000)})
  ]);
  if(!userRes.ok||!auditRes.ok)return null;
  const [users,audits]=await Promise.all([userRes.json(),auditRes.json()]);
  const live=users?.[0];if(!live)return null;
  return {...live,passwordChangedAt:audits?.[0]?.created_at??null};
 }catch{return null}
}
const authConfig={
 trustHost:true,
 session:{strategy:"jwt"},
 pages:{signIn:"/login"},
 providers:[],
 callbacks:{
  async jwt({token,user}){
   if(user){token.role=(user as {role?:string}).role;token.authValid=true}
   if(token.sub){
    const live=await liveUserState(token.sub),issuedAtMs=Number(token.iat||0)*1000,passwordChangedMs=live?.passwordChangedAt?new Date(live.passwordChangedAt).getTime():0;
    token.authValid=Boolean(live?.is_active)&&(!passwordChangedMs||passwordChangedMs<=issuedAtMs);
    if(live?.role)token.role=live.role;
   }else token.authValid=false;
   return token;
  },
  session({session,token}){
   if(session.user){session.user.id=token.sub!;(session.user as any).role=token.role;(session.user as any).authValid=token.authValid===true}
   return session;
  },
 },
} satisfies NextAuthConfig;
export default authConfig;
