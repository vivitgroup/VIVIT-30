// ═══════════════════════════════════════════════════════════════
// Authentication security
// - Parameterized user lookup
// - Live JWT/session invalidation is handled by auth.config.ts
// - Database-backed credential-attempt throttling works across serverless instances
// - Unknown/ineligible accounts still execute bcrypt comparison to reduce account-timing leaks
// - Vivit Group handoff uses a dedicated <=60s signed assertion and single-use nonce
// ═══════════════════════════════════════════════════════════════
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "@/auth.config";
import {Role} from "@/lib/types";
import {consumeAuthRateLimit} from "@/lib/auth-abuse";
import {authorizeGroupHandoff} from "@/lib/group-handoff";

type AuthUserRow={id:string;name:string;email:string;password:string;role:string;workspace_id:string;is_active:boolean;approval_status:string};
const isRole=(value:string):value is Role=>Object.values(Role).some(role=>role===value);
const dummyPasswordHash=bcrypt.hash("VIVIT_AUTH_TIMING_SENTINEL_DO_NOT_USE",12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials,request) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const normalizedEmail=String(credentials.email).trim().toLowerCase();
          const allowed=await consumeAuthRateLimit({action:"security_login_attempt",headers:request.headers,email:normalizedEmail,windowMs:15*60_000,maxPerIp:30,maxPerEmail:10});
          if(!allowed)return null;
          const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
          if(!url||!key)return null;
          const res = await fetch(`${url}/rest/v1/users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,name,email,password,role,workspace_id,is_active,approval_status&limit=1`, {
            headers: {"apikey":key,"Authorization":`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(5000)
          });
          if(!res.ok)return null;
          const users = await res.json() as AuthUserRow[];
          const user = users[0];
          const passwordHash=user?.password??await dummyPasswordHash;
          const ok = await bcrypt.compare(String(credentials.password),passwordHash);
          if (!user || !ok || !user.is_active || user.approval_status!=="APPROVED" || !user.workspace_id || !isRole(user.role)) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId:user.workspace_id };
        } catch (error) {
          console.error("AUTH ERROR:", error instanceof Error?error.name:"auth_failure");
          return null;
        }
      },
    }),
    Credentials({
      id:"group-handoff",
      name:"Vivit Group Handoff",
      credentials:{assertion:{label:"Assertion",type:"text"}},
      async authorize(credentials){
        try{
          if(typeof credentials?.assertion!=="string"||!credentials.assertion)return null;
          return await authorizeGroupHandoff(credentials.assertion);
        }catch(error){
          console.error("GROUP HANDOFF AUTH ERROR:",error instanceof Error?error.message:"handoff_failure");
          return null;
        }
      },
    }),
  ],
});
