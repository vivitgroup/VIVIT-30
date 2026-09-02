// Matches prisma schema - use this when @prisma/client isn't generated yet
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  HR = "HR",
  ACCOUNTANT = "ACCOUNTANT",
  ACCOUNT_MANAGER = "ACCOUNT_MANAGER",
  MEDIA_BUYER = "MEDIA_BUYER",
  CREATOR = "CREATOR",
  SALES = "SALES",
  CLIENT = "CLIENT",
}

export enum LeadStage {
  NEW_LEAD = "NEW_LEAD",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  PROPOSAL_SENT = "PROPOSAL_SENT",
  NEGOTIATION = "NEGOTIATION",
  WON = "WON",
  LOST = "LOST",
}

export enum CreativeType {
  GRAPHIC = "GRAPHIC",
  CAROUSEL = "CAROUSEL",
  MOTION_GRAPHIC = "MOTION_GRAPHIC",
  VIDEO_EDIT = "VIDEO_EDIT",
  PHOTO_SESSION = "PHOTO_SESSION",
  REEL = "REEL",
  STORY = "STORY",
  UGC = "UGC",
}

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REVISION = "REVISION",
  COMPLETED = "COMPLETED",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}
