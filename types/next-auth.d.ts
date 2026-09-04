import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/types";
import type { Permission } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      roles?: Role[];
      permissions?: Permission[];
      workspaceId?: string;
      authValid?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    roles?: Role[];
    permissions?: Permission[];
    workspaceId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    roles?: Role[];
    permissions?: Permission[];
    workspaceId?: string;
    authValid?: boolean;
  }
}
