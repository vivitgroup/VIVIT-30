import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      workspaceId?: string;
      authValid?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    workspaceId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    workspaceId?: string;
    authValid?: boolean;
  }
}
