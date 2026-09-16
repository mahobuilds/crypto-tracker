# Crypto Tracker

A personal crypto portfolio tracker built for a single primary user (the owner's father). The user
manually records buy and sell transactions; the app shows current holdings, value, and profit/loss,
with live prices and simple charts. It works the same on phone and laptop, supports English and
Arabic (with RTL layout), and keeps data in sync across devices because everything is stored server
side. The app runs entirely on Cloudflare: a single Worker (Hono) serves the React PWA through
Workers Static Assets and provides the API, scheduled jobs, and push notifications on the same
origin, with data in D1 and a KV price cache.

## Features

- Authentication (Google sign-in only, one account per portfolio)
- Cloud sync (all data tied to the account, available on every signed-in device)
- Transactions (buy/sell, edit, delete, filter, history)
- CSV import (fixed template, preview, per-row error reporting)
- Live prices (CoinGecko, 60-second refresh, 24h change, search any coin)
- Dashboard (summary cards, holdings table, line chart, pie chart)
- Profit/loss calculation (average cost method)
- Price alerts (optional, push notifications + in-app banner)
- Settings (language, base currency, large text, theme, alerts, chart layout)

## Screens

- Sign-in screen (Google sign-in button only).
- Dashboard: portfolio value, invested, P/L cards; holdings table; value-over-time line chart;
  allocation pie chart.
- Transactions: filterable history list with an add/edit dialog and delete confirmation.
- Import: CSV upload, parsed-row preview with error highlighting, confirm/commit.
- Prices: live prices for owned coins, plus a search for any coin.
- Alerts: list of price alerts with create/edit/delete, and an in-app banner when one fires.
- Settings: language, base currency, large text, theme, alerts toggle, chart order, sign out.

## Tech stack

| Layer          | Choice                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| Frontend       | React 19 + TypeScript, Vite, Tailwind CSS, Recharts, react-i18next, TanStack Query |
| PWA            | vite-plugin-pwa (service worker, manifest, installability)                         |
| Backend        | Cloudflare Workers, Hono                                                           |
| Database       | Cloudflare D1 (SQLite) via Drizzle ORM                                             |
| Auth           | Better Auth (Google provider), sessions in D1                                      |
| Cache          | Workers KV (prices, FX rates)                                                      |
| Scheduled jobs | Cloudflare Cron Triggers (price refresh, alert checks, snapshots, FX refresh)      |
| Push           | Web Push (VAPID) from the Worker                                                   |
| Market data    | CoinGecko API                                                                      |
| FX rates       | open.er-api.com                                                                    |
| Deployment     | Wrangler CLI                                                                       |

See [docs/TECH_STACK.md](docs/TECH_STACK.md) for the full architecture.

## Getting started

Prerequisites:

- Node.js 24
- pnpm 12 (`npm i -g pnpm`)

Install, run, and test:

```sh
pnpm install        # install all workspace dependencies
pnpm dev            # run the Worker on http://localhost:8787 and the web app on http://localhost:5173
pnpm build          # type-check shared and api, build the web app to apps/web/dist
pnpm typecheck      # run tsc --noEmit in every package
pnpm test           # run the Vitest suites
pnpm format         # format the repository with Prettier
```

The web dev server (Vite, port 5173) proxies `/api/*` to the Worker (wrangler, port 8787), so both
must be running during development — `pnpm dev` starts both.

For local database work, see [docs/DEPLOY.md](docs/DEPLOY.md).

### Local development without Google sign-in

Google sign-in needs OAuth credentials, which are not available in every local setup. To get a
signed-in session without going through Google, run the seed script from `apps/api` while the
Worker's local D1 database is available:

```sh
cd apps/api
node scripts/seed-dev-session.mjs
```

It creates (or reuses) a dev user and session row in the local D1 database and prints a
`better-auth.session_token` cookie value. Set that cookie in the browser you're testing with:

- **DevTools**: Application → Cookies → `http://localhost:5173`, add a cookie named
  `better-auth.session_token` with the printed value.
- **Playwright / `playwright-cli`**: `cookie-set better-auth.session_token "<value>" --domain=localhost --httpOnly`,
  then `goto http://localhost:5173/`.

Reload the app and you're signed in as the dev user, with no Google account needed.

## Project layout

```
crypto-tracker/
├── docs/
│   ├── PRD.md
│   ├── TECH_STACK.md
│   ├── DEPLOY.md
│   └── briefs/
├── apps/
│   ├── web/                # React PWA (built to dist/, served by the Worker)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/    # transactions, dashboard, prices, alerts, settings, import
│   │   │   ├── hooks/
│   │   │   ├── i18n/        # en/*.json, ar/*.json, one pair per feature
│   │   │   ├── lib/         # api client, formatters
│   │   │   ├── app/         # shell, auth, routes, settings provider
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   └── api/                 # Cloudflare Worker (Hono)
│       ├── src/
│       │   ├── routes/      # auth, settings, transactions, prices, coins, portfolio, alerts, push
│       │   ├── services/    # coingecko, fx, cache, push, portfolio math
│       │   ├── db/          # drizzle schema, client
│       │   ├── cron/        # scheduled handlers
│       │   └── index.ts
│       ├── drizzle/         # generated migrations
│       ├── scripts/         # generate-vapid-keys.mjs, ensure-assets-dir.mjs
│       └── wrangler.jsonc
├── packages/
│   └── shared/               # types, validation schemas (zod), constants, portfolio math, CSV parser
├── package.json               # workspace root scripts
└── pnpm-workspace.yaml
```

## Documentation

- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/TECH_STACK.md](docs/TECH_STACK.md) — technical stack and architecture
- [docs/DEPLOY.md](docs/DEPLOY.md) — deployment guide (Cloudflare, Google OAuth, VAPID, CI)

## License

Private project.
