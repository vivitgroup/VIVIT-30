# Vivit Group ERP — Pre-Integration CTO Acceptance

## Candidate policy
A candidate is acceptable only when every automated gate is green on the exact branch HEAD and the isolated Supabase project remains the only Group database target.

## Mandatory evidence
- Exact-head `Vivit Group CTO Foundation` workflow: dependency security, isolation, RBAC, portal isolation, auth lifecycle, API error contract, responsive shell, release readiness, TypeScript.
- Supabase Security Advisor: zero unresolved security lints.
- Supabase performance review: no unresolved duplicate-index or unindexed-foreign-key warnings; fresh-database unused-index INFO is non-blocking.
- Group runtime credential guard rejects equality with Marketing credentials.
- Owner and Tech Client portal queries are user/tenant scoped.
- Financial mutation paths use idempotency/atomic database controls where applicable.
- Audit/archive/restore contracts exist for sensitive shared operations.
- Release and rollback boundaries are documented.
- Vercel is excluded from the delivery scope and is not required for CTO certification.
- Isolated backup/restore drill evidence is recorded in `docs/vivit-group/BACKUP-RESTORE-DRILL-2026-09-02.md` and is PASS.

## Gate status
1. Isolated backup/restore drill — DONE / PASS.
2. Freeze final candidate SHA and obtain CTO acceptance against that exact SHA — PENDING exact-head green run.
3. Marketing integration — intentionally separate and requires its own explicit controlled-change approval.

## Prohibited before final integration approval
- Marketing production database migration or write.
- Marketing production storage mutation.
- Marketing OAuth/callback mutation.
- Merge into the production branch.
- Any Vercel project action for Vivit Group ERP.
