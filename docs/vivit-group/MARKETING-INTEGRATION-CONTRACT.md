# Vivit Marketing + Vivit Group Unified Integration Contract

Status: UNIFIED CANDIDATE ASSEMBLED / PRODUCTION CUTOVER DISABLED

This contract governs the one-production integration of Vivit Group, Vivit Marketing, Vivit Technology and Vivit Hospitality in a single application deployment while preserving strict datastore, credential and authorization boundaries.

## Pinned source and candidate

- Unified integration branch: `integration/vgroup-marketing-dry-run`
- Latest certified Marketing/Vivito source branch at integration time: `main`
- Marketing/Vivito source SHA: `9817ec42750b17104c5292eb2ec4d02358b53290`
- Final production candidate: the exact HEAD of the unified integration branch after all integration fixes and audit gates complete.

The Marketing source SHA is a drift guard. If `main` moves after the source SHA above, the unified candidate must be compared and re-certified before production.

## One-production architecture

The final application is deployed once from one exact unified commit. The same deployment exposes the Group selector, Group Board Control Center, Marketing ERP, Technology, Hospitality and Vivito.

One production does **not** mean one database or one auth secret. The following remain isolated:

- Vivit Group database and Group service credentials.
- Marketing database and Marketing service credentials.
- Group auth secret and Marketing/Auth.js secret.
- Group storage and Marketing storage.
- OAuth/provider credentials.

No runtime may silently fall back from Group credentials to Marketing credentials or vice versa.

## Group → Marketing identity bridge

The Group shell remains the universal entry point. Marketing entry requires active Group `marketing` business-unit membership and a certified integration flag.

The handoff uses:

- HMAC-SHA256 with a dedicated secret.
- Assertion lifetime of 45 seconds and hard maximum of 60 seconds.
- Unique nonce per assertion.
- SHA-256 nonce hash persisted in the Marketing database.
- Single-use nonce enforcement by primary-key conflict.
- POST-only browser receiver; GET consumption is rejected.
- Exact production origin allowlist.
- Normalized-email Marketing user lookup.
- Marketing user must be active and `APPROVED`.
- Marketing workspace must exist and be active.
- Marketing role is resolved from Marketing itself; Group never supplies trusted Marketing role/workspace claims.
- No automatic Marketing account creation.
- Failure is fail-closed.

## Vivito cross-workspace execution

Vivito is visible in Group, Marketing, Technology and Hospitality. Its execution layer is allowlisted and audited.

For Marketing execution from Group:

1. Group session must have active Marketing business-unit access.
2. Group creates a short-lived signed assertion from the authenticated Group identity.
3. The Marketing verifier validates signature, expiry, identity, Marketing user status, workspace, role and consumes a single-use nonce.
4. The requested action must exist in the Marketing `VIVITO_ACTION_CATALOG`.
5. Marketing approval-policy / role checks remain authoritative.
6. The outer Group Vivito task remains approval-gated for sensitive actions.
7. `X-Vivito-Task-Id` is used to claim a Marketing audit receipt so the same bridged task cannot execute twice.
8. Results returned to Group are stored only through the Group Vivito redacted task ledger.

Arbitrary URLs, SQL, provider names or unregistered action names are never accepted from the user as execution targets.

## Default-disabled cutover controls

These flags must remain disabled during certification:

- `VGROUP_MARKETING_INTEGRATION_ENABLED=false`
- `VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED=false`

They may be enabled only after the exact unified candidate has passed every production gate below.

## Mandatory pre-production gates

1. Marketing source SHA still equals `9817ec42750b17104c5292eb2ec4d02358b53290`, or a fresh source-drift review is completed.
2. Exact unified HEAD passes the full Vivit Group CTO workflow.
3. Exact unified HEAD passes the dedicated unified brutal production audit.
4. Marketing/Vivito certification relevant to the merged source remains green or is re-run on the unified candidate where applicable.
5. TypeScript, scoped ESLint and production compilation are green on the exact same HEAD.
6. Built-artifact runtime smoke is green on the exact same HEAD.
7. Group Supabase security advisor is clean.
8. Marketing Supabase security advisor is clean after the nonce migration is applied.
9. Group/Marketing database URLs, service keys, auth secrets and storage credentials remain distinct.
10. `group_handoff_nonces` migration is applied to Marketing before the receiver flag is enabled.
11. The handoff secret is dedicated, >=32 bytes and differs from both auth secrets.
12. `VGROUP_GROUP_ORIGIN`, `VGROUP_MARKETING_HANDOFF_URL` and the final deployment origin match exactly.
13. Rollback commit and database rollback boundaries are documented before cutover.
14. No unresolved high/critical dependency vulnerability, security-advisor error, failed QA gate, schema drift or runtime smoke failure remains.
15. Production deployment is one shot from the certified unified HEAD only; no older Group or Marketing SHA may be deployed afterward.

## Rollback boundary

Fast rollback is disabling both integration flags. Application rollback restores the immediately previous certified application commit. Group and Marketing business data are not bulk-copied during integration, so rollback does not require destructive cross-database reversal.

The nonce table is additive and safe to leave in place during rollback.

## Explicitly not part of this integration

- Physically merging the Group and Marketing databases.
- Sharing auth/session secrets between systems.
- Moving Marketing storage into Group storage.
- Reconfiguring external OAuth provider ownership unless separately certified.
- Bypassing Marketing permissions because the caller came from Group.
- Any Vercel deployment or Vercel-specific release path.
