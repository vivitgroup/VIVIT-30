# Vivit Group ERP — Pre-Integration Release Notes

## Candidate scope
Feature-complete isolated Group implementation for Hospitality + Technology plus shared Group services. Marketing remains the existing system and is not integrated by this candidate.

## Shared platform
- Group SSO/session foundation and business selector.
- Business-unit aware RBAC and permission overrides.
- Employee lifecycle, audit, archive/restore and notifications.
- Central group ledger, reconciliation and intercompany controls.
- Group finance dashboard and operational acceptance gates.

## Hospitality
- Owners/properties/reservations and overlap integrity.
- Owner portal, statements, deposits, refunds and payouts.
- Invoices/finance, maintenance/work orders, purchase orders and inventory.
- Cancellation/incident and operational business controls.

## Technology
- Projects, client portal, scope/phases/checklists/files and progress.
- Billing/installments and change-request lifecycle.
- Time-to-price selection/compression controls.
- SaaS plans/subscriptions/invoice generation.
- Milestones, dependencies, risks, SLA incidents and delivery acceptance.

## Quality and security
- Dependency security gate.
- Isolation, RBAC and portal isolation regressions.
- Auth lifecycle and API error contract regressions.
- Responsive shell checks.
- Backup/restore drill and database reconciliation evidence.
- Supabase security/performance remediation performed during implementation.

## Deferred by design
- Marketing integration: final controlled change only.
- Provider-backed channel/payment connectivity where external credentials/configuration are required.
- Vercel: explicitly excluded from delivery scope.
