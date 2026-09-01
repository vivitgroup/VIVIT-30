import { pgTable, text, boolean, timestamp, integer, real, numeric, pgEnum, unique, index } from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum          = pgEnum("role",           ["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","CLIENT"]);
export const taskStatusEnum    = pgEnum("task_status",    ["PENDING","IN_PROGRESS","REVIEW","APPROVED","REJECTED","REVISION","COMPLETED"]);
export const taskPriorityEnum  = pgEnum("task_priority",  ["LOW","MEDIUM","HIGH","URGENT"]);
export const creativeTypeEnum  = pgEnum("creative_type",  ["GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","REEL","STORY","UGC"]);
export const leadStageEnum     = pgEnum("lead_stage",     ["NEW_LEAD","CONTACTED","QUALIFIED","PROPOSAL_SENT","NEGOTIATION","WON","LOST"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT","SENT","PAID","OVERDUE","CANCELLED"]);
export const planEnum          = pgEnum("plan",           ["FREE","STARTER","PROFESSIONAL","ENTERPRISE"]);
export const webhookEventEnum  = pgEnum("webhook_event",  ["task.created","task.approved","task.rejected","client.created","invoice.paid","lead.won"]);

// ── SAAS: Workspaces (Multi-tenant) ────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:            text("name").notNull(),
  slug:            text("slug").notNull().unique(),           // e.g. "vivit-group"
  plan:            planEnum("plan").notNull().default("FREE"),
  // White label
  primaryColor:    text("primary_color").notNull().default("#0077B6"),
  logoUrl:         text("logo_url"),
  faviconUrl:      text("favicon_url"),
  customDomain:    text("custom_domain"),                     // e.g. crm.vivitgroup.com
  // Settings
  currency:        text("currency").notNull().default("USD"),
  agencyFeePercent:real("agency_fee_percent").notNull().default(20),
  timezone:        text("timezone").notNull().default("Africa/Cairo"),
  // Limits per plan
  maxClients:      integer("max_clients").notNull().default(5),
  maxUsers:        integer("max_users").notNull().default(3),
  // Integrations
  slackWebhookUrl: text("slack_webhook_url"),
  zapierHookUrl:   text("zapier_hook_url"),
  resendApiKey:    text("resend_api_key"),                    // email notifications
  anthropicApiKey: text("anthropic_api_key"),                 // AI features
  // Billing
  stripeCustomerId:text("stripe_customer_id"),
  billingEmail:    text("billing_email"),
  trialEndsAt:     timestamp("trial_ends_at"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  password:     text("password").notNull(),
  role:         roleEnum("role").notNull().default("CLIENT"),
  avatar:       text("avatar"),
  phone:        text("phone"),
  isActive:     boolean("is_active").notNull().default(true),
  approvalStatus: text("approval_status").notNull().default("APPROVED"),
  requestedRole:  roleEnum("requested_role"),
  approvalNote:   text("approval_note"),
  approvedBy:     text("approved_by"),
  approvedAt:     timestamp("approved_at"),
  rejectedAt:     timestamp("rejected_at"),
  lastLoginAt:  timestamp("last_login_at"),
  // SaaS
  isWorkspaceOwner: boolean("is_workspace_owner").notNull().default(false),
  apiKey:       text("api_key"),                              // personal API key
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text("user_id").notNull().references(()=>users.id, {onDelete:"cascade"}),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt:    timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:     text("email").notNull().unique(),
  codeHash:  text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts:  integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fileDocuments = pgTable("file_documents", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  uploadedBy:  text("uploaded_by").notNull(),
  clientId:    text("client_id"),
  taskId:      text("task_id"),
  name:        text("name").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  mimeType:    text("mime_type"),
  sizeBytes:   integer("size_bytes").notNull().default(0),
  category:    text("category").notNull().default("GENERAL"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Clients ────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:      text("workspace_id").notNull().default("default"),
  companyName:      text("company_name").notNull(),
  industry:         text("industry"),
  website:          text("website"),
  logo:             text("logo"),
  isActive:         boolean("is_active").notNull().default(true),
  healthScore:      real("health_score").notNull().default(100),
  performanceScore: real("performance_score").notNull().default(100), // NEW: composite 0-100
  churnRisk:        text("churn_risk").notNull().default("LOW"),
  churnProbability: real("churn_probability").notNull().default(0),   // NEW: 0-1 ML prediction
  monthlyRetainer:  real("monthly_retainer").notNull().default(0),
  mediaBudget:      real("media_budget").notNull().default(0),
  targetLeads:      integer("target_leads").notNull().default(0),
  contractValue:    real("contract_value").notNull().default(0),
  contractStart:    timestamp("contract_start"),
  contractEnd:      timestamp("contract_end"),
  metaAdsLink:      text("meta_ads_link"),
  tiktokAdsLink:    text("tiktok_ads_link"),
  snapchatAdsLink:  text("snapchat_ads_link"),
  googleAdsLink:    text("google_ads_link"),
  colorPalette:     text("color_palette"),
  internalNotes:    text("internal_notes"),
  currency:         text("currency").notNull().default("USD"),
  // NPS
  npsScore:         real("nps_score"),
  lifetimeValue:    real("lifetime_value").notNull().default(0),
  tasksCompleted:   integer("tasks_completed").notNull().default(0),
  tasksTotal:       integer("tasks_total").notNull().default(0),
  userId:           text("user_id").unique(),
  accountManagerId: text("account_manager_id"),
  mediaBuyerId:     text("media_buyer_id"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

// ── Contacts ───────────────────────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:  text("client_id").notNull(),
  name:      text("name").notNull(),
  title:     text("title"),
  email:     text("email"),
  phone:     text("phone"),
  whatsapp:  text("whatsapp"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Media Metrics ──────────────────────────────────────────────────────────
export const mediaMetrics = pgTable("media_metrics", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:     text("workspace_id").notNull().default("default"),
  clientId:        text("client_id").notNull(),
  platform:        text("platform").notNull(),
  date:            timestamp("date").notNull(),
  adSpend:         real("ad_spend").notNull().default(0),
  leads:           integer("leads").notNull().default(0),
  purchases:       integer("purchases").notNull().default(0),
  addToCart:       integer("add_to_cart").notNull().default(0),
  revenue:         real("revenue").notNull().default(0),
  impressions:     integer("impressions").notNull().default(0),
  clicks:          integer("clicks").notNull().default(0),
  roas:            real("roas").notNull().default(0),
  cpl:             real("cpl").notNull().default(0),
  cpa:             real("cpa").notNull().default(0),
  agencyFee:       real("agency_fee").notNull().default(0),
  totalDue:        real("total_due").notNull().default(0),
  remainingBudget: real("remaining_budget").notNull().default(0),
  prevMonthSpend:  real("prev_month_spend"),
  targetLeads:     integer("target_leads"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── Media Buying Control Center ───────────────────────────────
export const adPlatformConnections = pgTable("ad_platform_connections", {
  id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()), workspaceId:text("workspace_id").notNull().default("default"),
  clientId:text("client_id"), platform:text("platform").notNull(), adAccountId:text("ad_account_id").notNull(), accountName:text("account_name"),
  accessTokenEncrypted:text("access_token_encrypted"), refreshTokenEncrypted:text("refresh_token_encrypted"), tokenExpiresAt:timestamp("token_expires_at"),
  status:text("status").notNull().default("PENDING"), lastSyncAt:timestamp("last_sync_at"), syncError:text("sync_error"), createdBy:text("created_by").notNull(), createdAt:timestamp("created_at").notNull().defaultNow(), updatedAt:timestamp("updated_at").notNull().defaultNow(),
},t=>[unique("uq_platform_account").on(t.platform,t.adAccountId)]);

export const adCampaigns = pgTable("ad_campaigns", {
  id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()), workspaceId:text("workspace_id").notNull().default("default"),clientId:text("client_id").notNull(),connectionId:text("connection_id"),
  platform:text("platform").notNull(),externalId:text("external_id").notNull(),name:text("name").notNull(),objective:text("objective").notNull().default("LEADS"),status:text("status").notNull().default("UNKNOWN"),
  campaignUrl:text("campaign_url"),dailyBudget:real("daily_budget").notNull().default(0),lifetimeBudget:real("lifetime_budget").notNull().default(0),currency:text("currency").notNull().default("EGP"),
  targetResult:real("target_result").notNull().default(0),targetCpl:real("target_cpl").notNull().default(0),targetCpa:real("target_cpa").notNull().default(0),targetRoas:real("target_roas").notNull().default(0),
  startDate:timestamp("start_date"),endDate:timestamp("end_date"),lastSyncAt:timestamp("last_sync_at"),createdBy:text("created_by").notNull(),createdAt:timestamp("created_at").notNull().defaultNow(),updatedAt:timestamp("updated_at").notNull().defaultNow(),
},t=>[unique("uq_campaign_platform_external").on(t.platform,t.externalId),index("idx_campaign_client").on(t.clientId,t.status)]);

export const adSets = pgTable("ad_sets", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),campaignId:text("campaign_id").notNull(),externalId:text("external_id").notNull(),name:text("name").notNull(),status:text("status").notNull().default("UNKNOWN"),budget:real("budget").notNull().default(0),optimizationGoal:text("optimization_goal"),audience:text("audience"),placements:text("placements"),createdAt:timestamp("created_at").notNull().defaultNow(),updatedAt:timestamp("updated_at").notNull().defaultNow()},t=>[unique("uq_adset_external").on(t.campaignId,t.externalId)]);
export const ads = pgTable("ads", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),campaignId:text("campaign_id").notNull(),adSetId:text("ad_set_id"),externalId:text("external_id").notNull(),name:text("name").notNull(),status:text("status").notNull().default("UNKNOWN"),creativeTaskId:text("creative_task_id"),creativeUrl:text("creative_url"),headline:text("headline"),copy:text("copy"),createdAt:timestamp("created_at").notNull().defaultNow(),updatedAt:timestamp("updated_at").notNull().defaultNow()},t=>[unique("uq_ad_external").on(t.campaignId,t.externalId)]);

export const adPerformanceDaily = pgTable("ad_performance_daily", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),campaignId:text("campaign_id").notNull(),adSetId:text("ad_set_id"),adId:text("ad_id"),date:timestamp("date").notNull(),breakdownType:text("breakdown_type").notNull().default("TOTAL"),breakdownValue:text("breakdown_value").notNull().default("ALL"),spend:real("spend").notNull().default(0),impressions:integer("impressions").notNull().default(0),reach:integer("reach").notNull().default(0),clicks:integer("clicks").notNull().default(0),results:integer("results").notNull().default(0),qualifiedLeads:integer("qualified_leads").notNull().default(0),purchases:integer("purchases").notNull().default(0),revenue:real("revenue").notNull().default(0),frequency:real("frequency").notNull().default(0),ctr:real("ctr").notNull().default(0),cpc:real("cpc").notNull().default(0),cpm:real("cpm").notNull().default(0),cpl:real("cpl").notNull().default(0),cpa:real("cpa").notNull().default(0),roas:real("roas").notNull().default(0),createdAt:timestamp("created_at").notNull().defaultNow()},t=>[unique("uq_perf_daily_breakdown").on(t.campaignId,t.adId,t.date,t.breakdownType,t.breakdownValue),index("idx_perf_campaign_date").on(t.campaignId,t.date)]);

export const mediaActions = pgTable("media_actions", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),campaignId:text("campaign_id").notNull(),userId:text("user_id").notNull(),action:text("action").notNull(),oldValue:text("old_value"),newValue:text("new_value"),reason:text("reason"),resultAfter:text("result_after"),createdAt:timestamp("created_at").notNull().defaultNow(),reviewedAt:timestamp("reviewed_at")});
export const mediaPlans = pgTable("media_plans", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),workspaceId:text("workspace_id").notNull().default("default"),clientId:text("client_id").notNull(),name:text("name").notNull(),periodStart:timestamp("period_start").notNull(),periodEnd:timestamp("period_end").notNull(),totalBudget:real("total_budget").notNull().default(0),allocation:text("allocation").notNull().default("[]"),forecast:text("forecast").notNull().default("{}"),status:text("status").notNull().default("DRAFT"),submittedBy:text("submitted_by").notNull(),approvedBy:text("approved_by"),approvedAt:timestamp("approved_at"),clientNote:text("client_note"),createdAt:timestamp("created_at").notNull().defaultNow(),updatedAt:timestamp("updated_at").notNull().defaultNow()});
export const trackingHealth = pgTable("tracking_health", {id:text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),clientId:text("client_id").notNull(),platform:text("platform").notNull(),pixelStatus:text("pixel_status").notNull().default("UNKNOWN"),capiStatus:text("capi_status").notNull().default("UNKNOWN"),utmStatus:text("utm_status").notNull().default("UNKNOWN"),landingPageStatus:text("landing_page_status").notNull().default("UNKNOWN"),events:text("events").notNull().default("[]"),issues:text("issues").notNull().default("[]"),checkedAt:timestamp("checked_at").notNull().defaultNow()},t=>[unique("uq_tracking_client_platform").on(t.clientId,t.platform)]);

