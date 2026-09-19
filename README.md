# Crypto Tracker

A personal crypto portfolio tracker built for a single primary user (the owner's father). The user
manually records buy and sell transactions; the app shows current holdings, value, and profit/loss,
with live prices and simple charts. It works the same on phone and laptop, supports English and
Arabic (with RTL layout), and keeps data in sync across devices because everything is stored server
side. The app runs as a single Node.js server (Hono) deployed on Railway, serving the React PWA as
static files and providing the API, scheduled jobs, and push notifications on the same origin, with
data in Supabase Postgres and Supabase Auth (Google) for sign-in.

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
| Backend        | Node.js 24, Hono (`@hono/node-server`)                                             |
| Database       | Supabase Postgres via Drizzle ORM                                                  |
| Auth           | Supabase Auth (Google provider); API verifies the Supabase JWT                     |
| Cache          | In-memory cache (prices, FX rates), single process                                 |
| Scheduled jobs | node-cron in the same process (price refresh, alert checks, snapshots, FX refresh) |
| Push           | Web Push (VAPID) via `web-push`                                                    |
| Market data    | CoinGecko API                                                                      |
| FX rates       | open.er-api.com                                                                    |
| Deployment     | Railway (deploy from GitHub)                                                       |

See [docs/TECH_STACK.md](docs/TECH_STACK.md) for the full architecture.

## Getting started

Prerequisites:

- Node.js 24
- pnpm 12 (`npm i -g pnpm`)

Set up environment files and the database, then install, run, and test:

```sh
cp apps/api/.env.example apps/api/.env       # fill in Supabase values, see docs/DEPLOY.md
cp apps/web/.env.example apps/web/.env.local # fill in Supabase values, see docs/DEPLOY.md
pnpm install                                 # install all workspace dependencies
pnpm --filter @crypto-tracker/api db:migrate # apply Drizzle migrations to the Supabase database
pnpm dev            # run the API on http://localhost:8787 and the web app on http://localhost:5173
pnpm build          # type-check shared and api, build the web app to apps/web/dist
pnpm typecheck      # run tsc --noEmit in every package
pnpm test           # run the Vitest suites
pnpm format         # format the repository with Prettier
```

The web dev server (Vite, port 5173) proxies `/api/*` to the API server (tsx, port 8787), so both
must be running during development — `pnpm dev` starts both.

Sign-in uses real Google sign-in through Supabase Auth (no local seed session); see
[docs/DEPLOY.md](docs/DEPLOY.md) for setting up the Supabase project and Google OAuth client.

## Project layout

```
crypto-tracker/
├── apps/
│   ├── web/                # React PWA (built to dist/, served by the Node server)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/    # transactions, dashboard, prices, alerts, settings, import
│   │   │   ├── hooks/
│   │   │   ├── i18n/        # en/*.json, ar/*.json, one pair per feature
│   │   │   ├── lib/         # api client, supabase client, formatters
│   │   │   ├── app/         # shell, auth, routes, settings provider
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   └── api/                 # Node server (Hono)
│       ├── src/
│       │   ├── routes/      # me, settings, transactions, prices, coins, portfolio, alerts, push
│       │   ├── services/    # coingecko, fx, cache, push, portfolio math
│       │   ├── db/          # drizzle schema, client
│       │   ├── auth/        # Supabase JWT verification
│       │   ├── cron/        # scheduled handlers (node-cron)
│       │   ├── server.ts    # entry point: node-server + static SPA + cron
│       │   └── index.ts
│       ├── drizzle/         # generated migrations
│       └── scripts/         # generate-vapid-keys.mjs
├── packages/
│   └── shared/               # types, validation schemas (zod), constants, portfolio math, CSV parser
├── package.json               # workspace root scripts
├── railway.json                # Railway build/deploy configuration
└── pnpm-workspace.yaml
```

## License

Private project.

## Design and mock mode

The visual system is documented in `docs/DESIGN.md` (tokens, typography, components, page rules).
In development you can browse every screen without signing in or a database by opening
`http://localhost:5173/?mock=1` (add `&lang=ar` for Arabic). `?mock=0` turns it off. The mock
layer lives in `apps/web/src/dev/mock.ts` and is removed from production builds.
