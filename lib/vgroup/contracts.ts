export const BUSINESS_UNITS = ["marketing", "hospitality", "tech"] as const;
export type BusinessUnitCode = (typeof BUSINESS_UNITS)[number];

export const GROUP_ROLES = [
  "GROUP_SUPER_ADMIN",
  "HOSPITALITY_ADMIN",
  "PROPERTY_MANAGER",
  "HOSPITALITY_FINANCE",
  "OWNER",
  "TECH_ADMIN",
  "PROJECT_MANAGER",
  "DESIGNER_DEVELOPER",
  "TECH_FINANCE",
  "TECH_CLIENT",
] as const;
export type GroupRoleCode = (typeof GROUP_ROLES)[number];

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionKey = `${string}:${PermissionAction}`;

export interface GroupMembershipClaim {
  businessUnit: BusinessUnitCode;
  role: GroupRoleCode;
  permissions: PermissionKey[];
}

export interface GroupSessionClaims {
  userId: string;
  memberships: GroupMembershipClaim[];
  activeBusinessUnit?: BusinessUnitCode;
}

export function isBusinessUnitCode(value: string): value is BusinessUnitCode {
  return (BUSINESS_UNITS as readonly string[]).includes(value);
}

export function canAccessBusinessUnit(
  claims: Pick<GroupSessionClaims, "memberships">,
  businessUnit: BusinessUnitCode,
): boolean {
  return claims.memberships.some(
    (membership) =>
      membership.businessUnit === businessUnit ||
      membership.role === "GROUP_SUPER_ADMIN",
  );
}

export function hasPermission(
  claims: Pick<GroupSessionClaims, "memberships">,
  businessUnit: BusinessUnitCode,
  permission: PermissionKey,
): boolean {
  return claims.memberships.some((membership) => {
    if (membership.role === "GROUP_SUPER_ADMIN") return true;
    if (membership.businessUnit !== businessUnit) return false;
    return membership.permissions.includes(permission);
  });
}
