export const ACCOUNTING_CONTRACT_VERSION = "2026-09-02-v1" as const;

export const ACCOUNT_CODES = {
  CASH: "1000_cash",
  ACCOUNTS_RECEIVABLE: "1100_accounts_receivable",
  INTERCOMPANY_RECEIVABLE: "1300_intercompany_receivable",
  ACCOUNTS_PAYABLE: "2000_accounts_payable",
  OWNER_PAYABLE: "2100_owner_payable",
  DEFERRED_REVENUE: "2200_deferred_revenue",
  INTERCOMPANY_PAYABLE: "2300_intercompany_payable",
  HOSPITALITY_ROOM_REVENUE: "4000_hospitality_room_revenue",
  TECH_PROJECT_REVENUE: "4100_tech_project_revenue",
  TECH_CR_REVENUE: "4110_tech_cr_revenue",
  TECH_SUPPORT_REVENUE: "4120_tech_support_revenue",
  TECH_SAAS_REVENUE: "4130_tech_saas_revenue",
  MARKETING_SERVICE_REVENUE: "4200_marketing_service_revenue",
  HOSPITALITY_OPEX: "5000_hospitality_operating_expense",
  TECH_DELIVERY_COST: "5100_tech_delivery_cost",
  TECH_EXTERNAL_RESOURCE_COST: "5110_tech_external_resource_cost",
  MARKETING_MEDIA_SPEND: "5200_marketing_media_spend",
  MARKETING_OPEX: "5210_marketing_operating_expense",
  CONTRA_REVENUE: "4900_contra_revenue",
} as const;

export type CanonicalAccountCode = (typeof ACCOUNT_CODES)[keyof typeof ACCOUNT_CODES];
export type AccountingBusinessUnit = "hospitality" | "tech" | "marketing" | "group";
export type LedgerDirection = "debit" | "credit";

export interface AccountingMapping {
  businessUnit: AccountingBusinessUnit;
  sourceType: string;
  eventType: string;
  transactionType: string;
  direction: LedgerDirection;
  accountCode: CanonicalAccountCode;
}

