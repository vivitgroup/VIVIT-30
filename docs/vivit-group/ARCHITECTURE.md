# Vivit Group ERP — Architecture Baseline

## Product shape
One Vivit Group platform with three business-unit contexts:
- `marketing`
- `hospitality`
- `tech`

The existing Vivit Marketing ERP remains untouched and outside this branch's runtime/deployment until the final integration stage.

## Shared layer
Built once and reused by Hospitality and Tech now, with Marketing adapter/integration later:
- Group SSO/session context
- users
- employees
- business-unit membership
- roles
- granular permissions
- archive/restore
- audit log
- notifications
- finance/ledger contract

## Hospitality bounded context
- owners
- properties
- unit assets
- channel connections
- reservations
- expense categories
- vendors
- invoices
- work orders
- purchase orders
- inventory
- ledger transactions
- owner statements
- contracts

## Tech bounded context
- tech clients
- projects
- project phases
- scope items
- checklist items
- project updates
- project files
- payment installments
- duration/price options
- change requests
- SaaS plans/subscriptions

## Core invariants
1. Every business-owned record is scoped to a business unit or to a parent entity that is business-unit scoped.
2. Cross-business access is denied by default.
3. Client/owner portal users only read records explicitly scoped to their identity.
4. Sensitive entities use soft archive by default; permanent delete is Super Admin-only and separately confirmed.
5. Financial screens read from the central ledger contract; no screen invents its own financial truth.
6. Every approval, archive, restore, permission mutation and finance-sensitive mutation is auditable.
7. Hospitality/Tech development credentials must never equal or fall back to current Marketing production credentials.
8. No merge/promotion to current Marketing production until Stage 18 final integration certification.

## Delivery order
1. Isolation + contracts
2. Group auth/shell
3. Shared permissions/archive/notifications
4. Hospitality core + portal
5. Tech core + portal
6. Change Requests + time/price
7. SaaS
8. Group finance
9. Hardening
10. Final Marketing integration
