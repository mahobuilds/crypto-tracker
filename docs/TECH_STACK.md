# Crypto Portfolio Tracker — Technical Stack & Architecture

**Version:** 1.0
**Date:** 2026-09-14
**Related:** [PRD.md](./PRD.md)

---

## 1. Summary

The application runs entirely on Cloudflare. A single Cloudflare Worker serves the React single-page app through Workers Static Assets and provides the API, authentication, scheduled jobs, and push notifications on the same origin. Data lives in Cloudflare D1, with Workers KV used as a cache for market prices and FX rates.

Planning decisions that refine this document are listed at the top of [WORK_PLAN.md](./WORK_PLAN.md) and take precedence.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | React 19 + TypeScript | Mature, large ecosystem, good PWA support |
| Build tool | Vite | Fast builds, output served as Workers Static Assets |
| Styling | Tailwind CSS | Rapid responsive UI, easy RTL via logical properties |
| UI components | Hand-written on Tailwind + native HTML controls | Fewer dependencies; native `<select>`, `<dialog>`, date inputs work best on a phone |
| Charts | Recharts | Simple line and pie charts, responsive, RTL-tolerant |
| i18n | react-i18next | Standard, supports Arabic and `dir="rtl"` switching |
| PWA | vite-plugin-pwa | Service worker, manifest, installability |
| Data fetching | TanStack Query | Caching, polling, refetch-on-focus for cross-device sync |
| Backend runtime | Cloudflare Workers | Edge, no cold starts, generous free tier |
| API framework | Hono | Small, fast, built for Workers, typed routes |
| Database | Cloudflare D1 (SQLite) | Serverless SQL, sufficient for single-user scale |
| ORM | Drizzle ORM | Type-safe, D1 driver, migration tooling |
| Auth | Better Auth (Google provider) | Runs on Workers, sessions in D1, minimal setup |
| Cache | Workers KV | Store latest prices and FX rates to limit upstream API calls |
| Scheduled jobs | Cloudflare Cron Triggers | Price refresh, alert checks, portfolio snapshots |
| Push notifications | Web Push (VAPID) from Worker | Native PWA push on mobile and desktop |
| Market data | CoinGecko API (free tier) | Coin list, search, prices, 24h change |
| FX rates | open.er-api.com | Free, no key, covers USD/EUR/SAR/TRY (Frankfurter lacks SAR) |
| Deployment | Wrangler CLI | Deploys the Worker with static assets, manages D1/KV bindings |

## 3. Architecture

```
+----------------------+        +-----------------------------+
|  Browser / PWA       |  HTTPS |  Cloudflare Worker (Hono)   |
|  React + Vite        |<------>|  /api/*                     |
|  (static assets)     |        |  Auth, transactions,        |
+----------------------+        |  prices, alerts, settings   |
         ^                      +------+----------+-----------+
         | Web Push                    |          |
         |                             v          v
         |                        +--------+  +--------+
         +------------------------+   D1   |  |   KV   |
                                  | SQLite |  | prices |
                                  +--------+  +--------+
                                       ^
                                       |
                          +------------+-------------+
                          |  Cron Trigger (Worker)   |
                          |  every 1 min: prices     |
                          |  every 1 min: alerts     |
                          |  every 1 hour: snapshot  |
                          +------------+-------------+
                                       |
                                       v
                          +--------------------------+
                          |  CoinGecko / FX API      |
                          +--------------------------+
```

**Request flow:**
1. Browser loads the SPA from the Worker's static assets.
2. SPA calls `/api/*` on the same Worker. Same origin, so session cookies work without cross-site configuration.
3. Worker validates the session (Better Auth), reads/writes D1, reads prices from KV.
4. Cron Trigger runs on schedule: fetches prices into KV, evaluates alerts, writes snapshots to D1, sends Web Push.

**Sync strategy:**
- No websockets. TanStack Query refetches on window focus and polls the dashboard every 60 seconds.
- All writes go through the API, so every device reads the same D1 state.

## 4. Project Structure (monorepo)

