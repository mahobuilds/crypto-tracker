# Deployment Guide

This guide sets up a production Supabase project and a Railway service for the app, then covers
day-to-day updates. Run all commands from the repository root unless a step says otherwise.
Steps scoped to the API package use `pnpm --filter @crypto-tracker/api <script>`, which runs them
from the root without changing directory.

## Prerequisites

- Node.js 24 and pnpm 12 installed (`npm i -g pnpm`).
- A [Supabase](https://supabase.com) account (free tier is enough).
- A [Railway](https://railway.com) account, connected to the GitHub repository
  [`mahobuilds/crypto-tracker`](https://github.com/mahobuilds/crypto-tracker).
- A Google Cloud project (for the OAuth client used by Supabase Auth).

## 1. Supabase project

1. Create a new Supabase project. Wait for it to finish provisioning.
2. Project Settings → API: copy the **Project URL** (`SUPABASE_URL`) and the **anon / publishable
   key** (`SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`).
3. Project Settings → Database → Connection string → URI: copy the **pooler** connection string
   (Session pooler, port 5432, or Transaction pooler, port 6543). This becomes `DATABASE_URL`. Do
   not use the direct (non-pooler) host; see Troubleshooting.
4. Authentication → Providers → Google: enable the provider. In
   [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials →
   Create Credentials → OAuth client ID → Application type **Web application**, set the authorized
   redirect URI to the one Supabase shows on the Google provider page:
   `https://<project-ref>.supabase.co/auth/v1/callback`. Copy the generated Client ID and Client
   Secret back into the Supabase Google provider settings and save.
5. Authentication → URL Configuration: set **Site URL** to the Railway origin you will deploy to
   (see step 3 below; you can come back and set this after the first deploy). Add both the Railway
   origin and `http://localhost:5173` to **Redirect URLs**.

Verify: Authentication → Providers shows Google as enabled, and Project Settings → API shows a
Project URL and anon key.

## 2. Local run

1. Copy the env templates and fill in the Supabase values from step 1:

   ```sh
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

   Generate VAPID keys for `apps/api/.env` with:

   ```sh
   node apps/api/scripts/generate-vapid-keys.mjs
   ```

2. Install dependencies and apply migrations:

   ```sh
   pnpm install
   pnpm --filter @crypto-tracker/api db:migrate
   ```

3. Start the app:

   ```sh
   pnpm dev
   ```

   This runs the API on `http://localhost:8787` and the web app on `http://localhost:5173` (the
   Vite dev server proxies `/api/*` to the API). Sign in with the same Google account configured in
   Supabase Auth.

Verify: `http://localhost:5173` loads the sign-in page, and Google sign-in redirects into the
dashboard.

## 3. Railway

1. In Railway, create a new project → **Deploy from GitHub repo** → select
   `mahobuilds/crypto-tracker`. Railway detects Node via Nixpacks (Node 24, pnpm from the
   `packageManager` field in the root `package.json`).
2. The build command, pre-deploy command, start command, and health check path all come from
   `railway.json` at the repo root — nothing to configure manually:
   - Build: `pnpm install --frozen-lockfile && pnpm build`
   - Pre-deploy: `pnpm --filter @crypto-tracker/api db:migrate`
   - Start: `pnpm --filter @crypto-tracker/api start`
   - Health check: `/api/health`
3. Set the service variables (Railway → your service → Variables). `PORT` is injected by Railway
   automatically — do not set it.

   | Variable                 | Value                                                            |
   | ------------------------- | ----------------------------------------------------------------- |
   | `APP_ORIGIN`               | `http://localhost:5173` for the first deploy; update after step 4 |
   | `DATABASE_URL`             | Supabase pooler connection string (section 1, step 3)             |
   | `SUPABASE_URL`             | Supabase Project URL (section 1, step 2)                          |
   | `SUPABASE_JWT_SECRET`      | leave unset unless the project uses the legacy HS256 JWT secret   |
   | `VAPID_PUBLIC_KEY`         | from `generate-vapid-keys.mjs`                                    |
   | `VAPID_PRIVATE_KEY`        | from `generate-vapid-keys.mjs`                                    |
   | `VAPID_SUBJECT`            | a `mailto:` or `https:` contact URL                                |
   | `VITE_SUPABASE_URL`        | Supabase Project URL (build-time, used by the SPA)                |
   | `VITE_SUPABASE_ANON_KEY`   | Supabase anon key (build-time, used by the SPA)                   |

4. Deploy. Railway builds, runs the pre-deploy migration, then starts the service. Note the
   generated domain (Settings → Networking → Public Networking, something like
   `https://crypto-tracker-production.up.railway.app`).
5. Set `APP_ORIGIN` (Railway variable) and Supabase Auth **Site URL** (Authentication → URL
   Configuration) to that exact origin. Add it to Supabase **Redirect URLs** too, alongside
   `http://localhost:5173`. Redeploy the Railway service so it picks up the new `APP_ORIGIN`.

Verify: the Railway deployment logs show a successful build, pre-deploy migration, and a passing
health check.

## 4. Verify

```sh
curl https://<railway-domain>/api/health
```

should return a success response. Then:

- Open `https://<railway-domain>` in a browser and sign in with Google; a successful sign-in
  redirects into the app and shows the dashboard.
- Add a transaction and confirm it appears in the holdings table.
- Wait about a minute and check the Railway deploy logs for the price-refresh cron job output,
  confirming prices populate on the dashboard.

## 5. Updating

To ship a new version, push to `main`:

```sh
git push origin main
```

Railway redeploys automatically on every push to `main`, running the same build, pre-deploy
migration, and start sequence from `railway.json`. No manual steps are needed. If a change
includes a schema migration, generate it locally first with
`pnpm --filter @crypto-tracker/api db:generate` (after editing `apps/api/src/db/schema.ts`) and
commit the generated files in `apps/api/drizzle/` — the pre-deploy command applies them before the
new version starts.

## Troubleshooting

| Symptom                                                | Likely cause                                                                                       | Fix                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Google sign-in fails with a redirect mismatch             | The redirect URI in Google Cloud Console does not match `https://<project-ref>.supabase.co/auth/v1/callback`, or the Supabase Site URL / Redirect URLs do not include the exact Railway origin | Fix the redirect URI in Google Cloud Console, and set Supabase Auth Site URL and Redirect URLs to the exact Railway origin (scheme, host, no trailing slash) |
| `GET /api/me` returns 401                                  | JWT verification mismatch — the project uses the legacy HS256 secret but `SUPABASE_JWT_SECRET` is unset, or the client sent a stale/expired access token | Set `SUPABASE_JWT_SECRET` from Supabase Project Settings → API → JWT Secret if the project predates JWKS, otherwise leave it unset and confirm the client refreshes the Supabase session before calling the API |
| `ENETUNREACH` connecting to the database                   | `DATABASE_URL` points at the direct (non-pooler) host, which is IPv6-only and unreachable from the deploy environment | Use the Supabase pooler connection string (Session pooler port 5432 or Transaction pooler port 6543), not the direct host              |
| Prices are empty on the dashboard                          | The price refresh cron has not run yet, or CoinGecko is unreachable                                    | Wait up to one minute after deploy for the cron job to populate the in-memory cache; check the Railway deploy logs for errors from the price refresh job |
| Push notifications never arrive                            | VAPID keys missing/mismatched, or the user never granted browser notification permission               | Confirm `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are set as Railway variables and match the key pair used in the browser subscription, and that the push permission prompt was accepted |