// ── Creative Tasks ─────────────────────────────────────────────────────────
export const creativeTasks = pgTable("creative_tasks", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:     text("workspace_id").notNull().default("default"),
  clientId:        text("client_id").notNull(),
  title:           text("title").notNull(),
  brief:           text("brief").notNull(),
  tov:             text("tov"),
  deadline:        timestamp("deadline").notNull(),
  priority:        taskPriorityEnum("priority").notNull().default("MEDIUM"),
  status:          taskStatusEnum("status").notNull().default("PENDING"),
  type:            creativeTypeEnum("type").notNull(),
  caption:         text("caption"),
  fileUrl:         text("file_url"),
  revisionNotes:   text("revision_notes"),
  revisionCount:   integer("revision_count").notNull().default(0),
  platform:        text("platform"),
  dimensions:      text("dimensions"),
  isPosted:        boolean("is_posted").notNull().default(false),
  postedAt:        timestamp("posted_at"),
  // E-signature
  approvedByClient:    boolean("approved_by_client").notNull().default(false),
  clientApprovalAt:    timestamp("client_approval_at"),
  clientApprovalIp:    text("client_approval_ip"),
  clientApprovalName:  text("client_approval_name"),
  createdById:     text("created_by_id").notNull(),
  assignedToId:    text("assigned_to_id"),
  completedAt:     timestamp("completed_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Sales Leads ────────────────────────────────────────────────────────────
export const salesLeads = pgTable("sales_leads", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:    text("workspace_id").notNull().default("default"),
  companyName:    text("company_name").notNull(),
  contactPerson:  text("contact_person").notNull(),
  phone:          text("phone"),
  email:          text("email"),
  source:         text("source").notNull().default("OTHER"),
  stage:          leadStageEnum("stage").notNull().default("NEW_LEAD"),
  estimatedValue: real("estimated_value").notNull().default(0),
  probability:    integer("probability").notNull().default(0),
  notes:          text("notes"),
  nextFollowUp:   timestamp("next_follow_up"),
  followUpCount:  integer("follow_up_count").notNull().default(0),
  lostReason:     text("lost_reason"),
  industry:       text("industry"),
  salesRepId:     text("sales_rep_id"),
  clientId:       text("client_id"),
  expectedClose:  timestamp("expected_close"),
  wonAt:          timestamp("won_at"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

// ── Sales Activities ───────────────────────────────────────────────────────
export const salesActivities = pgTable("sales_activities", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId:         text("lead_id").notNull(),
  userId:         text("user_id").notNull(),
  type:           text("type").notNull(),
  notes:          text("notes"),
  outcome:        text("outcome"),
  nextAction:     text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── Finance Records ────────────────────────────────────────────────────────
export const financeRecords = pgTable("finance_records", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:    text("workspace_id").notNull().default("default"),
  clientId:       text("client_id").notNull(),
  month:          integer("month").notNull(),
  year:           integer("year").notNull(),
  retainer:     numeric("retainer", { precision: 18, scale: 2 }).notNull().default("0"),
  mediaBuyingFee:     numeric("media_buying_fee", { precision: 18, scale: 2 }).notNull().default("0"),
  extraServices:     numeric("extra_services", { precision: 18, scale: 2 }).notNull().default("0"),
  totalRevenue:     numeric("total_revenue", { precision: 18, scale: 2 }).notNull().default("0"),
  paid:     numeric("paid", { precision: 18, scale: 2 }).notNull().default("0"),
  outstanding:     numeric("outstanding", { precision: 18, scale: 2 }).notNull().default("0"),
  invoiceNumber:  text("invoice_number"),
  invoiceStatus:  invoiceStatusEnum("invoice_status").default("DRAFT"),
  dueDate:        timestamp("due_date"),
  paidDate:       timestamp("paid_date"),
  paymentMethod:  text("payment_method"),
  notes:          text("notes"),
  // Revenue share
  commissionRate:     numeric("commission_rate", { precision: 9, scale: 4 }),                    // AM commission %
  commissionPaid:     numeric("commission_paid", { precision: 18, scale: 2 }).default("0"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
}, t=>[unique("uq_finance_records_workspace_client_period").on(t.workspaceId,t.clientId,t.year,t.month)]);

// ── Company Expenses ───────────────────────────────────────────────────────
export const companyExpenses = pgTable("company_expenses", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  category:    text("category").notNull(),
  description: text("description").notNull(),
  amount:     numeric("amount", { precision: 18, scale: 2 }).notNull(),
  date:        timestamp("date").notNull(),
  receipt:     text("receipt"),
  approvedBy:  text("approved_by"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Notifications ──────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text("user_id").notNull(),
  type:      text("type").notNull(),
  title:     text("title").notNull(),
  message:   text("message").notNull(),
  link:      text("link"),
  isRead:    boolean("is_read").notNull().default(false),
  priority:  text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Audit Logs ─────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  userId:      text("user_id").notNull(),
  action:      text("action").notNull(),
  entity:      text("entity").notNull(),
  entityId:    text("entity_id").notNull(),
  oldValues:   text("old_values"),
  newValues:   text("new_values"),
  ipAddress:   text("ip_address"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Calendar Events ────────────────────────────────────────────────────────
export const calendarEvents = pgTable("calendar_events", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  clientId:    text("client_id").notNull(),
  taskId:      text("task_id"),
  title:       text("title").notNull(),
  date:        timestamp("date").notNull(),
  platform:    text("platform"),
  caption:     text("caption"),
  hashtags:    text("hashtags"),
  status:      text("status").notNull().default("scheduled"),
  postedBy:    text("posted_by"),
  engagements: integer("engagements").default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Client Feedback (NPS) ─────────────────────────────────────────────────
export const clientFeedback = pgTable("client_feedback", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:  text("client_id").notNull(),
  score:     integer("score").notNull(),
  comment:   text("comment"),
  month:     integer("month").notNull(),
  year:      integer("year").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Task Comments ─────────────────────────────────────────────────────────
export const taskComments = pgTable("task_comments", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId:     text("task_id").notNull(),
  userId:     text("user_id").notNull(),
  comment:    text("comment").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── Budget Alerts ─────────────────────────────────────────────────────────
export const budgetAlerts = pgTable("budget_alerts", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:    text("client_id").notNull(),
  alertType:   text("alert_type").notNull(),
  threshold:   real("threshold").notNull(),
  triggered:   boolean("triggered").notNull().default(false),
  triggeredAt: timestamp("triggered_at"),
  month:       integer("month").notNull(),
  year:        integer("year").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Onboarding Progress ───────────────────────────────────────────────────
export const onboardingProgress = pgTable("onboarding_progress", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:    text("client_id").notNull(),
  stepId:      text("step_id").notNull(),
  completed:   boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Recurring Invoices ────────────────────────────────────────────────────
export const recurringInvoices = pgTable("recurring_invoices", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:      text("client_id").notNull(),
  retainer:      real("retainer").notNull().default(0),
  dayOfMonth:    integer("day_of_month").notNull().default(1),
  isActive:      boolean("is_active").notNull().default(true),
  lastGenerated: timestamp("last_generated"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ── Webhooks ──────────────────────────────────────────────────────────────
export const webhooks = pgTable("webhooks", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  url:         text("url").notNull(),
  events:      text("events").notNull(),              // JSON array of events
  secret:      text("secret").notNull(),              // HMAC secret
  isActive:    boolean("is_active").notNull().default(true),
  lastCalledAt: timestamp("last_called_at"),
  failCount:   integer("fail_count").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── API Keys ──────────────────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId:      text("user_id").notNull(),
  name:        text("name").notNull(),
  keyHash:     text("key_hash").notNull().unique(),   // hashed API key
  keyPrefix:   text("key_prefix").notNull(),          // first 8 chars for display
  permissions: text("permissions").notNull().default("read"), // read, write, admin
  lastUsedAt:  timestamp("last_used_at"),
  expiresAt:   timestamp("expires_at"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Creator Marketplace ───────────────────────────────────────────────────
export const creatorProfiles = pgTable("creator_profiles", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:       text("user_id").notNull().unique(),
  bio:          text("bio"),
  skills:       text("skills"),                        // JSON array
  portfolioUrl: text("portfolio_url"),
  ratePerTask:  real("rate_per_task").default(0),
  rating:       real("rating").default(5),
  totalJobs:    integer("total_jobs").default(0),
  isAvailable:  boolean("is_available").notNull().default(true),
  specialties:  text("specialties"),                   // REEL,GRAPHIC,UGC etc
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const taskBids = pgTable("task_bids", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId:      text("task_id").notNull(),
  creatorId:   text("creator_id").notNull(),
  amount:      real("amount").notNull(),
  proposal:    text("proposal").notNull(),
  deliveryDays:integer("delivery_days").notNull(),
  status:      text("status").notNull().default("PENDING"), // PENDING,ACCEPTED,REJECTED
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── AI Generations Log ────────────────────────────────────────────────────
export const aiGenerations = pgTable("ai_generations", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  userId:      text("user_id").notNull(),
  type:        text("type").notNull(),                 // brief, caption, budget_advice, churn_prediction
  prompt:      text("prompt").notNull(),
  result:      text("result").notNull(),
  tokensUsed:  integer("tokens_used").default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Email Logs ────────────────────────────────────────────────────────────
export const emailLogs = pgTable("email_logs", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  to:         text("to").notNull(),
  subject:    text("subject").notNull(),
  type:       text("type").notNull(),                  // welcome, invoice, report, reminder
  status:     text("status").notNull().default("sent"),
  resendId:   text("resend_id"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── Type exports ──────────────────────────────────────────────────────────
export type Workspace        = typeof workspaces.$inferSelect;
export type User             = typeof users.$inferSelect;
export type Client           = typeof clients.$inferSelect;
export type Contact          = typeof contacts.$inferSelect;
export type MediaMetric      = typeof mediaMetrics.$inferSelect;
export type CreativeTask     = typeof creativeTasks.$inferSelect;
export type SalesLead        = typeof salesLeads.$inferSelect;
export type SalesActivity    = typeof salesActivities.$inferSelect;
export type FinanceRecord    = typeof financeRecords.$inferSelect;
export type CompanyExpense   = typeof companyExpenses.$inferSelect;
export type Notification     = typeof notifications.$inferSelect;
export type AuditLog         = typeof auditLogs.$inferSelect;
export type CalendarEvent    = typeof calendarEvents.$inferSelect;
export type ClientFeedback   = typeof clientFeedback.$inferSelect;
export type TaskComment      = typeof taskComments.$inferSelect;
export type BudgetAlert      = typeof budgetAlerts.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type Webhook          = typeof webhooks.$inferSelect;
export type ApiKey           = typeof apiKeys.$inferSelect;
export type CreatorProfile   = typeof creatorProfiles.$inferSelect;
export type TaskBid          = typeof taskBids.$inferSelect;
export type AiGeneration     = typeof aiGenerations.$inferSelect;
export type EmailLog         = typeof emailLogs.$inferSelect;

// ── Approval Tokens (email-based approvals without login) ────
export const approvalTokens = pgTable("approval_tokens", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId:     text("task_id").notNull(),
  clientId:   text("client_id").notNull(),
  token:      text("token").notNull().unique(),
  action:     text("action").notNull(), // "approve" | "revision"
  expiresAt:  timestamp("expires_at").notNull(),
  usedAt:     timestamp("used_at"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── Referrals ─────────────────────────────────────────────────
export const referrals = pgTable("referrals", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId:   text("referrer_id").notNull(),   // workspace that referred
  referredEmail:text("referred_email").notNull(),
  code:         text("code").notNull().unique(),
  status:       text("status").notNull().default("PENDING"), // PENDING, SIGNED_UP, CONVERTED
  discountPct:  real("discount_pct").notNull().default(20),
  signedUpAt:   timestamp("signed_up_at"),
  convertedAt:  timestamp("converted_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── Contract Management ───────────────────────────────────────
export const contracts = pgTable("contracts", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId:     text("client_id").notNull(),
  title:        text("title").notNull(),
  type:         text("type").notNull().default("RETAINER"), // RETAINER, PROJECT, MEDIA_ONLY
  value:        real("value").notNull().default(0),
  startDate:    timestamp("start_date").notNull(),
  endDate:      timestamp("end_date").notNull(),
  autoRenew:    boolean("auto_renew").notNull().default(false),
  renewalDays:  integer("renewal_days").notNull().default(30), // alert X days before
  status:       text("status").notNull().default("ACTIVE"), // ACTIVE, EXPIRED, RENEWED, CANCELLED
  documentUrl:  text("document_url"),
  signedByClient:boolean("signed_by_client").notNull().default(false),
  signedAt:     timestamp("signed_at"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── SaaS Usage Analytics ──────────────────────────────────────
export const usageEvents = pgTable("usage_events", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId:      text("user_id"),
  event:       text("event").notNull(), // page_view, task_created, ai_used, export, login
  metadata:    text("metadata"),        // JSON string
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type ApprovalToken = typeof approvalTokens.$inferSelect;
export type Referral      = typeof referrals.$inferSelect;
export type Contract      = typeof contracts.$inferSelect;
export type UsageEvent    = typeof usageEvents.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// ERP PRODUCTION TABLES — v18
// ═══════════════════════════════════════════════════════════════

// ── Payroll ──────────────────────────────────────────────────
export const payroll = pgTable("payroll", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  userId:      text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull().default("default"),
  month:       integer("month").notNull(),
  year:        integer("year").notNull(),
  baseSalary:     numeric("base_salary", { precision: 18, scale: 2 }).notNull().default("0"),
  bonus:     numeric("bonus", { precision: 18, scale: 2 }).notNull().default("0"),
  deductions:     numeric("deductions", { precision: 18, scale: 2 }).notNull().default("0"),
  netPay:     numeric("net_pay", { precision: 18, scale: 2 }).notNull().default("0"),
  status:      text("status").notNull().default("DRAFT"), // DRAFT | APPROVED | PAID
  paidAt:      timestamp("paid_at"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
}, t=>[index("idx_payroll_user").on(t.userId), index("idx_payroll_month").on(t.month,t.year)]);

// ── Leave Requests ────────────────────────────────────────────
export const leaveRequests = pgTable("leave_requests", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  userId:      text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull().default("default"),
  type:        text("type").notNull(), // Annual | Sick | Emergency | Unpaid | WFH
  fromDate:    timestamp("from_date").notNull(),
  toDate:      timestamp("to_date").notNull(),
  days:        integer("days").notNull().default(1),
  status:      text("status").notNull().default("PENDING"), // PENDING | APPROVED | REJECTED
  reason:      text("reason"),
  approvedBy:  text("approved_by"),
  approvedAt:  timestamp("approved_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, t=>[index("idx_leave_user").on(t.userId)]);

// ── Assets ───────────────────────────────────────────────────
export const assets = pgTable("assets", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  name:         text("name").notNull(),
  category:     text("category").notNull(), // Hardware | Software | License | Equipment
  assignedToId: text("assigned_to_id"),
  serialNumber: text("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  value:        real("value").notNull().default(0),
  condition:    text("condition").notNull().default("Good"), // Excellent | Good | Fair | Poor
  renewalDate:  timestamp("renewal_date"),
  seats:        integer("seats"),         // for licenses
  seatsUsed:    integer("seats_used"),    // for licenses
  notes:        text("notes"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
}, t=>[index("idx_assets_category").on(t.category)]);

// ── Vendors ──────────────────────────────────────────────────
export const vendors = pgTable("vendors", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  name:         text("name").notNull(),
  category:     text("category").notNull(), // Technology | Creative | Production | Office | Other
  contactName:  text("contact_name"),
  email:        text("email"),
  phone:        text("phone"),
  paymentTerms: integer("payment_terms").notNull().default(30), // days
  taxId:        text("tax_id"),
  bankDetails:  text("bank_details"),
  isActive:     boolean("is_active").notNull().default(true),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Purchase Orders (Accounts Payable) ───────────────────────
export const purchaseOrders = pgTable("purchase_orders", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  vendorId:     text("vendor_id"),
  vendorName:   text("vendor_name").notNull(), // denormalized for display
  poNumber:     text("po_number").notNull(),
  description:  text("description").notNull(),
  category:     text("category").notNull(),
  amount:     numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  tax:     numeric("tax", { precision: 18, scale: 2 }).notNull().default("0"),
  total:     numeric("total", { precision: 18, scale: 2 }).notNull().default("0"),
  status:       text("status").notNull().default("PENDING"), // PENDING | APPROVED | PAID | OVERDUE | CANCELLED
  dueDate:      timestamp("due_date"),
  paidAt:       timestamp("paid_at"),
  approvedBy:   text("approved_by"),
  receiptUrl:   text("receipt_url"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
}, t=>[index("idx_po_status").on(t.status), index("idx_po_vendor").on(t.vendorId)]);

// ── Time Entries (Project Profitability) ─────────────────────
export const timeEntries = pgTable("time_entries", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  userId:      text("user_id").notNull(),
  taskId:      text("task_id"),
  clientId:    text("client_id"),
  date:        timestamp("date").notNull(),
  hours:       real("hours").notNull().default(0),
  ratePerHour: real("rate_per_hour").notNull().default(0),
  billable:    boolean("billable").notNull().default(true),
  description: text("description"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, t=>[index("idx_time_user").on(t.userId), index("idx_time_task").on(t.taskId)]);

// ── Expense Claims (Employee Expenses) ───────────────────────
export const expenseClaims = pgTable("expense_claims", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  userId:      text("user_id").notNull(),
  category:    text("category").notNull(),
  description: text("description").notNull(),
  amount:     numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  date:        timestamp("date").notNull(),
  receiptUrl:  text("receipt_url"),
  status:      text("status").notNull().default("PENDING"), // PENDING | APPROVED | PAID | REJECTED
  approvedBy:  text("approved_by"),
  approvedAt:  timestamp("approved_at"),
  paidAt:      timestamp("paid_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, t=>[index("idx_claims_user").on(t.userId), index("idx_claims_status").on(t.status)]);

// ── Project Budgets ──────────────────────────────────────────
export const projectBudgets = pgTable("project_budgets", {
  id:            text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:   text("workspace_id").notNull().default("default"),
  clientId:      text("client_id").notNull(),
  name:          text("name").notNull(),
  type:          text("type").notNull().default("RETAINER"), // RETAINER | PROJECT | CAMPAIGN
  totalBudget:     numeric("total_budget", { precision: 18, scale: 2 }).notNull().default("0"),
  spentBudget:     numeric("spent_budget", { precision: 18, scale: 2 }).notNull().default("0"),
  startDate:     timestamp("start_date").notNull(),
  endDate:       timestamp("end_date").notNull(),
  status:        text("status").notNull().default("ACTIVE"), // ACTIVE | COMPLETED | ON_HOLD
  notes:         text("notes"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, t=>[index("idx_budget_client").on(t.clientId)]);

// ── Types ────────────────────────────────────────────────────
export type Payroll       = typeof payroll.$inferSelect;
export type LeaveRequest  = typeof leaveRequests.$inferSelect;
export type Asset         = typeof assets.$inferSelect;
export type Vendor        = typeof vendors.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type TimeEntry     = typeof timeEntries.$inferSelect;
export type ExpenseClaim  = typeof expenseClaims.$inferSelect;
export type ProjectBudget = typeof projectBudgets.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// ERP v20 — 20 Features Production Tables
// ═══════════════════════════════════════════════════════════════

// ── General Ledger / Chart of Accounts ───────────────────────
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  code:        text("code").notNull(),
  name:        text("name").notNull(),
  type:        text("type").notNull(), // ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE
  subtype:     text("subtype"),        // e.g. Current Asset, Fixed Asset
  currency:    text("currency").notNull().default("USD"),
  balance:     numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  date:        timestamp("date").notNull(),
  description: text("description").notNull(),
  reference:   text("reference"),   // e.g. INV-001, PO-005
  status:      text("status").notNull().default("DRAFT"), // DRAFT|POSTED|VOID
  totalDebit:     numeric("total_debit", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCredit:     numeric("total_credit", { precision: 18, scale: 2 }).notNull().default("0"),
  createdById: text("created_by_id").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  entryId:     text("entry_id").notNull(),
  accountId:   text("account_id").notNull(),
  description: text("description"),
  debit:     numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
  credit:     numeric("credit", { precision: 18, scale: 2 }).notNull().default("0"),
});

// ── Payment Records ───────────────────────────────────────────
export const paymentRecords = pgTable("payment_records", {
  id:            text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:   text("workspace_id").notNull().default("default"),
  invoiceId:     text("invoice_id").notNull(),
  clientId:      text("client_id").notNull(),
  amount:     numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currency:      text("currency").notNull().default("USD"),
  method:        text("method").notNull().default("stripe"), // stripe|paymob|paytabs|bank|cash
  stripePaymentId: text("stripe_payment_id"),
  status:        text("status").notNull().default("PENDING"), // PENDING|COMPLETED|FAILED|REFUNDED
  paidAt:        timestamp("paid_at"),
  receiptUrl:    text("receipt_url"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ── WhatsApp Messages Log ─────────────────────────────────────
export const whatsappMessages = pgTable("whatsapp_messages", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  to:          text("to").notNull(),
  template:    text("template").notNull(),
  body:        text("body").notNull(),
  status:      text("status").notNull().default("SENT"), // SENT|DELIVERED|READ|FAILED
  waMessageId: text("wa_message_id"),
  clientId:    text("client_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Proposals ─────────────────────────────────────────────────
export const proposals = pgTable("proposals", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  leadId:       text("lead_id"),
  clientId:     text("client_id"),
  title:        text("title").notNull(),
  status:       text("status").notNull().default("DRAFT"), // DRAFT|SENT|VIEWED|ACCEPTED|REJECTED
  totalValue:   real("total_value").notNull().default(0),
  currency:     text("currency").notNull().default("USD"),
  validUntil:   timestamp("valid_until"),
  sentAt:       timestamp("sent_at"),
  viewedAt:     timestamp("viewed_at"),
  acceptedAt:   timestamp("accepted_at"),
  signatureUrl: text("signature_url"),
  notes:        text("notes"),
  services:     text("services"),  // JSON array of service items
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Lead Scores ───────────────────────────────────────────────
export const leadScores = pgTable("lead_scores", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  leadId:       text("lead_id").notNull().unique(),
  totalScore:   integer("total_score").notNull().default(0),
  budgetScore:  integer("budget_score").notNull().default(0),
  industryScore:integer("industry_score").notNull().default(0),
  sourceScore:  integer("source_score").notNull().default(0),
  engageScore:  integer("engage_score").notNull().default(0),
  classification: text("classification").notNull().default("COLD"), // HOT|WARM|COLD
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Service Catalog ───────────────────────────────────────────
export const serviceCatalog = pgTable("service_catalog", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  name:        text("name").notNull(),
  description: text("description"),
  category:    text("category").notNull(), // MEDIA|CREATIVE|STRATEGY|CONSULTING
  price:       real("price").notNull().default(0),
  currency:    text("currency").notNull().default("USD"),
  billingType: text("billing_type").notNull().default("MONTHLY"), // MONTHLY|PROJECT|HOURLY
  deliverables: text("deliverables"), // JSON array
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Creator Points (Gamification) ────────────────────────────
export const creatorPoints = pgTable("creator_points", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  userId:      text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull().default("default"),
  month:       integer("month").notNull(),
  year:        integer("year").notNull(),
  points:      integer("points").notNull().default(0),
  tasksOnTime: integer("tasks_on_time").notNull().default(0),
  zeroRevisions: integer("zero_revisions").notNull().default(0),
  clientFavorite: integer("client_favorite").notNull().default(0),
  badges:      text("badges"), // JSON array of badge names
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Currency Rates ────────────────────────────────────────────
export const currencyRates = pgTable("currency_rates", {
  id:         text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  from:       text("from_currency").notNull(),
  to:         text("to_currency").notNull(),
  rate:       real("rate").notNull(),
  fetchedAt:  timestamp("fetched_at").notNull().defaultNow(),
});

// ── Workflow Rules (Visual Builder) ──────────────────────────
export const workflowRules = pgTable("workflow_rules", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  name:        text("name").notNull(),
  trigger:     text("trigger").notNull(), // e.g. lead.stage_changed, task.approved
  conditions:  text("conditions").notNull(), // JSON
  actions:     text("actions").notNull(),    // JSON array
  isActive:    boolean("is_active").notNull().default(true),
  runCount:    integer("run_count").notNull().default(0),
  lastRunAt:   timestamp("last_run_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Email Campaigns ───────────────────────────────────────────
export const emailCampaigns = pgTable("email_campaigns", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  name:        text("name").notNull(),
  subject:     text("subject").notNull(),
  body:        text("body").notNull(),
  targetList:  text("target_list").notNull().default("leads"), // leads|clients|all
  status:      text("status").notNull().default("DRAFT"), // DRAFT|SCHEDULED|SENT
  scheduledAt: timestamp("scheduled_at"),
  sentAt:      timestamp("sent_at"),
  recipients:  integer("recipients").notNull().default(0),
  opens:       integer("opens").notNull().default(0),
  clicks:      integer("clicks").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// Types
export type ChartOfAccount  = typeof chartOfAccounts.$inferSelect;
export type JournalEntry    = typeof journalEntries.$inferSelect;
export type PaymentRecord   = typeof paymentRecords.$inferSelect;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type Proposal        = typeof proposals.$inferSelect;
export type LeadScore       = typeof leadScores.$inferSelect;
export type ServiceItem     = typeof serviceCatalog.$inferSelect;
export type CreatorPoint    = typeof creatorPoints.$inferSelect;
export type WorkflowRule    = typeof workflowRules.$inferSelect;
export type EmailCampaign   = typeof emailCampaigns.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// SAAS MULTI-TENANT PERMISSIONS SYSTEM
// ═══════════════════════════════════════════════════════════════

// All available permissions in the system
export const PERMISSIONS = [
  // Dashboard & Analytics
  "view_dashboard", "view_analytics", "view_kpis", "view_reports", "export_data",
  // Clients
  "view_clients", "create_clients", "edit_clients", "delete_clients",
  // Creative Tasks
  "view_tasks", "create_tasks", "edit_tasks", "delete_tasks", "approve_tasks", "assign_tasks",
  // Finance
  "view_finance", "create_invoices", "edit_invoices", "approve_invoices", "view_payroll", "manage_payroll",
  // Media Buying
  "view_media", "edit_media", "manage_budgets",
  // Sales
  "view_sales", "create_leads", "edit_leads", "delete_leads", "view_proposals", "create_proposals",
  // HR & Team
  "view_team", "manage_team", "view_salaries", "approve_leaves",
  // AI Studio
  "use_ai_studio", "view_ai_history",
  // Settings & Admin
  "manage_workspace", "manage_users", "manage_roles", "manage_billing",
  "manage_api_keys", "view_audit_logs", "manage_integrations",
  // Client Portal
  "view_portal", "approve_creatives", "pay_invoices",
] as const;

export type Permission = typeof PERMISSIONS[number];

// Custom roles per workspace
export const workspaceRoles = pgTable("workspace_roles", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  name:        text("name").notNull(),                    // e.g. "Senior AM", "Junior Creator"
  description: text("description"),
  color:       text("color").notNull().default("#2196F3"),
  isSystem:    boolean("is_system").notNull().default(false), // built-in roles can't be deleted
  isDefault:   boolean("is_default").notNull().default(false), // assigned to new users
  permissions: text("permissions").notNull().default("[]"),   // JSON array of Permission[]
  createdBy:   text("created_by"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// Link users to workspace roles (many-to-many)
export const userRoles = pgTable("user_roles", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  userId:      text("user_id").notNull().references(()=>users.id, {onDelete:"cascade"}),
  roleId:      text("role_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  assignedBy:  text("assigned_by"),
  assignedAt:  timestamp("assigned_at").notNull().defaultNow(),
});

// Workspace members — all users in a workspace
export const workspaceMembers = pgTable("workspace_members", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId:      text("user_id").notNull().references(()=>users.id, {onDelete:"cascade"}),
  status:      text("status").notNull().default("ACTIVE"),  // ACTIVE | SUSPENDED | PENDING
  joinedAt:    timestamp("joined_at").notNull().defaultNow(),
  invitedBy:   text("invited_by"),
  lastActiveAt:timestamp("last_active_at"),
});

// Pending invitations
export const invitations = pgTable("invitations", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  email:       text("email").notNull(),
  roleId:      text("role_id"),
  token:       text("token").notNull(),
  invitedBy:   text("invited_by").notNull(),
  status:      text("status").notNull().default("PENDING"),  // PENDING | ACCEPTED | EXPIRED
  expiresAt:   timestamp("expires_at").notNull(),
  acceptedAt:  timestamp("accepted_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
// ENTERPRISE ERP — VIVIT v30
// ═══════════════════════════════════════════════════════════════

// ── KPI Engine ───────────────────────────────────────────────
export const kpiDefinitions = pgTable("kpi_definitions", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  name:        text("name").notNull(),
  description: text("description"),
  category:    text("category").notNull(), // SALES|CREATIVE|MEDIA|FINANCE|HR
  formula:     text("formula").notNull(),  // JSON formula definition
  weight:      real("weight").notNull().default(1.0),
  target:      real("target").default(100),
  unit:        text("unit").default("%"),  // %|$|count|ratio
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const kpiScores = pgTable("kpi_scores", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  userId:       text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  kpiId:        text("kpi_id").notNull(),
  period:       text("period").notNull(), // "2025-01" format
  score:        real("score").notNull().default(0),
  target:       real("target").default(100),
  achievement:  real("achievement").default(0), // percentage 0-100
  evidence:     text("evidence"),  // JSON: auto-calculated proof
  reviewedBy:   text("reviewed_by"),
  status:       text("status").notNull().default("PENDING"), // PENDING|REVIEWED|APPROVED
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── Salary Recommendation Engine ─────────────────────────────
export const salaryRecommendations = pgTable("salary_recommendations", {
  id:              text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:     text("workspace_id").notNull().default("default"),
  userId:          text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  period:          text("period").notNull(),
  baseSalary:      numeric("base_salary").notNull(),
  kpiAchievement:  real("kpi_achievement").notNull().default(0), // %
  recommendedSalary: numeric("recommended_salary").notNull(),
  bonusAmount:     numeric("bonus_amount").default("0"),
  commissionAmount:numeric("commission_amount").default("0"),
  totalPackage:    numeric("total_package").notNull(),
  aiExplanation:   text("ai_explanation"),
  // Approval workflow
  status:          text("status").notNull().default("DRAFT"),
  // DRAFT→FINANCE_REVIEW→FINANCE_APPROVED→CFO_APPROVED→PAYROLL→LOCKED
  submittedBy:     text("submitted_by"),
  financeReviewedBy: text("finance_reviewed_by"),
  financeReviewedAt: timestamp("finance_reviewed_at"),
  financeNotes:    text("finance_notes"),
  managerApprovedBy: text("manager_approved_by"),
  managerApprovedAt: timestamp("manager_approved_at"),
  cfoApprovedBy:   text("cfo_approved_by"),
  cfoApprovedAt:   timestamp("cfo_approved_at"),
  cfoNotes:        text("cfo_notes"),
  lockedAt:        timestamp("locked_at"),
  lockedBy:        text("locked_by"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Payroll Locking & Financial Closing ──────────────────────
export const payrollLocks = pgTable("payroll_locks", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  period:      text("period").notNull(), // "2025-01"
  status:      text("status").notNull().default("OPEN"), // OPEN|LOCKED|CLOSED
  lockedAt:    timestamp("locked_at"),
  lockedBy:    text("locked_by"),
  reopenedAt:  timestamp("reopened_at"),
  reopenedBy:  text("reopened_by"),
  reopenReason:text("reopen_reason"),
  totalGross:  numeric("total_gross").default("0"),
  totalNet:    numeric("total_net").default("0"),
  totalTax:    numeric("total_tax").default("0"),
  approvalChain: text("approval_chain").default("[]"), // JSON audit trail
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Approval Workflow Engine ──────────────────────────────────
export const approvalWorkflows = pgTable("approval_workflows", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  entityType:  text("entity_type").notNull(), // PAYROLL|BONUS|EXPENSE|CONTRACT|PURCHASE|BUDGET
  entityId:    text("entity_id").notNull(),
  title:       text("title").notNull(),
  amount:      numeric("amount"),
  requestedBy: text("requested_by").notNull(),
  currentStep: integer("current_step").notNull().default(1),
  totalSteps:  integer("total_steps").notNull().default(2),
  status:      text("status").notNull().default("PENDING"), // PENDING|APPROVED|REJECTED|CANCELLED
  steps:       text("steps").notNull().default("[]"), // JSON array of approval steps
  rejectedAt:  timestamp("rejected_at"),
  rejectedBy:  text("rejected_by"),
  rejectionReason: text("rejection_reason"),
  completedAt: timestamp("completed_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Commission Engine ─────────────────────────────────────────
export const commissions = pgTable("commissions", {
  id:              text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:     text("workspace_id").notNull().default("default"),
  userId:          text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  period:          text("period").notNull(),
  clientId:        text("client_id"),
  revenueCollected:numeric("revenue_collected").notNull().default("0"),
  commissionRate:  real("commission_rate").notNull().default(0.10),
  commissionAmount:numeric("commission_amount").notNull().default("0"),
  type:            text("type").notNull().default("ACCOUNT_MANAGER"), // ACCOUNT_MANAGER|SALES|MEDIA_BUYER
  status:          text("status").notNull().default("PENDING"), // PENDING|APPROVED|PAID
  approvedBy:      text("approved_by"),
  approvedAt:      timestamp("approved_at"),
  paidAt:          timestamp("paid_at"),
  notes:           text("notes"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Agency Health Score ───────────────────────────────────────
export const agencyHealthScores = pgTable("agency_health_scores", {
  id:                text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:       text("workspace_id").notNull().default("default"),
  period:            text("period").notNull(),
  overallScore:      real("overall_score").notNull().default(0),
  revenueGrowth:     real("revenue_growth").default(0),
  profitability:     real("profitability").default(0),
  clientRetention:   real("client_retention").default(0),
  cashFlow:          real("cash_flow").default(0),
  collectionRate:    real("collection_rate").default(0),
  employeeUtilization: real("employee_utilization").default(0),
  mrr:               numeric("mrr").default("0"),
  arr:               numeric("arr").default("0"),
  activeClients:     integer("active_clients").default(0),
  atRiskClients:     integer("at_risk_clients").default(0),
  breakdown:         text("breakdown").default("{}"), // JSON detailed breakdown
  recommendations:   text("recommendations").default("[]"), // AI recommendations
  calculatedAt:      timestamp("calculated_at").notNull().defaultNow(),
});

// ── Resource Planning ─────────────────────────────────────────
export const resourcePlanning = pgTable("resource_planning", {
  id:             text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:    text("workspace_id").notNull().default("default"),
  userId:         text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  period:         text("period").notNull(),
  plannedHours:   real("planned_hours").default(160),
  billableHours:  real("billable_hours").default(0),
  nonBillableHours: real("non_billable_hours").default(0),
  utilization:    real("utilization").default(0), // %
  capacity:       real("capacity").default(100), // %
  overloaded:     boolean("overloaded").default(false),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

// ── SOP & Knowledge Base ──────────────────────────────────────
export const knowledgeBase = pgTable("knowledge_base", {
  id:          text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().default("default"),
  title:       text("title").notNull(),
  content:     text("content").notNull(),
  category:    text("category").notNull(), // SOP|TRAINING|POLICY|GUIDE
  tags:        text("tags").default("[]"),
  version:     integer("version").notNull().default(1),
  isPublished: boolean("is_published").notNull().default(true),
  authorId:    text("author_id"),
  viewCount:   integer("view_count").default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

// ── Follow-Up Reminders (Sales CRM upgrade) ───────────────────
export const followUpReminders = pgTable("follow_up_reminders", {
  id:           text("id").primaryKey().$defaultFn(()=>crypto.randomUUID()),
  workspaceId:  text("workspace_id").notNull().default("default"),
  leadId:       text("lead_id").notNull().references(()=>salesLeads.id,{onDelete:"cascade"}),
  userId:       text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  scheduledAt:  timestamp("scheduled_at").notNull(),
  notes:        text("notes"),
  priority:     text("priority").notNull().default("MEDIUM"), // HIGH|MEDIUM|LOW
  status:       text("status").notNull().default("PENDING"), // PENDING|COMPLETED|MISSED|CANCELLED
  completedAt:  timestamp("completed_at"),
  missedAt:     timestamp("missed_at"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});
