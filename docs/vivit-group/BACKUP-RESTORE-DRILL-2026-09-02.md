# Vivit Group ERP — Isolated Backup/Restore Drill Evidence

Date: 2026-09-02
Scope: isolated Supabase project `vivit-group-erp` only. No Marketing production resource and no hosting platform was touched.

## Drill method
A transaction-scoped logical restore rehearsal was executed inside the isolated Supabase database. Critical shared, Hospitality, Tech and finance datasets were copied into temporary snapshot tables, then restored into separate temporary restore tables and compared for row-count and financial-amount parity. The full transaction was rolled back so the drill left no persistent test data or schema objects.

## Parity results
- business_units: source 3 / restored 3 — PASS
- roles: source 10 / restored 10 — PASS
- permissions: source 108 / restored 108 — PASS
- ledger_transactions: source 0 / restored 0, amount 0 / 0 — PASS
- hospitality.reservations: source 0 / restored 0, net owner amount 0 / 0 — PASS
- tech.projects: source 0 / restored 0, current price 0 / 0 — PASS

## Structural integrity snapshot after rollback
- Business units: 3
- Roles: 10
- Permissions: 108
- Role-permission mappings: 227
- Hospitality base tables: 19
- Tech base tables: 21
- Shared VGroup base tables: 16
- Reservation active-overlap exclusion constraint: present
- Atomic Change Request approval function: present
- SaaS recurring invoice generator: present

## Acceptance
The rehearsal demonstrated transaction-safe logical backup/restore parity for the current isolated candidate state and confirmed that rollback preserved the source database. Because operational tables are currently empty, this drill validates structure, seeded RBAC data, critical controls and zero-row restore behavior; a populated-data restore rehearsal should be repeated before any future destructive migration on live Group data.

Result: PASS — suitable for pre-integration CTO acceptance of the current isolated build.