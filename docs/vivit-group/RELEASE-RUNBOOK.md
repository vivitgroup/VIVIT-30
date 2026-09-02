# Vivit Group ERP — Release & Rollback Runbook

## Scope
This runbook applies only to the isolated Vivit Group ERP runtime. It must not be used to mutate the existing Vivit Marketing production runtime before the final approved integration gate.

## Pre-release gates
1. Exact-head CTO Foundation workflow is green on the release SHA.
2. Isolation regression passes and all VGROUP_* runtime variables are independent from Marketing variables.
3. Portal isolation, permission contracts and TypeScript checks are green.
4. Supabase Security Advisor has no unresolved security lint for the isolated Group project.
5. Database migrations in the Group project are applied and recorded; no Marketing production migration is executed.
6. Backup/restore procedure is validated against the isolated Group database before production integration.
7. Storage buckets, auth callbacks and deployment hostname refer only to the Group runtime.

## Release sequence
1. Freeze the candidate SHA and record it in the release ticket.
2. Capture database migration list and schema snapshot for vgroup, hospitality and tech schemas.
3. Run exact-head CI and retain the workflow run ID.
4. Deploy only to the dedicated Group preview/runtime project.
5. Run health, authentication, business-unit access, owner isolation, client isolation, finance and mutation smoke tests.
6. Verify no request path, credential or callback resolves to the Marketing production runtime.
7. Obtain CTO acceptance before any final integration with Marketing.

## Rollback triggers
Rollback immediately for authentication bypass, cross-business data exposure, owner/client tenant leakage, financial double-posting, migration corruption, missing auditability, or any confirmed write to Marketing production before the final integration gate.

## Application rollback
Redeploy the last certified Group SHA. Do not roll back by deploying the Marketing branch into the Group runtime.

## Database rollback
Prefer forward-fix migrations. For destructive or integrity-impacting failures, restore the isolated Group database from the pre-release backup/snapshot. Validate row counts, ledger totals, role mappings, owner/client isolation and migration history after restore.

## Post-rollback verification
Run the exact-head CTO workflow, health endpoint, login/session tests, permission matrix, owner/client portal isolation, reservation no-overlap, CR atomicity, installment overpayment protection, recurring invoice idempotency and finance totals.

## Final integration rule
Marketing integration is a separate controlled change. No Group release automatically authorizes writes, migrations, OAuth changes, storage changes or deployment changes in the existing Marketing production environment.
