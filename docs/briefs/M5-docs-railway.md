# Task M5: Documentation and Railway configuration for the Supabase stack

## Goal

Rewrite the deployment docs and tech-stack summary for the new architecture (one Node server on Railway, Supabase Postgres + Auth), and add the Railway config so "deploy from GitHub" works with a pre-deploy migration.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/MIGRATION_SUPABASE.md` (binding), current `README.md`, `docs/DEPLOY.md`, `docs/TECH_STACK.md`, `apps/api/package.json` (scripts: `dev`, `start`, `db:generate`, `db:migrate`), `apps/api/.env.example`, `apps/web/.env.example`, root `package.json`.
- Facts: Railway builds from the repo root with Nixpacks (Node 24, pnpm via `packageManager` field). Build command `pnpm install --frozen-lockfile && pnpm build`. Pre-deploy command `pnpm --filter @crypto-tracker/api db:migrate`. Start command `pnpm --filter @crypto-tracker/api start`. Variables: everything in `apps/api/.env.example` plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (build-time for the SPA). `PORT` is injected by Railway. Health check path `/api/health`. Supabase Auth → URL Configuration: Site URL = Railway origin; Redirect URLs include the Railway origin and `http://localhost:5173`. Google provider redirect URI (in Google Cloud Console) is `https://<project-ref>.supabase.co/auth/v1/callback`.
- GitHub repo: `https://github.com/mahobuilds/crypto-tracker` (owner will push).

## Parallel work warning

Code workers are editing `apps/**`. You touch documentation and `railway.json` only. No installs.

## Files you own

- `README.md`, `docs/DEPLOY.md`, `docs/TECH_STACK.md`, `railway.json` (new)

## Steps

1. `railway.json`: `{ "$schema": "https://railway.com/railway.schema.json", "build": { "builder": "NIXPACKS", "buildCommand": "pnpm install --frozen-lockfile && pnpm build" }, "deploy": { "preDeployCommand": ["pnpm --filter @crypto-tracker/api db:migrate"], "startCommand": "pnpm --filter @crypto-tracker/api start", "healthcheckPath": "/api/health", "restartPolicyType": "ON_FAILURE" } }` — check the current Railway schema field names by fetching `https://railway.com/railway.schema.json` if reachable; otherwise use the above.
2. `docs/DEPLOY.md`: replace entirely. Sections: Prerequisites; 1 Supabase project (create, get URL/anon key/pooler connection string, enable Google provider with the Google Cloud OAuth client, URL configuration); 2 Local run (`.env` files, `pnpm install`, `pnpm --filter @crypto-tracker/api db:migrate`, `pnpm dev`); 3 Railway (new project from GitHub repo, variables table, pre-deploy/start commands come from `railway.json`, first deploy, note the generated domain, set `APP_ORIGIN` and Supabase Site URL to it, redeploy); 4 Verify (`/api/health`, sign in, add a transaction, wait a minute for the cron log); 5 Updating; 6 Troubleshooting table (Google redirect mismatch, 401 on `/api/me` with JWKS vs legacy secret, `ENETUNREACH` on IPv6 direct host → use pooler, empty prices, push not arriving).
3. `docs/TECH_STACK.md`: update summary paragraph, stack table rows (runtime, database, auth, cache, cron, push, deployment), architecture diagram, project structure (`server.ts`, no `wrangler.jsonc`), schema list (five tables), scheduled jobs section (node-cron), cost section (Railway ~$5/month, Supabase free tier). Add a one-line "Superseded Cloudflare design: see git history / docs/MIGRATION_SUPABASE.md".
4. `README.md`: update stack table, getting started (env files, migrate, dev), remove the seed-session section (Supabase Auth now; local sign-in uses real Google), link DEPLOY.md and MIGRATION_SUPABASE.md.

## Constraints

- Plain precise English, no emoji. No commits, pushes, installs.

## Acceptance criteria

- [ ] `pnpm exec prettier --check README.md railway.json` exits 0 (docs/*.md are prettier-ignored).
- [ ] No mention of wrangler, D1, KV, Cloudflare Workers, or Better Auth remains in README.md, DEPLOY.md, TECH_STACK.md except the single superseded-design line.
- [ ] Every command in DEPLOY.md exists in a `package.json` script.

## Verification commands to run before reporting

```
pnpm exec prettier --check README.md railway.json
grep -rniE "wrangler|\bD1\b|\bKV\b|better-auth|better auth|cloudflare" README.md docs/DEPLOY.md docs/TECH_STACK.md
git status --short
```

## Report

Format from your agent instructions.
