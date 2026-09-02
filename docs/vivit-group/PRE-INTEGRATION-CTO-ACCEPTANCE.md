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

## Remaining manual gates before Marketing integration
1. Validate an isolated backup/restore drill and record evidence.
2. Freeze final candidate SHA and obtain CTO acceptance against that exact SHA.
3. Execute Marketing integration only as a separately approved controlled change.

## Prohibited before final integration approval
- Marketing production database migration or write.
- Marketing production storage mutation.
- Marketing OAuth/callback mutation.
- Merge into the production branch.
- Any Vercel project action for Vivit Group ERP.
