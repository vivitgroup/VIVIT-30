# Vivit Group ERP — Business Logic Expansion Policy

Status: ACTIVE for the isolated `feat/vivit-group-erp-7d` program.

## Authorization
Business-logic additions may be implemented proactively when they materially improve correctness, operability, auditability, financial control, customer/owner experience, failure handling, or tenant/business-unit isolation.

## Automatically in-scope
- Missing domain invariants and database constraints.
- Approval workflows and segregation-of-duties controls.
- Idempotency, retry safety, reconciliation and failure recovery.
- Finance precision, deposits, refunds, payouts, overdue states and reconciliation.
- Operational workflows that prevent manual side channels.
- Project risk, dependency, milestone and SLA management.
- Notifications, audit trails, archival/restore, escalation and exception handling.
- UX/API additions required to expose approved business flows safely.
- Tests and telemetry needed to certify the above.

## Guardrails
1. Existing Vivit Marketing production remains untouched until Final Integration Gate.
2. No reuse of Marketing production write credentials, storage namespaces or OAuth callbacks.
3. New behavior must be default-deny and permission-checked server-side.
4. Financial mutations must be atomic and idempotent where retries are possible.
5. Any irreversible production action, paid third-party commitment, or external legal/commercial commitment still requires explicit approval.
6. Every proactive addition must be included in CTO audit/regression scope.

## Current proactive additions
### Hospitality
- Security deposits with hold/release/forfeit states.
- Reservation refunds with approval and idempotency support.
- Owner payout records linked to owner statements and guarded against overpayment.

### Technology
- Project milestones.
- Cross-project/milestone dependencies.
- Risk register with probability × impact scoring.
- SLA rules and SLA incident tracking.

These additions extend the master scope without reducing any previously committed feature.