# Crypto Portfolio Tracker — Technical Stack & Architecture

**Version:** 2.0
**Date:** 2026-09-16
**Related:** [PRD.md](./PRD.md)

Superseded Cloudflare design: see git history / [docs/MIGRATION_SUPABASE.md](./MIGRATION_SUPABASE.md).

---

## 1. Summary

The application runs as a single Node.js server deployed on Railway. One process (Hono) serves the
React single-page app as static files with SPA fallback and provides the API, scheduled jobs, and
push notifications on the same origin. Data lives in a Supabase Postgres database via Drizzle ORM,
and Supabase Auth (Google provider) handles authentication; the server verifies the Supabase-issued
JWT on each request. An in-memory cache (single process) holds market prices and FX rates.

Planning decisions that refine this document are listed at the top of [WORK_PLAN.md](./WORK_PLAN.md) and take precedence.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | React 19 + TypeScript | Mature, large ecosystem, good PWA support |
| Build tool | Vite | Fast builds, output served as static files by the Node server |
| Styling | Tailwind CSS | Rapid responsive UI, easy RTL via logical properties |
| UI components | Hand-written on Tailwind + native HTML controls | Fewer dependencies; native `<select>`, `<dialog>`, date inputs work best on a phone |
| Charts | Recharts | Simple line and pie charts, responsive, RTL-tolerant |
| i18n | react-i18next | Standard, supports Arabic and `dir="rtl"` switching |
| PWA | vite-plugin-pwa | Service worker, manifest, installability |
| Data fetching | TanStack Query | Caching, polling, refetch-on-focus for cross-device sync |
| Runtime | Node.js 24 via `@hono/node-server` | Single long-running process, no platform lock-in |
| API framework | Hono | Small, fast, typed routes, works the same on Node as on Workers |
| Database | Supabase Postgres | Managed Postgres, generous free tier, pairs with Supabase Auth |
| ORM | Drizzle ORM (`pg-core`, `postgres.js`) | Type-safe, SQL migrations, works against any Postgres |
| Auth | Supabase Auth (Google provider) | Hosted OAuth flow, issues a JWT the API verifies with `jose`; no auth tables in the app database |
| Cache | In-memory `MemoryCache` (single process) | Same `get`/`put`/`delete` shape as the earlier cache, no extra service |
| Scheduled jobs | `node-cron` in the same process | Price refresh, alert checks, portfolio snapshots, FX refresh |
| Push notifications | Web Push (VAPID) via `web-push` (Node) | Native PWA push on mobile and desktop |
| Market data | CoinGecko API (free tier) | Coin list, search, prices, 24h change |
| FX rates | open.er-api.com | Free, no key, covers USD/EUR/SAR/TRY (Frankfurter lacks SAR) |
| Deployment | Railway (deploy from GitHub) | Nixpacks build, pre-deploy migration, single service, ~$5/month |

## 3. Architecture

```
+----------------------+        +-----------------------------+
|  Browser / PWA       |  HTTPS |  Railway service (Node 24)  |
|  React + Vite        |<------>|  Hono API   /api/*          |
|  (static SPA)        |        |  static SPA apps/web/dist   |
+----------------------+        +------+----------+-----------+
         ^                             |          |
         | Web Push                    v          v
         |                        +--------+  +--------+
         |                        |Supabase|  | in-mem |
         +------------------------+Postgres|  | cache  |
                                   |(Drizzle)| | prices |
                                   +--------+  +--------+
                                       ^
                                       |
                          +------------+-------------+
                          |  node-cron (in process)  |
                          |  every 1 min: prices     |
                          |  every 1 min: alerts     |
                          |  every 1 hour: snapshot  |
                          |  every 6 hours: FX rates |
                          +------------+-------------+
                                       |
                                       v
                          +--------------------------+
                          |  CoinGecko / FX API      |
                          +--------------------------+

  Supabase Auth (Google) issues a JWT the API verifies on every request (jose, JWKS).
```

**Request flow:**
1. Browser loads the SPA, served as static files by the Node server with SPA fallback.
2. SPA calls `/api/*` on the same origin, sending `Authorization: Bearer <access_token>` from the
   Supabase client session.
3. The server verifies the JWT (`jose`, Supabase JWKS or the legacy HS256 secret), reads/writes
   Postgres, reads prices from the in-memory cache.
4. `node-cron` jobs run on schedule in the same process: fetch prices into the cache, evaluate
   alerts, write snapshots to Postgres, send Web Push.

**Sync strategy:**
- No websockets. TanStack Query refetches on window focus and polls the dashboard every 60 seconds.
- All writes go through the API, so every device reads the same Postgres state.

## 4. Project Structure (monorepo)

