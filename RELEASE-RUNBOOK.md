# VIVIT ERP — CTO Release & Disaster Recovery Runbook

This release is **NO-GO** until every required gate is green for the same immutable approved candidate SHA. Production must remain untouched until **Stage 14 — Final CTO Acceptance** is explicitly complete.

## 1. Freeze and drift
1. Candidate branch is `audit/finance-deep-2026-09-01`.
2. Compare `main...audit/finance-deep-2026-09-01`; candidate must be `behind_by = 0` before final acceptance/merge.
3. Record the approved exact candidate head SHA. Never deploy `latest`, a mutable alias, or an unrecorded branch head.
4. Any new commit invalidates downstream certifications and restarts exact-head checks.
5. The exact certified head SHA must be the SHA reviewed at Stage 14 and the SHA merged/released.

## 2. Code gates
Require the release workflows/gates on the exact approved head:
- `QA 100 Percent Release` = SUCCESS for the candidate branch/exact SHA.
- `Release Verify` = SUCCESS for the exact candidate SHA when run for final release verification.
- `Stage 13 Disaster Recovery Release` = SUCCESS on the exact candidate SHA.
- Full release build includes QA suites, TypeScript, and optimized `next build`.
- Built-runtime smoke must pass.
- Do not accept a successful run whose `head_sha` differs from the approved candidate SHA.

## 3. Exact-head Preview gate
If a Vercel Preview is available, require a Preview deployment whose `githubCommitSha` equals the exact approved candidate SHA.
Do not use an older branch alias as evidence.
Verify:
- deployment state READY;
- `/api/health` = 200;
- JSON `status=healthy`, `database=connected`, `version=41.0.0`;
- no blocking error/fatal runtime log clusters;
- anonymous protected page redirects to login;
- protected API returns 401;
- `/robots.txt` resolves and disallows indexing.

A Vercel platform/plan build-rate-limit blocker must be recorded as an external blocker and must never be represented as application success. GitHub exact-head built-runtime gates remain mandatory regardless.

## 4. Mandatory backup before Production writes
Before any Production database migration or other destructive/irreversible write:
1. Create a provider-managed database snapshot/backup and record its immutable backup/snapshot identifier and creation timestamp in the release evidence.
2. Record the Production database/project identifier and schema/migration version associated with that backup without copying credentials into release logs.
3. Confirm backup state is completed/healthy before proceeding.
4. Never run a Production migration if a fresh recoverable backup cannot be identified.
5. Storage/media objects are not modified by the database migration steps in this release. If a future release includes destructive Storage changes, create/verify an equivalent Storage backup/export before those writes.

CI must not connect to Production for backup, restore, migration, or validation. CI disaster-recovery checks use ephemeral/local resources only.

## 5. Restore readiness drill
Before Stage 14 acceptance, verify restore readiness without overwriting Production:
1. Restore the recorded backup/snapshot to an **isolated non-Production target** or use the provider's non-destructive restore verification facility.
2. Confirm the restored database accepts connections and required application tables/schema are present.
3. Run read-only integrity checks on the isolated restored target (critical table presence plus finance/client/task relationship checks where applicable).
4. Record restore evidence, target identifier, source backup identifier, and verification result.
5. Destroy or retain the isolated restore target according to the provider retention policy; never redirect Production traffic to the drill target.

If provider policy prevents an isolated restore drill before release, Stage 13 remains NO-GO until an equivalent documented recovery verification is available and accepted by the CTO.

## 6. Release-time database precheck
Before any write, run read-only checks for:
- finance total/outstanding mismatches = 0;
- negative finance values = 0;
- orphan finance client links = 0;
- payment-history over-recording = 0;
- list of positive paid/history gaps;
- `enforce_campaign_connection_scope()` current `search_path` configuration.

## 7. Controlled database changes
Only after the exact-head release gates are green, the backup is healthy, the restore-readiness evidence is recorded, and Stage 14 CTO Acceptance is complete:
1. Execute `scripts/reconcile-finance-history.sql`.
   - transaction wrapped;
   - insert-only into payment history;
   - idempotent;
   - fails before COMMIT if a paid/history gap remains.
2. Execute `scripts/harden-database-security.sql`.
   - transaction wrapped;
   - only fixes function `search_path`;
   - does not create permissive RLS policies;
   - fails before COMMIT if function configuration is not fixed.
3. Re-run finance reconciliation and Supabase Security Advisor.

## 8. Merge and Production
Only after Stages 1–13 are green on the same final exact SHA and **Stage 14 — Final CTO Acceptance** explicitly approves that SHA:
1. Merge/release using the exact certified head SHA; do not rely on a stale PR number or mutable branch alias.
2. Require Vercel Production deployment for that approved merge/release SHA to become READY.
3. Verify Production `/api/health` = 200 and `database=connected`.
4. Run protected-route smoke tests and `/robots.txt`.
5. Check Production runtime error/fatal logs after traffic reaches the new deployment.
6. Perform Stage 15 post-deploy triple testing before declaring release complete.

## 9. Application rollback
Before deploying, record the last known-good READY Production deployment ID and its immutable Git SHA.

Rollback trigger — rollback immediately to that recorded deployment if any of these occur after release:
- health returns 5xx or database is not connected;
- authentication/authorization regression;
- finance balance mismatch;
- blocking task/client/media lifecycle regression;
- elevated 5xx runtime errors attributable to the release.

Rollback procedure:
1. Stop additional release writes/migrations.
2. Promote/redeploy the recorded last known-good immutable Production deployment/SHA using the hosting provider's supported rollback mechanism.
3. Verify `/api/health`, authentication/authorization, client/task lifecycle, media access, and finance read integrity.
4. Compare runtime error rate with the pre-release baseline.
5. Do not delete or rewrite audit/history rows merely to make the old application deployable.

## 10. Database recovery escalation
The database hardening changes in this release are intended to be backward-compatible with the previous application deployment. Finance reconciliation only adds missing historical payment evidence and does not alter invoice balances, so normal application rollback should not require deleting those audit/history rows.

If post-release database integrity cannot be recovered by application rollback plus forward-safe corrective SQL:
1. Freeze application writes.
2. Identify the exact pre-release backup/snapshot recorded in Section 4.
3. Obtain CTO/incident authorization for destructive database restore.
4. Restore using the database provider's supported recovery mechanism.
5. Verify integrity and application compatibility before reopening writes/traffic.
6. Preserve incident evidence and audit logs.

Production database restore is an incident-recovery action, not a normal release step.