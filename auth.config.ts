import type {NextAuthConfig} from "next-auth";

async function liveUserState(userId:string){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return null;
 try{const res=await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=role,is_active&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(3000)});if(!res.ok)return null;const rows=await res.json();return rows?.[0]??null}catch{return null}
}
const authConfig={
 trustHost:true,
 session:{strategy:"jwt"},
 pages:{signIn:"/login"},
 providers:[],
 callbacks:{
  async jwt({token,user}){
   if(user){token.role=(user as {role?:string}).role;token.authValid=true}
   if(token.sub){const live=await liveUserState(token.sub);token.authValid=Boolean(live?.is_active);if(live?.role)token.role=live.role}
   else token.authValid=false;
   return token;
  },
  session({session,token}){
   if(session.user){session.user.id=token.sub!;(session.user as any).role=token.role;(session.user as any).authValid=token.authValid===true}
   return session;
  },
 },
} satisfies NextAuthConfig;
export default authConfig;
