# VIVIT ERP v30 — Vercel deployment

## 1. Create the database

Create a Supabase project, then run `scripts/migration.sql` in the Supabase SQL Editor.

## 2. Add Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add the required values from `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL` (Supabase transaction pooler, port 6543)
- `DRIZZLE_DATABASE_URL` (direct database connection)
- `AUTH_SECRET` (at least 32 random characters)
- `NEXTAUTH_URL` (the final `https://...vercel.app` or custom-domain URL)
- `CRON_SECRET` (a random secret; Vercel uses it for cron authorization)

Optional integrations are documented in `.env.example` and can be added later without blocking the core ERP.

## 3. Seed the initial accounts

Run once from a trusted local machine with the production variables loaded:

```bash
npm install
npm run db:push
npm run seed
```

Change the demo passwords immediately after the first successful login.

## 4. Deploy

Upload this folder to GitHub and import it into Vercel, or run `vercel --prod` from the project root. The included `vercel.json` configures the framework, region, functions, and scheduled jobs.

## Production checklist

- Set every required environment variable for **Production**.
- Confirm `/api/health` reports `healthy` after deployment.
- Confirm login and all role redirects.
- Keep `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `AUTH_SECRET`, and `CRON_SECRET` server-only.
- Replace demo users/passwords before inviting the team.
