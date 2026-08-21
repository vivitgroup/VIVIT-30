import type { NextAuthConfig } from "next-auth";

const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
