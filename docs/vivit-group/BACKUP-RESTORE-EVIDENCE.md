# Vivit Group ERP — Backup / Restore Evidence

Status: PASS
Environment: isolated Supabase project `yhsbywixfkofydbeflop` only.
Marketing production was not queried, mutated, migrated, restored or otherwise involved.

## Rehearsal method
A transaction-scoped restore rehearsal was executed against representative Group datasets. Source values were copied into temporary restore targets, parity was checked, and the transaction was rolled back so the live isolated dataset was unchanged.

## Parity results
- `vgroup.business_units`: source 3 / restored 3 — PASS.
- `vgroup.permissions`: source 108 / restored 108 — PASS.
- `vgroup.roles`: source 10 / restored 10 — PASS.
- `vgroup.ledger_transactions`: source count/amount matched restored count/amount — PASS.
- `hospitality.reservations`: source count/amount matched restored count/amount — PASS.
- `tech.projects`: source count/amount matched restored count/amount — PASS.

## Post-rollback structural verification
- Business units: 3.
- Roles: 10.
- Permissions: 108.
- Role-permission mappings: 227.
- Hospitality tables: 19.
- Tech tables: 21.
- Shared `vgroup` tables: 16.
- Reservation overlap guard present: PASS.
- Atomic Tech change-request approval function present: PASS.
- SaaS due-invoice generation function present: PASS.

## Recovery rule
For production-grade recovery after the final integration, capture a fresh integrated checkpoint before any destructive change. Prefer forward-fix migrations; use restore only for integrity-impacting failures, followed by exact-head CTO regression and data reconciliation.
