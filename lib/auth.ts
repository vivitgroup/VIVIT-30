// Authentication boundary: credentials are normalized and bounded before
// reaching the identity store; live authorization is revalidated in
// auth.config.ts on every authenticated request.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "@/auth.config";
import {Role} from "@/lib/types";

type AuthUserRow={id:string;name:string;email:string;password:string;role:string;workspace_id:string;is_active:boolean;approval_status:string};
const isRole=(value:string):value is Role=>Object.values(Role).some(role=>role===value);
const validEmail=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email=String(credentials?.email??"").trim().toLowerCase();
          const password=String(credentials?.password??"");
          if(!validEmail(email)||password.length<1||password.length>128)return null;
          const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
          if(!url||!key)return null;
          const res = await fetch(`${url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,name,email,password,role,workspace_id,is_active,approval_status&limit=1`, {
            headers: {"apikey":key,"Authorization":`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(5000)
          });
          if(!res.ok)return null;
          const users = await res.json() as AuthUserRow[];
          const user = users[0];
          if (!user || !user.is_active || user.approval_status!=="APPROVED" || !user.workspace_id || !isRole(user.role)) return null;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId:user.workspace_id };
        } catch (error) {
          console.error("AUTH ERROR:", error instanceof Error?error.name:"auth_failure");
          return null;
        }
      },
    }),
  ],
});
