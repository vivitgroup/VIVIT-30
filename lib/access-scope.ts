import {Role} from "@/lib/types";

/** Business-level mutation boundaries. Route ownership checks still apply. */
export const ROLE_SCOPE = {
  SUPER_ADMIN:{clients:"all",tasks:"all",media:"all",finance:"all",delete:"draft-only"},
  ACCOUNT_MANAGER:{clients:"assigned",tasks:"assigned-clients",media:"read-and-approve",finance:"none",delete:"none"},
  MEDIA_BUYER:{clients:"assigned-read",tasks:"none",media:"assigned-clients",finance:"none",delete:"none"},
  CREATOR:{clients:"task-context",tasks:"assigned",media:"none",finance:"none",delete:"none"},
  ACCOUNTANT:{clients:"commercial-create-read",tasks:"none",media:"none",finance:"drafts-and-collection",delete:"none"},
  HR:{clients:"none",tasks:"none",media:"none",finance:"payroll-only",team:"manage",delete:"owned-hr-drafts"},
  SALES:{clients:"prospects",tasks:"none",media:"none",finance:"none",delete:"archive-leads"},
  CLIENT:{clients:"own-portal",tasks:"review-only",media:"own-summary",finance:"own-invoices",delete:"none"},
} as const satisfies Record<Role,Record<string,string>>;

export function canEditCreative(role:string,status:string,assigned=false){
  if(role===Role.SUPER_ADMIN)return true;
  if(role===Role.CREATOR)return assigned&&["PENDING","IN_PROGRESS","REVIEW","REVISION"].includes(status);
  if(role===Role.ACCOUNT_MANAGER)return ["PENDING","IN_PROGRESS","REVIEW","REVISION"].includes(status);
  return false;
}

export function canMutateMedia(role:string){
  return role===Role.SUPER_ADMIN||role===Role.MEDIA_BUYER;
}

export function canApproveMediaPlan(role:string){
  return role===Role.SUPER_ADMIN||role===Role.ACCOUNT_MANAGER;
}

export function canEditInvoice(role:string,status:string){
  if(role===Role.SUPER_ADMIN)return true;
  return role===Role.ACCOUNTANT&&["DRAFT","SENT","OVERDUE"].includes(status);
}

export function canDeletePermanently(role:string,status:string){
  return role===Role.SUPER_ADMIN&&status==="DRAFT";
}
