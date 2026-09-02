# Vivit Marketing Integration Contract

Status: RECEIVER CERTIFIED / PRODUCTION CUTOVER DISABLED

This contract prepares the isolated Vivit Group ERP to adopt the existing Vivit Marketing ERP as the `marketing` business unit without mutating Marketing production before the final approved cutover.

## Pinned candidates

- Group integration branch: `integration/vgroup-marketing-dry-run`
- Marketing base candidate branch: `feat/vivito-internal-100`
- Marketing base SHA: `b66542a3cfee8d5d54299450e8bc6a79b2a51062`
- Marketing receiving-bridge branch: `integration/marketing-group-handoff`
- Fully certified Marketing receiving-bridge SHA: `3fc3f24b991fbc1f9b9802d7196d37910393226c`

The receiving bridge is derived from the pinned Marketing base candidate. It passed the dedicated Group-handoff certification and the full VIVITO Internal 100 certification on the same exact SHA. If this receiving-bridge SHA changes, this contract must be re-certified before cutover.

## Existing Marketing auth contract

Marketing uses Auth.js / NextAuth JWT sessions with live revalidation against the Marketing database. The session contract carries user identity plus role(s), permissions, `workspaceId`, and `authValid`. Marketing credentials and database remain independent from Vivit Group credentials before cutover.

The certified receiving bridge adds a dedicated Auth.js `group-handoff` provider. The provider does not replace password authentication and does not trust Group-supplied Marketing role/workspace claims. It resolves the Marketing user by normalized email, validates the user and workspace against Marketing, then the existing JWT callback continues live revalidation.

## Final architecture

The Group shell remains the entry point. `marketing` is exposed as one authorized business unit beside `hospitality` and `tech`.

The integration does not copy Marketing production data into the Group database merely to make navigation work. Marketing remains its own bounded datastore initially. The Group layer supplies identity/business-unit authorization and a short-lived server-side handoff; Marketing continues to enforce its own live role/workspace checks until a later separately-certified identity consolidation is approved.

## Certified handoff properties

- HMAC-SHA256 assertion with a dedicated secret.
- Assertion lifetime <=60 seconds; Group currently emits 45-second assertions.
- Unique nonce for every assertion.
- Marketing persists only a SHA-256 nonce hash for replay protection.
- Nonce store has a primary key and RLS; replay insert is rejected.
- Assertion is accepted by POST body only; GET consumption is rejected.
- Exact Group browser origin allowlist on the Marketing receiver.
- Normalized-email user lookup.
- Marketing user must be active and `APPROVED`.
- Marketing role must be a valid Marketing role.
- Marketing workspace must exist and be active.
- No automatic Marketing account creation.
- Receiver and Group integration flags are disabled by default.
- Failure is fail-closed.

## Mandatory production cutover gates

1. The Marketing receiving-bridge SHA still equals `3fc3f24b991fbc1f9b9802d7196d37910393226c`, or a new compatibility certification is produced.
2. Group exact-head CTO workflow is green while pinned to that receiving-bridge SHA.
3. Group Supabase security advisor is clean.
4. Group/Marketing database, service-key, auth-secret and storage credentials remain different.
5. Marketing user lookup remains deterministic by normalized email; no automatic account creation is allowed during first cutover.
6. Group user must have active `marketing` business-unit access before handoff.
7. Marketing user must independently be active and `APPROVED`, with a valid workspace and role, before a Marketing session is issued.
8. Handoff assertion lifetime remains at most 60 seconds, has a unique nonce, is single-use, and is never accepted from a query-string replay.
9. The bridge secret is dedicated to this integration and must not equal Group or Marketing auth secrets.
10. Failure in the bridge fails closed; it must not fall back to password bypass, shared cookies, or shared database credentials.
11. Production must receive the handoff nonce migration before the receiver flag is enabled.
12. The Marketing receiver endpoint and Group origin must use the exact production origins selected for cutover.
13. No Marketing storage mutation, OAuth callback mutation, production branch merge, hosting action, or deployment action is authorized by this document.
14. Actual production mutation requires explicit production cutover approval after the exact candidate SHAs are rechecked.

## Identity mapping

Group source claims:

- `sub`: Group user UUID
- `email`: normalized email
- `name`: display name
- `business_unit`: `marketing`
- `iat`, `exp`
- `nonce`

Marketing destination identity is resolved by normalized email. Marketing remains authoritative for its own `role`, `roles`, `permissions`, `workspaceId`, `is_active`, and `approval_status` at session issuance time.

The handoff never trusts Group-supplied Marketing role or workspace claims.

## Rollback boundary

Before final cutover the Marketing card stays disabled. During cutover, enablement is controlled by `VGROUP_MARKETING_INTEGRATION_ENABLED=true` only after the receiving Marketing bridge is deployed and `VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED=true` is explicitly enabled on Marketing. Rollback is immediate disablement of both flags plus restoration of the previous certified Group and Marketing SHAs. Marketing business data is not rolled back because the bridge does not migrate Marketing business data.

## Explicitly outside this cutover

- Merging Marketing and Group databases.
- Replacing Marketing authorization with Group roles.
- Moving Marketing storage.
- Reconfiguring Marketing OAuth integrations.
- Any Vercel action.
- Production deployment/hosting decisions unless separately authorized.
