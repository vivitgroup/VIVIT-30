# Vivit Group ERP — Final Acceptance Checklist

## Pre-integration closure
- [x] Isolated Group database only.
- [x] Vercel excluded from scope.
- [x] Backup/restore drill PASS.
- [x] Database reconciliation PASS.
- [x] Security/RBAC/portal isolation contracts implemented.
- [x] Auth lifecycle and API error contracts implemented.
- [x] Responsive Group/Hospitality/Tech shell checks implemented.
- [x] Release/rollback runbook documented.
- [x] Technical handover documented.
- [x] Pre-integration release notes documented.
- [ ] Latest exact-head CTO Foundation PASS after this handover package.

## Final controlled implementation task
- [ ] Execute Marketing integration only after explicit approval.

## Mandatory post-integration validation
These are verification activities, not new feature scope:
- [ ] Business Selector exposes Marketing/Hospitality/Tech according to access.
- [ ] Marketing existing critical flows remain operational.
- [ ] Group SSO/session and logout/refresh remain valid.
- [ ] Cross-business permission isolation remains intact.
- [ ] OWNER and TECH_CLIENT isolation remain intact.
- [ ] Group finance/ledger linkage reconciles without duplicate posting.
- [ ] No Group migration unintentionally mutates Marketing-owned schema/data.
- [ ] Backup/rollback checkpoint captured for the integrated candidate.
- [ ] Exact-head CTO regression PASS on integrated SHA.
- [ ] Final CTO acceptance recorded.

## Closure rule
Project implementation is 146/146 only after controlled Marketing integration. Project delivery is closed only after the mandatory post-integration validation above is green.
