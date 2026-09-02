# Vivit Group ERP — Technical Handover

## Runtime boundary
This handover covers the isolated Vivit Group implementation on branch `feat/vivit-group-erp-7d` and isolated Supabase project `yhsbywixfkofydbeflop`. Vercel is outside scope. Existing Marketing remains untouched until the separately approved final integration change.

## Architecture
- Shared `vgroup` layer: business units, users, employees, RBAC, permission overrides, audit, archive/restore, notifications, central ledger and group controls.
- `hospitality` domain: owners, properties, reservations, channels, finance, owner statements/payouts/refunds/deposits, maintenance, procurement, inventory, contracts and operational controls.
- `tech` domain: clients/projects, phases/scope/checklists/files, billing/installments, change requests, time-price controls, SaaS subscriptions, milestones/dependencies/risks/SLA and delivery acceptance.

## Security model
- Server-side session validation against isolated Supabase Auth.
- Business-unit and permission guards on protected routes/actions.
- OWNER and TECH_CLIENT portal scoping by mapped user/client ownership.
- Direct anon/authenticated database access denied for server-owned sensitive tables.
- Sensitive database functions are not publicly executable.
- Login rate limiting, access/refresh cookie lifecycle and request-id API error contracts are included.

## Data integrity
- Active reservation overlap protection.
- Atomic CR approval/pricing lifecycle controls.
- Installment overpayment prevention.
- Inventory negative-stock prevention.
- Ledger/refund/payout idempotency controls.
- Owner payout/statement safeguards and centralized ledger source of truth.

## Operations
- Backup/restore evidence: `docs/vivit-group/BACKUP-RESTORE-EVIDENCE.md`.
- Release/rollback procedure: `docs/vivit-group/RELEASE-RUNBOOK.md`.
- Pre-integration QA evidence: `docs/vivit-group/PRE-INTEGRATION-QA-EVIDENCE.md`.
- CTO acceptance contract: `docs/vivit-group/PRE-INTEGRATION-CTO-ACCEPTANCE.md`.

## Known external dependencies
Real third-party channel/payment integrations require provider credentials, webhook secrets and provider-side configuration. No fake external connectivity is treated as complete.

## Final controlled change
Marketing integration is intentionally last. After that change, run the post-integration validation matrix before final project closure.
