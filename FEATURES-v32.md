# VIVIT ERP v32 — Production UX & Security

1. Notifications: realtime inbox, priorities, account-request alerts, task and finance alerts.
2. Audit trail: user/action/entity/time/change tracking, including account reviews, password resets, files and backups.
3. Account approval: requested role, pending state, Super Admin role adjustment, approve/reject reason.
4. Password recovery: secure one-time SHA-256 token, 30-minute expiry, bcrypt password replacement.
5. Permissions: built-in permission matrix, custom workspace roles and protected server actions.
6. Client ownership: Account Managers and Media Buyers only see their assigned client data.
7. Creative workflow: brief, assignment, production, review, revision, approval and completion.
8. Secure files: private Supabase Storage bucket, signed 15-minute links and 15 MB upload limit.
9. Role dashboards: role-specific home routes, KPIs and navigation.
10. Global search: permission-aware clients, tasks, leads and contacts search.
11. Workspace settings: branding, currency, timezone, services, integrations and access management.
12. Security: auth guards, CSRF/origin validation, protected server actions, rate limits and security headers.
13. Backup/export: permission-aware CSV/JSON exports and Super Admin full workspace backup.
14. Arabic/English: persistent language toggle, RTL layout support and mobile bottom navigation.

## Media Buying Control Center

- Official API-ready connectors for Meta, TikTok, Google Ads, Snapchat and LinkedIn.
- Campaign URL parsing and Campaign ID extraction.
- Campaign targets, daily performance, budget pacing, CPL/ROAS and qualified-lead quality.
- Smart performance alerts, tracking health, media plans/approvals and decision log.
- Unified metric model so every platform is compared consistently.

## Deployment order

1. Run `scripts/account-approval-migration.sql` in Supabase SQL Editor.
2. Confirm Vercel variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AUTH_SECRET`, `NEXTAUTH_URL`.
3. Optional email recovery variables: `RESEND_API_KEY`, `EMAIL_FROM`.
4. Deploy to Vercel.
5. Test signup → approval → login, password reset, file upload and backup.
