import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      workspaceId?: string;
      authValid?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    workspaceId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    workspaceId?: string;
    authValid?: boolean;
  }
}