export const ACCOUNTING_EVENT_MAPPINGS: readonly AccountingMapping[] = [
  {businessUnit:"hospitality",sourceType:"reservation",eventType:"revenue_recognized",transactionType:"hospitality_revenue",direction:"credit",accountCode:ACCOUNT_CODES.HOSPITALITY_ROOM_REVENUE},
  {businessUnit:"hospitality",sourceType:"invoice",eventType:"receivable_created",transactionType:"receivable",direction:"debit",accountCode:ACCOUNT_CODES.ACCOUNTS_RECEIVABLE},
  {businessUnit:"hospitality",sourceType:"expense",eventType:"expense_posted",transactionType:"hospitality_expense",direction:"debit",accountCode:ACCOUNT_CODES.HOSPITALITY_OPEX},
  {businessUnit:"hospitality",sourceType:"owner_payout",eventType:"owner_payable_created",transactionType:"owner_payable",direction:"credit",accountCode:ACCOUNT_CODES.OWNER_PAYABLE},
  {businessUnit:"hospitality",sourceType:"refund",eventType:"refund_posted",transactionType:"revenue_credit",direction:"debit",accountCode:ACCOUNT_CODES.CONTRA_REVENUE},

  {businessUnit:"tech",sourceType:"project",eventType:"revenue_recognized",transactionType:"project_revenue",direction:"credit",accountCode:ACCOUNT_CODES.TECH_PROJECT_REVENUE},
  {businessUnit:"tech",sourceType:"change_request",eventType:"revenue_recognized",transactionType:"change_request_revenue",direction:"credit",accountCode:ACCOUNT_CODES.TECH_CR_REVENUE},
  {businessUnit:"tech",sourceType:"support_contract",eventType:"revenue_recognized",transactionType:"support_revenue",direction:"credit",accountCode:ACCOUNT_CODES.TECH_SUPPORT_REVENUE},
  {businessUnit:"tech",sourceType:"subscription",eventType:"revenue_recognized",transactionType:"subscription_revenue",direction:"credit",accountCode:ACCOUNT_CODES.TECH_SAAS_REVENUE},
  {businessUnit:"tech",sourceType:"payment_installment",eventType:"receivable_created",transactionType:"receivable",direction:"debit",accountCode:ACCOUNT_CODES.ACCOUNTS_RECEIVABLE},
  {businessUnit:"tech",sourceType:"collection",eventType:"cash_collected",transactionType:"collection",direction:"debit",accountCode:ACCOUNT_CODES.CASH},
  {businessUnit:"tech",sourceType:"project_cost",eventType:"cost_posted",transactionType:"project_cost",direction:"debit",accountCode:ACCOUNT_CODES.TECH_DELIVERY_COST},
  {businessUnit:"tech",sourceType:"external_resource",eventType:"cost_posted",transactionType:"external_resource_cost",direction:"debit",accountCode:ACCOUNT_CODES.TECH_EXTERNAL_RESOURCE_COST},
  {businessUnit:"tech",sourceType:"credit_note",eventType:"credit_posted",transactionType:"revenue_credit",direction:"debit",accountCode:ACCOUNT_CODES.CONTRA_REVENUE},

  {businessUnit:"marketing",sourceType:"service_invoice",eventType:"revenue_recognized",transactionType:"marketing_revenue",direction:"credit",accountCode:ACCOUNT_CODES.MARKETING_SERVICE_REVENUE},
  {businessUnit:"marketing",sourceType:"client_invoice",eventType:"receivable_created",transactionType:"receivable",direction:"debit",accountCode:ACCOUNT_CODES.ACCOUNTS_RECEIVABLE},
  {businessUnit:"marketing",sourceType:"media_spend",eventType:"spend_posted",transactionType:"media_spend",direction:"debit",accountCode:ACCOUNT_CODES.MARKETING_MEDIA_SPEND},
  {businessUnit:"marketing",sourceType:"operating_expense",eventType:"expense_posted",transactionType:"marketing_expense",direction:"debit",accountCode:ACCOUNT_CODES.MARKETING_OPEX},
  {businessUnit:"marketing",sourceType:"refund",eventType:"refund_posted",transactionType:"revenue_credit",direction:"debit",accountCode:ACCOUNT_CODES.CONTRA_REVENUE},

  {businessUnit:"group",sourceType:"intercompany",eventType:"receivable_created",transactionType:"intercompany_receivable",direction:"debit",accountCode:ACCOUNT_CODES.INTERCOMPANY_RECEIVABLE},
  {businessUnit:"group",sourceType:"intercompany",eventType:"payable_created",transactionType:"intercompany_payable",direction:"credit",accountCode:ACCOUNT_CODES.INTERCOMPANY_PAYABLE},
  {businessUnit:"group",sourceType:"ledger_reversal",eventType:"reverse_revenue",transactionType:"reversal",direction:"debit",accountCode:ACCOUNT_CODES.CONTRA_REVENUE},
] as const;

const mappingKey = (businessUnit: AccountingBusinessUnit, sourceType: string, eventType: string) => `${businessUnit}:${sourceType}:${eventType}`;
const MAPPING_INDEX = new Map(ACCOUNTING_EVENT_MAPPINGS.map(mapping => [mappingKey(mapping.businessUnit,mapping.sourceType,mapping.eventType),mapping] as const));

export function resolveLedgerMapping(businessUnit: AccountingBusinessUnit, sourceType: string, eventType: string): AccountingMapping {
  const mapping=MAPPING_INDEX.get(mappingKey(businessUnit,sourceType,eventType));
  if(!mapping) throw new Error(`UNMAPPED_ACCOUNTING_EVENT:${businessUnit}:${sourceType}:${eventType}`);
  return mapping;
}