```
crypto-tracker/
+-- docs/
|   +-- PRD.md
|   +-- TECH_STACK.md
+-- apps/
|   +-- web/                    # React SPA (built to dist/, served by the Worker)
|   |   +-- public/
|   |   +-- src/
|   |   |   +-- components/
|   |   |   +-- features/       # transactions, dashboard, prices, alerts, settings
|   |   |   +-- hooks/
|   |   |   +-- i18n/           # en.json, ar.json
|   |   |   +-- lib/            # api client, formatters
|   |   |   +-- pages/
|   |   |   +-- main.tsx
|   |   +-- index.html
|   |   +-- vite.config.ts
|   |   +-- package.json
|   +-- api/                    # Cloudflare Worker (Hono)
|       +-- src/
|       |   +-- routes/         # auth, transactions, prices, alerts, settings
|       |   +-- services/       # coingecko, fx, push, portfolio math
|       |   +-- db/             # drizzle schema, migrations
|       |   +-- cron/           # scheduled handlers
|       |   +-- index.ts
|       +-- wrangler.jsonc
|       +-- package.json
+-- packages/
|   +-- shared/                 # types, validation schemas (zod), constants
+-- package.json                # workspaces root
+-- pnpm-workspace.yaml
```

## 5. Database Schema (D1)

```sql
user, session, account, verification   (Better Auth's own tables; `user` is the user table)
settings            (user_id PK, language, base_currency, large_text, theme,
                     alerts_enabled, chart_prefs_json, updated_at)
transactions        (id, user_id, type, coin_id, coin_symbol, coin_name, quantity,
                     price_per_unit, currency, price_per_unit_usd, fee, fee_usd,
                     occurred_at, note, created_at, updated_at)
alerts              (id, user_id, coin_id, coin_symbol, coin_name, target_price_usd,
                     direction, enabled, triggered_at, created_at)
push_subscriptions  (id, user_id, endpoint, p256dh, auth, created_at)
portfolio_snapshots (id, user_id, taken_at, total_value_usd, invested_usd)
```

Prices and FX rates are not stored in D1. They live in KV with a short TTL. Snapshots and all portfolio math are in USD; the client converts to the base currency at display time.

## 6. API Endpoints (Worker)

```
POST   /api/auth/*                     Better Auth handlers (Google OAuth)
GET    /api/me                         Current user + settings
PUT    /api/settings                   Update settings

GET    /api/transactions               List (filter: coin, type)
POST   /api/transactions               Create
PUT    /api/transactions/:id           Update
DELETE /api/transactions/:id           Delete
POST   /api/transactions/import        CSV import (preview + commit)

GET    /api/portfolio                  Holdings, totals, P/L (average cost)
GET    /api/portfolio/history          Snapshots for line chart

GET    /api/prices?ids=btc,eth         Current prices from KV
GET    /api/coins/search?q=            Coin search (CoinGecko, cached)

GET    /api/alerts                     List
POST   /api/alerts                     Create
PUT    /api/alerts/:id                 Update / re-enable
DELETE /api/alerts/:id                 Delete
POST   /api/push/subscribe             Save Web Push subscription
```

## 7. Scheduled Jobs (Cron Triggers)

| Schedule | Job | Detail |
|---|---|---|
| `* * * * *` | Refresh prices | Collect distinct coin ids across all holdings and alerts, fetch from CoinGecko, write to KV with 120s TTL |
| `* * * * *` | Check alerts | Compare enabled alerts against KV prices, send Web Push, set `triggered_at` |
| `0 * * * *` | Portfolio snapshot | Compute total value per user, insert into `portfolio_snapshots` |
| `0 */6 * * *` | Refresh FX rates | Fetch USD to EUR/SAR/TRY from open.er-api.com, write to KV |

## 8. Cost

All components fit within Cloudflare free tier at single-user scale:
- Static assets: free, unlimited.
- Workers: 100k requests/day.
- D1: 5M reads/day, 100k writes/day.
- KV: 100k reads/day.
- Cron Triggers: included.
- CoinGecko free tier: about 30 calls/min, well above the 1 call/min needed.

## 9. Local Development

- `pnpm dev` runs Vite dev server and `wrangler dev` for the Worker in parallel.
- Wrangler provides local D1 and KV emulation.
- Google OAuth requires a localhost redirect URI registered in Google Cloud Console.

## 10. Deployment

- `pnpm build` builds the SPA to `apps/web/dist`, then `wrangler deploy` uploads the Worker together with the static assets.
- D1 migrations applied with `wrangler d1 migrations apply`.
- Secrets (Google client secret, VAPID keys) set with `wrangler secret put`.
- Optional: GitHub Actions on push to `main`.
