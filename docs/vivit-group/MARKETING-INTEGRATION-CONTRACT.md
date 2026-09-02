# Vivit Marketing Integration Contract

Status: PREPARED / DISABLED BY DEFAULT

This contract prepares the isolated Vivit Group ERP to adopt the existing Vivit Marketing ERP as the `marketing` business unit without mutating Marketing production before the final approved cutover.

## Pinned candidates

- Group candidate branch: `feat/vivit-group-erp-7d`
- Marketing production candidate branch: `feat/vivito-internal-100`
- Marketing candidate SHA reviewed for this contract: `b66542a3cfee8d5d54299450e8bc6a79b2a51062`

If the Marketing SHA changes, this contract must be re-certified before cutover.

## Existing Marketing auth contract observed at pinned SHA

Marketing currently uses Auth.js / NextAuth JWT sessions with live revalidation against the Marketing database. The session contract carries user identity plus role(s), permissions, `workspaceId`, and `authValid`. Marketing credentials and database remain independent from Vivit Group credentials before cutover.

## Final architecture

The Group shell remains the entry point. `marketing` is exposed as one authorized business unit beside `hospitality` and `tech`.

The final integration must not copy Marketing production data into the Group database merely to make navigation work. Marketing remains its own bounded datastore initially. The Group layer supplies identity/business-unit authorization and a short-lived server-side handoff; Marketing continues to enforce its own live role/workspace checks until a later separately-certified identity consolidation is approved.

## Mandatory cutover gates

1. The Marketing candidate SHA still equals the reviewed SHA, or a new compatibility certification is produced.
2. Group exact-head CTO workflow is green.
3. Group Supabase security advisor is clean.
4. Group/Marketing database, service-key, auth-secret and storage credentials remain different.
5. Marketing user lookup is deterministic by normalized email; no automatic account creation is allowed during first cutover.
6. Group user must have active `marketing` business-unit access before handoff.
7. Marketing user must independently be active and `APPROVED`, with a valid workspace and role, before a Marketing session is issued.
8. Handoff assertion lifetime is at most 60 seconds, has a unique nonce, is single-use, and is never accepted from a query-string replay.
9. The bridge secret is dedicated to this integration and must not equal Group or Marketing auth secrets.
10. Failure in the bridge fails closed and returns the user to the Group selector; it must not fall back to password bypass, shared cookies, or shared database credentials.
11. No Marketing database migration, storage mutation, OAuth callback mutation, production branch merge, hosting action, or deployment action is authorized by this document.
12. Actual production mutation requires explicit production cutover approval after the exact candidate SHA is certified.

## Identity mapping

Group source claims:

- `sub`: Group user UUID
- `email`: normalized email
- `name`: display name
- `business_unit`: `marketing`
- `iat`, `exp`
- `nonce`

Marketing destination identity is resolved by normalized email. Marketing remains authoritative for its own `role`, `roles`, `permissions`, `workspaceId`, `is_active`, and `approval_status` at session issuance time.

The handoff must never trust Group-supplied Marketing role or workspace claims.

## Rollback boundary

Before final cutover the Marketing card stays disabled. During cutover, enablement is controlled by `VGROUP_MARKETING_INTEGRATION_ENABLED=true` only after the receiving Marketing bridge has been certified. Rollback is immediate disablement of that flag plus restoration of the previous certified Group SHA. Marketing data is not rolled back because the bridge does not migrate Marketing business data.

## Explicitly outside this cutover

- Merging Marketing and Group databases.
- Replacing Marketing authorization with Group roles.
- Moving Marketing storage.
- Reconfiguring Marketing OAuth integrations.
- Any Vercel action.
- Production deployment/hosting decisions.
