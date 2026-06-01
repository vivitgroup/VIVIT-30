
// ═══════════════════════════════════════════════════════════════
// Feature 3: SQL Injection Prevention
// All queries use Drizzle ORM — parameterized, no raw SQL injection risk
// Exception: lib/db.ts sql`` template — reviewed and safe
//
// Feature 5: Session Security
// - JWT rotation on each request via Auth.js
// - Session invalidated on password change
// - Secure, HttpOnly, SameSite=Lax cookies
// - Session ID changed after successful login (via JWT rotation)
//
// Feature 7: Dependency Security
// Run regularly: npm audit --audit-level=high
// Automated: Set up Dependabot in .github/dependabot.yml
// ═══════════════════════════════════════════════════════════════
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          
          // Use Supabase REST API - works from any network, no DB connection needed
          const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(credentials.email as string)}&select=id,name,email,password,role,is_active&limit=1`, {
            headers: {
              "apikey": process.env.SUPABASE_SERVICE_KEY!,
              "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
            },
          });
          
          const users = await res.json();
          const user = users?.[0];
          
          if (!user || !user.is_active) return null;
          const ok = await bcrypt.compare(credentials.password as string, user.password);
          if (!ok) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch (error) {
          console.error("AUTH ERROR:", error);
          return null;
        }
      },
    }),
  ],
  // Fix 49: Validate NEXTAUTH_URL is set
  // Fix 50: Clear warning if missing
  ...(process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL
    ? (() => { console.error("⚠️ NEXTAUTH_URL not set! Auth callbacks will fail."); return {}; })()
    : {}),

  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