```
crypto-tracker/
+-- docs/
|   +-- PRD.md
|   +-- TECH_STACK.md
|   +-- DEPLOY.md
|   +-- MIGRATION_SUPABASE.md
+-- apps/
|   +-- web/                    # React SPA (built to dist/, served by the Node server)
|   |   +-- public/
|   |   +-- src/
|   |   |   +-- components/
|   |   |   +-- features/       # transactions, dashboard, prices, alerts, settings
|   |   |   +-- hooks/
|   |   |   +-- i18n/           # en.json, ar.json
|   |   |   +-- lib/            # api client, supabase client, formatters
|   |   |   +-- app/            # shell, auth, routes, settings provider
|   |   |   +-- main.tsx
|   |   +-- index.html
|   |   +-- vite.config.ts
|   |   +-- package.json
|   +-- api/                    # Node server (Hono)
|       +-- src/
|       |   +-- routes/         # me, transactions, prices, coins, portfolio, alerts, push
|       |   +-- services/       # coingecko, fx, cache, push, portfolio math
|       |   +-- db/             # drizzle schema, postgres.js client
|       |   +-- auth/           # Supabase JWT verification
|       |   +-- cron/           # scheduled handlers (node-cron)
|       |   +-- server.ts       # entry point: node-server + static SPA + cron
|       |   +-- index.ts
|       +-- drizzle/            # generated SQL migrations
|       +-- scripts/            # generate-vapid-keys.mjs
|       +-- package.json
+-- packages/
|   +-- shared/                 # types, validation schemas (zod), constants
+-- package.json                # workspaces root
+-- pnpm-workspace.yaml
+-- railway.json
```

## 5. Database Schema (Supabase Postgres)

```sql
settings            (user_id text PK, language, base_currency, large_text, theme,
                     alerts_enabled, chart_prefs_json, updated_at)
transactions        (id, user_id text, type, coin_id, coin_symbol, coin_name, quantity,
                     price_per_unit, currency, price_per_unit_usd, fee, fee_usd,
                     occurred_at, note, created_at, updated_at)
alerts              (id, user_id text, coin_id, coin_symbol, coin_name, target_price_usd,
                     direction, enabled, triggered_at, created_at)
push_subscriptions  (id, user_id text, endpoint, p256dh, auth, created_at)
portfolio_snapshots (id, user_id text, taken_at, total_value_usd, invested_usd)
```

`user_id` stores the Supabase `auth.users.id` (uuid) as text; there is no foreign key across
schemas, and no `user`/`session`/`account`/`verification` tables in the app database — Supabase
Auth owns those. Prices and FX rates are not stored in Postgres; they live in the in-memory cache
with a short TTL. Snapshots and all portfolio math are in USD; the client converts to the base
currency at display time.

Row Level Security is enabled on every table with a per-user policy (`user_id = auth.uid()::text`, role `authenticated`); the API bypasses it as table owner, so RLS only protects direct access through Supabase's REST API with the public anon key.

## 6. API Endpoints

```
GET    /api/health                     Health check (used by the Railway health check)
GET    /api/me                         Current user + settings (bearer JWT)
PUT    /api/settings                   Update settings

GET    /api/transactions               List (filter: coin, type)
POST   /api/transactions               Create
PUT    /api/transactions/:id           Update
DELETE /api/transactions/:id           Delete
POST   /api/transactions/import        CSV import (preview + commit)

GET    /api/portfolio                  Holdings, totals, P/L (average cost)
GET    /api/portfolio/history          Snapshots for line chart

GET    /api/prices?ids=btc,eth         Current prices from the in-memory cache
GET    /api/coins/search?q=            Coin search (CoinGecko, cached)

GET    /api/alerts                     List
POST   /api/alerts                     Create
PUT    /api/alerts/:id                 Update / re-enable
DELETE /api/alerts/:id                 Delete
POST   /api/push/subscribe             Save Web Push subscription
```

Authentication itself is handled by Supabase Auth in the browser (`@supabase/supabase-js`); the
API has no `/api/auth/*` routes, only JWT verification middleware.

## 7. Scheduled Jobs (node-cron)

| Schedule | Job | Detail |
|---|---|---|
| `* * * * *` | Refresh prices | Collect distinct coin ids across all holdings and alerts, fetch from CoinGecko, write to the in-memory cache with 120s TTL |
| `* * * * *` | Check alerts | Compare enabled alerts against cached prices, send Web Push, set `triggered_at` |
| `0 * * * *` | Portfolio snapshot | Compute total value per user, insert into `portfolio_snapshots` |
| `0 */6 * * *` | Refresh FX rates | Fetch USD to EUR/SAR/TRY from open.er-api.com, write to the in-memory cache |

All jobs run inside the same Node process as the API, registered in `apps/api/src/cron/index.ts`.

## 8. Cost

- Railway: one service, Hobby plan, roughly $5/month at single-user scale (usage-based, well under
  the plan's included resources).
- Supabase: free tier covers the database and Auth at this scale (500MB database, 50k monthly
  active users).
- CoinGecko free tier: about 30 calls/min, well above the 1 call/min needed.
- FX rates (open.er-api.com): free, no key required.

## 9. Local Development

- `pnpm dev` runs the Vite dev server (port 5173, proxying `/api/*`) and `tsx watch src/server.ts`
  (port 8787) in parallel.
- `apps/api/.env` and `apps/web/.env.local` point at a real Supabase project; there is no local
  emulator for Postgres or Auth.
- Google sign-in requires `http://localhost:5173` to be listed in Supabase Auth → URL Configuration
  → Redirect URLs.

## 10. Deployment

- `pnpm build` builds the SPA to `apps/web/dist` and type-checks `packages/shared` and `apps/api`.
- Railway builds and deploys from the GitHub repo on every push to `main`, per `railway.json`:
  build with Nixpacks, run the pre-deploy migration
  (`pnpm --filter @crypto-tracker/api db:migrate`), then start
  (`pnpm --filter @crypto-tracker/api start`).
- See [DEPLOY.md](./DEPLOY.md) for the full setup guide.
