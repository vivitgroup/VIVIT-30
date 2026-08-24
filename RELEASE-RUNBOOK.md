# VIVIT ERP — 100% Release Runbook

This release is **NO-GO** until every step below is green for the same immutable QA head SHA.

## 1. Freeze and drift
1. Keep `qa/100-percent-release` unmerged while validating.
2. Compare `main...qa/100-percent-release`; QA must be `behind_by = 0`.
3. Record the exact QA head SHA. Any new commit invalidates downstream certifications and restarts exact-head checks.

## 2. Code gates
Require both GitHub workflows on the exact head:
- `QA 100 Percent Release` = SUCCESS.
- `Release Verify` = SUCCESS.
- Full build includes all QA suites, TypeScript, and optimized `next build`.
- Built-runtime smoke must pass.

## 3. Exact-head Preview gate
Require a Vercel **Preview** deployment whose `githubCommitSha` equals the exact QA head.
Do not use an older branch alias as evidence.
Verify:
- deployment state READY;
- `/api/health` = 200;
- JSON `status=healthy`, `database=connected`, `version=41.0.0`;
- no blocking error/fatal runtime log clusters;
- anonymous protected page redirects to login;
- protected API returns 401;
- `/robots.txt` resolves and disallows indexing.

## 4. Release-time database precheck
Before any write, run read-only checks for:
- finance total/outstanding mismatches = 0;
- negative finance values = 0;
- orphan finance client links = 0;
- payment-history over-recording = 0;
- list of positive paid/history gaps;
- `enforce_campaign_connection_scope()` current `search_path` configuration.

## 5. Controlled database changes
Only after exact-head Preview is green:
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

## 6. Merge and Production
Only when sections 1–5 are green:
1. Merge PR #27 using the exact certified head SHA.
2. Require Vercel Production deployment for that merge SHA to become READY.
3. Verify Production `/api/health` = 200 and `database=connected`.
4. Run protected-route smoke tests and `/robots.txt`.
5. Check Production runtime error/fatal logs after traffic reaches the new deployment.

## 7. Rollback trigger
Rollback immediately to the last READY Production deployment if any of these occur after release:
- health returns 5xx or database is not connected;
- authentication/authorization regression;
- finance balance mismatch;
- blocking task/client/media lifecycle regression;
- elevated 5xx runtime errors attributable to the release.

Database hardening migrations in this release are designed to be backward-compatible with the previous application deployment. The finance reconciliation only adds missing historical payment-history evidence and does not alter invoice balances, so application rollback does not require deleting those audit/history rows.
