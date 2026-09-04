# Vivit Group ERP — Release & Rollback Runbook

## Scope
This runbook applies only to the isolated Vivit Group ERP runtime and database. It must not be used to mutate the existing Vivit Marketing production runtime before the final approved integration gate. Vercel is explicitly outside this delivery scope.

## Pre-release gates
1. Exact-head CTO Foundation workflow is green on the release SHA.
2. Isolation regression passes and all VGROUP_* runtime variables are independent from Marketing variables.
3. Portal isolation, permission contracts, auth lifecycle, API contracts, responsive shell and TypeScript checks are green.
4. Supabase Security Advisor has no unresolved security lint for the isolated Group project.
5. Database migrations in the Group project are applied and recorded; no Marketing production migration is executed.
6. Backup/restore procedure is documented and must be validated against the isolated Group database before any production integration.
7. Storage and authentication configuration refer only to the isolated Group project.

## Certification sequence
1. Freeze the candidate SHA and record it in the CTO acceptance record.
2. Capture database migration list and schema state for vgroup, hospitality and tech schemas.
3. Run exact-head CI and retain the workflow run ID.
4. Run isolated database integrity/security/performance checks.
5. Validate authentication, business-unit access, owner isolation, client isolation, finance controls and mutation contracts through CI and isolated runtime tests where available.
6. Verify no credential, migration, storage path or callback resolves to Marketing production.
7. Obtain CTO acceptance before any final integration with Marketing.

## Rollback triggers
Rollback immediately for authentication bypass, cross-business data exposure, owner/client tenant leakage, financial double-posting, migration corruption, missing auditability, or any confirmed write to Marketing production before the final integration gate.

## Application rollback
Return to the last certified Group SHA. Never substitute the Marketing branch as a Group rollback target.

## Database rollback
Prefer forward-fix migrations. For destructive or integrity-impacting failures, restore the isolated Group database from the pre-integration backup/snapshot. Validate row counts, ledger totals, role mappings, owner/client isolation and migration history after restore.

## Post-rollback verification
Run the exact-head CTO workflow, health/auth contracts, permission matrix, owner/client portal isolation, reservation no-overlap, CR atomicity, installment overpayment protection, recurring invoice idempotency and finance totals.

## Final integration rule
Marketing integration is a separate controlled change. No Group certification automatically authorizes writes, migrations, OAuth changes, storage changes, hosting changes or deployment changes in the existing Marketing production environment.
