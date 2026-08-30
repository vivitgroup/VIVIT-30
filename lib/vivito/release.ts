export const VIVITO_INTELLIGENCE_VERSION="1.0.0";
export const VIVITO_PROTOCOL_VERSION="1.0.0";
export const VIVITO_RELEASE_STATE="FROZEN_FOR_EVALUATION" as const;

export const VIVITO_RELEASE_INVARIANTS=[
  "Canonical VIVITO identity and VIVIT Operating Intelligence role",
  "Bilingual Arabic/English expert routing",
  "Nine expert brains with cross-functional routing",
  "Seven-role authorization-aware live context",
  "Live ERP evidence hierarchy and metric-definition discipline",
  "Current-versus-previous period performance comparison",
  "Tracking-health and client-health context where authorized",
  "Sales pipeline intelligence for authorized sales scope",
  "Finance intelligence restricted to Super Admin and Accountant",
  "Independent second-pass critic before final model answer",
  "Prompt-injection isolation for ERP, client and retrieved business data",
  "Bounded provider timeout with Gemini/Claude fallback",
  "Private no-store assistant responses and workspace-scoped data access",
  "100-case benchmark corpus across ten intelligence dimensions",
  "Deterministic benchmark scorer and provider-backed evaluation runner",
] as const;

export const VIVITO_EVALUATION_POLICY={
  frozenBeforeBenchmark:true,
  benchmarkCases:100,
  intelligenceDimensions:10,
  targetScore:100,
  requireAllCasesForCertification:true,
  certificationLabel:"VIVITO Intelligence v1.0.0 — 100/100 Certified",
} as const;
