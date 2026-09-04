# Vivit Group ↔ Marketing Integration Dry Run — 2026-09-02

Status: SAFE DRY RUN / NO PRODUCTION MUTATION

## Certified inputs

- Group source branch: `feat/vivit-group-erp-7d`
- Group source SHA: `7aac2e5956b4ebf392b260af0286e4c9c5eabe80`
- Dry-run branch: `integration/vgroup-marketing-dry-run`
- Marketing production branch: `feat/vivito-internal-100`
- Marketing production SHA observed immediately before this dry run: `b66542a3cfee8d5d54299450e8bc6a79b2a51062`
- Merge-base: `843d2de608aadb9a5c3f5ecc338abf365a432d6e`
- Compare status: `diverged`
- Group ahead of Marketing baseline by: 767 commits
- Group behind Marketing baseline by: 111 commits

## Decision

A direct branch merge is explicitly rejected for this cutover because the histories have materially diverged. The approved integration model remains the bounded adapter/handoff contract: Group shell authorizes access to the `marketing` business unit, while Marketing keeps its own datastore, role/workspace enforcement, storage, OAuth and runtime contracts.

## Fresh isolated Group database checkpoint

Read-only checkpoint immediately before final dry-run certification:

- business units: 3
- roles: 10
- permissions: 108
- role-permission mappings: 227
- Hospitality base tables: 47
- Tech base tables: 68
- VGroup base tables: 25
- active reservation overlap violations: 0
- negative inventory items: 0
- overpaid Tech installments: 0
- duplicate central-ledger idempotency keys: 0
- PUBLIC/anon/authenticated routine EXECUTE grants across `vgroup`, `hospitality`, `tech`: 0
- Supabase Security Advisor: 0 lints
- Performance Advisor: INFO-only unused-index notices; no warning/error finding is accepted as a cutover blocker from this fresh check.

This checkpoint is evidence of current logical integrity, not a provider-level physical snapshot.

## Fail-closed gates

1. Marketing SHA must remain exactly `b66542a3cfee8d5d54299450e8bc6a79b2a51062` until a new compatibility review is produced.
2. `VGROUP_MARKETING_INTEGRATION_ENABLED` remains `false` during this dry run.
3. No Marketing database migration, data copy, storage mutation, OAuth mutation, production branch mutation, hosting mutation or deployment is part of this dry run.
4. No Group/Marketing database credentials, service keys or auth secrets may be shared.
5. Marketing roles/workspace/approval status remain authoritative at Marketing session issuance.
6. Group-supplied Marketing role/workspace claims must not be trusted.
7. Handoff remains short-lived, nonce-protected, single-use, and fail-closed.
8. Production cutover requires separate explicit approval after the dry-run exact-head candidate passes all gates.

## Rollback checkpoint

The immutable rollback references for this dry run are:

- Group certified pre-dry-run SHA: `7aac2e5956b4ebf392b260af0286e4c9c5eabe80`
- Marketing production SHA: `b66542a3cfee8d5d54299450e8bc6a79b2a51062`
- Marketing remains untouched; rollback of this dry run is simply deletion/abandonment of `integration/vgroup-marketing-dry-run`.

The existing Group logical backup/restore evidence remains applicable to the isolated Group database. This dry run does not claim a provider-level physical snapshot or restore.

## Runtime/browser validation status

The dry-run CI starts the compiled Next.js candidate and executes built-runtime smoke checks covering Group login rendering, fail-closed Group health, protected Tech/Hospitality/Finance/portal APIs, anonymous business selector behavior and the disabled Marketing gate.

Browser-based visual E2E is a separate validation layer. It must not be reported as passed unless executed against an accessible runtime with a browser-capable session.

## Promotion rule

No production promotion is allowed from this branch until:

- exact-head CTO workflow is green on the final dry-run SHA;
- built-runtime smoke is green on that same SHA;
- Marketing production SHA is re-read and unchanged;
- browser visual E2E is completed when a browser-capable runtime is available;
- explicit production Marketing Integration approval is given.
