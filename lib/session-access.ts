import type {Permission} from "@/lib/permissions";
import {hasPermissionAcrossRoles} from "@/lib/permissions";

type AccessUser={role?:string|null;roles?:string[]|null;permissions?:Permission[]|null};
export function effectiveRoles(user:AccessUser|undefined|null):string[]{return [...new Set([String(user?.role||""),...(user?.roles||[]).map(String)].filter(Boolean))]}
export function hasEffectiveRole(user:AccessUser|undefined|null,allowed:string[]):boolean{const roles=effectiveRoles(user);return allowed.some(role=>roles.includes(role))}
export function hasEffectivePermission(user:AccessUser|undefined|null,permission:Permission):boolean{return hasPermissionAcrossRoles(effectiveRoles(user),permission,user?.permissions||[])}
