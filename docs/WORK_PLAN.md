# Crypto Portfolio Tracker — Work Plan

**Owner:** master brain (main session)
**Method:** work-distribute skill (`~/.claude/skills/work-distribute/SKILL.md`) — waves of independent tasks, every task in a wave runs in parallel.
**Related:** [PRD.md](./PRD.md), [TECH_STACK.md](./TECH_STACK.md), briefs in [briefs/](./briefs/)
**Last updated:** 2026-09-15

Status values: `todo`, `in_progress`, `review`, `rework`, `done`, `blocked`.

---

## 1. Decisions made during planning

These refine TECH_STACK.md and are binding for every task.

1. **One Worker serves everything.** The SPA is served by the same Cloudflare Worker as the API through Workers Static Assets (`assets` binding, `not_found_handling = "single-page-application"`, `run_worker_first = ["/api/*"]`). Same origin, so auth cookies need no cross-site configuration and there is no CORS.
2. **Toolchain pins:** pnpm 12 workspaces, Node 24, TypeScript 5.9, Vite 7, Vitest 4, react-router 7, Tailwind 4, Hono 4, Drizzle 0.45, Better Auth 1.7, wrangler 4.131.1, zod 4.6.4. All dependencies for the whole project are already installed by the master; **workers never run install commands**.
3. **Auth tables come from Better Auth.** `user`, `session`, `account`, `verification` are Better Auth's own schema. There is no separate `users` table; app tables reference `user.id`.
4. **No shadcn/ui.** Small hand-written components on Tailwind v4 plus native HTML controls (`<select>`, `<dialog>`, `<input type="date">`). Native controls behave best on a phone for a non-technical user.
5. **FX rates** come from `https://open.er-api.com/v6/latest/USD` (free, no key, covers EUR/SAR/TRY), refreshed every 6 hours into KV. Portfolio math runs in USD; the client converts to the base currency for display.
6. **Transactions store both the entered price and a USD-normalized price** (`pricePerUnit`, `currency`, `pricePerUnitUsd`, `fee`, `feeUsd`) using the FX rate at entry time. Average cost is computed in USD.
7. **Portfolio snapshots** store `totalValueUsd` and `investedUsd` hourly.
8. **Numbers** are SQLite `REAL` / JavaScript `number`. Adequate for one personal portfolio in v1.
9. **Tailwind RTL:** logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`), never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`, so Arabic mirrors automatically.
10. **Large text mode:** `<html data-large-text>` sets `font-size: 18px` and minimum touch targets of 48 px. **Dark mode:** `dark` class on `<html>` with `@custom-variant dark (&:where(.dark, .dark *))`.
11. **Tests** use Vitest. Pure logic (portfolio math, CSV parsing, validation) lives in `packages/shared` so it is testable without Cloudflare bindings. Route handlers stay thin; services with I/O are tested with fake `fetch` and fake KV.
12. **Web Push** from the Worker uses `@block65/webcrypto-web-push` (WebCrypto based). VAPID keys are Worker secrets; `apps/api/scripts/generate-vapid-keys.mjs` prints a pair.
13. **Router:** react-router v7 in library (declarative) mode, imported from `react-router`.
14. **Dependency injection for cross-task code.** API route groups and cron jobs that need another task's service receive it through a factory parameter typed by `apps/api/src/contracts.ts`. Nothing imports another wave-1 task's module; the master composes everything in `apps/api/src/index.ts` and `apps/api/src/cron/index.ts` at integration.
15. **i18n files are per feature.** `apps/web/src/i18n/en/<feature>.json` and `ar/<feature>.json`; the loader merges every file with `import.meta.glob`. Each feature owns its own two files, so parallel workers never edit the same JSON.
16. **Worker verification is scoped to the worker's package** (`pnpm --filter <pkg> typecheck`, `... test`). Only the master runs `wrangler dev`, `vite build` for the whole repo, and root-level commands, because concurrent workers would fight over ports and `dist/`.

## 2. Shared contracts

### 2.1 `packages/shared` (written by the master, present now)

`src/constants.ts`: `CURRENCIES`, `LANGUAGES`, `THEMES`, `TRANSACTION_TYPES`, `ALERT_DIRECTIONS`, `CHART_KINDS` (+ union types `Currency`, `Language`, `Theme`, `TransactionType`, `AlertDirection`, `ChartKind`), `CURRENCY_SYMBOLS`, `LANGUAGE_DIRECTION`, `LANGUAGE_LOCALE`, `PRICE_REFRESH_INTERVAL_MS`, `CRON`.

`src/types.ts`: `ChartPrefs`, `Settings`, `DEFAULT_SETTINGS`, `CurrentUser`, `MeResponse`, `Transaction`, `TransactionInput`, `TransactionListResponse`, `PriceQuote`, `PricesResponse`, `FxRates`, `CoinSearchResult`, `CoinSearchResponse`, `Holding`, `PortfolioSummary`, `PortfolioSnapshot`, `HistoryRange`, `PortfolioHistoryResponse`, `Alert`, `AlertInput`, `AlertListResponse`, `PushSubscriptionInput`, `VapidPublicKeyResponse`, `ImportRowResult`, `ImportRequest`, `ImportResponse`, `ApiErrorBody`.

Read the file for exact fields. Do not change these without going through the master.

### 2.2 `packages/shared` additions from wave 0 (task F1a, F1b)

| Export | File | Provided by |
|---|---|---|
| `settingsSchema`, `settingsUpdateSchema`, `chartPrefsSchema`, `SettingsUpdate` | `src/settings.ts` | F1a |
| `transactionInputSchema` | `src/transactions.ts` | F1a |
| `alertInputSchema` | `src/alerts.ts` | F1a |
| `pushSubscriptionSchema` | `src/push.ts` | F1a |
| `historyRangeSchema` | `src/history.ts` | F1a |
| `sortTransactions`, `computeHoldings`, `findTimelineViolation`, `applyChange`, `convertFromUsd`, `convertToUsd`, `computePortfolio`, `EPSILON`, types `TransactionLike`, `HoldingCore`, `HoldingsResult`, `TimelineViolation` | `src/portfolio/` | F1a |
| `parseTransactionsCsv`, `CSV_COLUMNS`, `SAMPLE_CSV`, types `CsvRowValues`, `CsvRowResult`, `CsvParseResult` | `src/csv/` | F1b |

### 2.3 API (`apps/api`) contracts from wave 0 (task F2)

| Export | File |
|---|---|
| `AppEnv` = `{ Bindings: Env; Variables: { db: Database; auth: Auth; user: AuthUser } }` | `src/types.ts` |
| `ApiError` (status, code, message), `errorBody()` | `src/lib/errors.ts` |
| `newId()` (uuid), `nowIso()` | `src/lib/ids.ts`, `src/lib/time.ts` |
| Drizzle tables `user`, `session`, `account`, `verification`, `settings`, `transactions`, `alerts`, `pushSubscriptions`, `portfolioSnapshots` | `src/db/schema.ts` |
| `createDb(env)`, type `Database` | `src/db/client.ts` |
| `getOrCreateSettings(db, userId)`, `saveSettings(db, userId, settings)`, `rowToSettings(row)` | `src/db/settings.ts` |
| `createAuth(env, db)`, types `Auth`, `AuthUser` | `src/auth/index.ts` |
| `withContext` (sets `db`, `auth`), `requireAuth` (sets `user` or throws 401) | `src/middleware/context.ts`, `src/middleware/auth.ts` |
| `CronJob` = `{ name: string; cron: string; run(env: Env, ctx: ExecutionContext): Promise<void> }`, `cronJobs: CronJob[]`, `handleScheduled` | `src/cron/index.ts` |
| `PriceProvider`, `FxProvider`, `CoinResolver` interfaces (below) | `src/contracts.ts` |

```ts
// src/contracts.ts
export interface PriceProvider {
  /** Latest quotes for the given CoinGecko ids. Missing ids are absent from the result. */
  getPrices(env: Env, coinIds: readonly string[]): Promise<{ prices: Record<string, PriceQuote>; updatedAt: string | null }>;
}
export interface FxProvider {
  getFxRates(env: Env): Promise<FxRates>;
}
export interface CoinResolver {
  searchCoins(env: Env, query: string): Promise<CoinSearchResult[]>;
  /** Resolve a ticker ("btc") or CoinGecko id ("bitcoin") to one coin, or null. */
  resolveCoin(env: Env, query: string): Promise<CoinSearchResult | null>;
}
```

### 2.4 API routes (final surface; who provides what)

```
GET    /api/health                       F2
GET|POST /api/auth/*                     F2 (Better Auth)
GET    /api/me                           F2
PUT    /api/settings                     A1
GET    /api/transactions?coinId=&type=   A2
POST   /api/transactions                 A2
PUT    /api/transactions/:id             A2
DELETE /api/transactions/:id             A2
POST   /api/transactions/import          A2
GET    /api/prices?ids=a,b               A3
GET    /api/fx                           A3
GET    /api/coins/search?q=              A3
GET    /api/portfolio                    A4
GET    /api/portfolio/history?range=     A4
GET    /api/alerts                       A5
POST   /api/alerts                       A5
PUT    /api/alerts/:id                   A5
DELETE /api/alerts/:id                   A5
GET    /api/push/vapid-public-key        A5
POST   /api/push/subscribe               A5
DELETE /api/push/subscribe               A5
```

Route factories in wave 1 export `createXRoutes(deps)` returning a `Hono<AppEnv>`; the master mounts them. Cron jobs export `createXJob(deps): CronJob`; the master pushes them into `cronJobs`. Every protected route uses `requireAuth`. Success responses return the shared response type directly; errors use the `{ error: { code, message } }` envelope via `ApiError`.

### 2.5 Web (`apps/web`) contracts from wave 0 (task F3)

| Export | File |
|---|---|
| `apiFetch<T>(path, init?)`, `ApiRequestError` (`status`, `code`) | `src/lib/api.ts` |
| `formatMoneyUsd(amountUsd, currency, fx, language)`, `formatFiat(amount, currency, language)`, `formatPct(pct, language)`, `formatQuantity(qty, language)`, `formatDate(iso, language)`, `formatDateTime(iso, language)`, `formatRelative(iso, language)` | `src/lib/format.ts` |
| `useSettings()` → `{ user, settings, updateSettings(patch), isSaving }` (inside the authenticated shell only) | `src/app/settings/SettingsProvider.tsx` |
| `authClient`, `useSession()`, `signInWithGoogle()`, `signOut()` | `src/app/auth/client.ts` |
| `SignInPage`, `AuthGate` | `src/app/auth/` |
| `AppShell` (nav + `<Outlet />`), `NAV_ITEMS` in `src/app/nav.ts`, route table in `src/app/routes.tsx` | `src/app/` |
| `usePrices(coinIds)` → `{ prices, updatedAt, isLoading }` (polls `/api/prices`), `useFx()` → `{ fx, isLoading }` (polls `/api/fx`) | `src/hooks/usePrices.ts`, `src/hooks/useFx.ts` |
| `CoinPicker` (`{ value, onChange, label? }` backed by `/api/coins/search`) | `src/components/CoinPicker.tsx` |
| `Button`, `Card`, `Input`, `Select`, `Textarea`, `Toggle`, `Dialog`, `PageHeader`, `EmptyState`, `Spinner`, `ErrorMessage`, `Badge`, `PnlText`, `Field` | `src/components/ui/index.ts` |
| i18n loader merging `src/i18n/{en,ar}/*.json`; `applyLanguage(lang)` | `src/i18n/index.ts` |
| `src/sw.ts` service worker (injectManifest), precaching | `src/sw.ts` |

Wave-1 web features each export one page component from `src/features/<name>/index.ts` and own `src/i18n/en/<name>.json` + `src/i18n/ar/<name>.json`. The master adds the route and nav entry at integration.

## 3. Waves

### Wave 0 — Foundation (4 tasks, parallel)

Prerequisite (done by master): root workspace, all `package.json` manifests, every dependency installed, `packages/shared` contracts, `apps/api/wrangler.jsonc`, `worker-configuration.d.ts`, `.dev.vars`.

| Id | Title | Tier | Owns | Provides | Status |
|---|---|---|---|---|---|
| F1a | Shared validation schemas + portfolio math + tests | hard | `packages/shared/src/settings.ts`, `transactions.ts`, `alerts.ts`, `push.ts`, `history.ts`, `portfolio/**`, export lines in `src/index.ts` | 2.2 rows 1–6 | done |
| F1b | Shared CSV parser + tests | medium | `packages/shared/src/csv/**`, one export line in `src/index.ts` | 2.2 row 7 | done |
| F2 | API skeleton: Hono app, errors, schema, migration, Better Auth + Google, middleware, `/api/health`, `/api/me`, cron registry, contracts | hard | `apps/api/src/**`, `apps/api/drizzle.config.ts`, `apps/api/drizzle/**` | 2.3, routes `/api/health`, `/api/auth/*`, `/api/me` | done |
| F3 | Web skeleton: Vite config, Tailwind, router, TanStack Query, i18n loader, auth client + sign-in + gate, settings provider, layout, UI kit, hooks, CoinPicker, PWA + sw.ts | hard | `apps/web/**` except `package.json` and `src/features/**` | 2.5 | done |

Both F1a and F1b add export lines to `packages/shared/src/index.ts`; each adds exactly one line at the end and re-reads the file before editing to avoid clobbering the other.

**Wave 0 integration (master):** root `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm format:check`; `wrangler dev` smoke (`/api/health`, `/api/auth/ok`, `/api/me` → 401); Vite dev proxy smoke; sign-in page renders.

### Wave 1 — Features (12 tasks, parallel)

| Id | Title | Tier | Owns | Provides | Status |
|---|---|---|---|---|---|
| A1 | `PUT /api/settings` | easy | `apps/api/src/routes/settings.ts` | `createSettingsRoutes()` | done |
| A2 | Transactions CRUD + CSV import routes | medium | `apps/api/src/routes/transactions.ts`, `routes/import.ts`, `services/transactions.ts`, `services/import.ts`, tests | `createTransactionsRoutes(deps: { fx: FxProvider; coins: CoinResolver })` (mounts CRUD and `/import`) | done |
| A3 | Market data: CoinGecko + FX services, KV cache, prices/fx/coins routes, price + FX cron jobs | medium | `apps/api/src/services/coingecko.ts`, `services/fx.ts`, `services/cache.ts`, `services/market.ts`, `routes/prices.ts`, `routes/coins.ts`, `cron/prices.ts`, `cron/fx.ts`, tests | `marketData: PriceProvider & FxProvider & CoinResolver`, `createPricesRoutes(deps)`, `createCoinsRoutes(deps)`, `createPriceRefreshJob()`, `createFxRefreshJob()` | done |
| A4 | Portfolio summary + history routes, hourly snapshot job | medium | `apps/api/src/routes/portfolio.ts`, `services/portfolio.ts`, `cron/snapshots.ts`, tests | `createPortfolioRoutes(deps: { prices: PriceProvider; fx: FxProvider })`, `createSnapshotJob(deps)` | done |
| A5 | Alerts CRUD, push subscriptions, alert cron, Web Push send | hard | `apps/api/src/routes/alerts.ts`, `routes/push.ts`, `services/push.ts`, `services/alerts.ts`, `cron/alerts.ts`, tests | `createAlertsRoutes()`, `createPushRoutes()`, `createAlertCheckJob(deps: { prices: PriceProvider })` | done |
| W1 | Transactions UI: list, filters, add/edit dialog with CoinPicker, delete confirm | medium | `apps/web/src/features/transactions/**`, `src/i18n/en/transactions.json`, `ar/transactions.json` | `TransactionsPage` | done |
| W2 | Dashboard UI: summary cards, holdings table, line chart, pie chart, chart prefs | medium | `apps/web/src/features/dashboard/**`, `i18n/{en,ar}/dashboard.json` | `DashboardPage` | done |
| W3 | Prices page: owned coins live, search any coin | easy | `apps/web/src/features/prices/**`, `i18n/{en,ar}/prices.json` | `PricesPage` | done |
| W4 | Settings page | easy | `apps/web/src/features/settings/**`, `i18n/{en,ar}/settings.json` | `SettingsPage` | done |
| W5 | Alerts UI, push permission flow, service-worker push handlers, in-app banner | medium | `apps/web/src/features/alerts/**`, `i18n/{en,ar}/alerts.json`, `apps/web/src/sw.ts` (edit) | `AlertsPage`, `AlertBanner` | done |
| W6 | Import page: upload, preview, commit, sample CSV | medium | `apps/web/src/features/import/**`, `i18n/{en,ar}/import.json`, `apps/web/public/sample-transactions.csv` | `ImportPage` | done |
| D1 | README, deploy guide, GitHub Actions workflow | easy | `README.md`, `docs/DEPLOY.md`, `.github/workflows/deploy.yml` | docs | done |

**Wave 1 integration (master):** mount A1–A5 route factories in `apps/api/src/index.ts` with `marketData` injected; push cron jobs into `cronJobs`; add W1–W6 routes and nav entries; mount `AlertBanner` in `AppShell`; full verification; dev smoke of every route; browser walk-through.

### Wave 2 — Polish (2 tasks, parallel)

| Id | Title | Tier | Owns | Status |
|---|---|---|---|---|
| P1 | PWA icons + manifest, empty/loading/error states audit, large-text and RTL QA fixes | medium | as reported, excluding `i18n/ar/**` | done |
| P2 | Arabic translation completeness and quality pass over all `i18n/ar/*.json` | easy | `apps/web/src/i18n/ar/**` | done |

**Wave 2 integration (master):** full verification, end-to-end smoke with a real Google sign-in (needs the user's OAuth client), sign-off.

## 4. Log

- 2026-09-15 — Wave 2 complete: P1 fixed the six QA defects, added PNG/maskable icons, README dev-session section; P2 unified Arabic terminology. Full verification green. Remaining: end-to-end sign-off with a real Google OAuth client (needs the owner's credentials) and the first commit (owner has not asked for commits).

- 2026-09-15 — Wave 1 complete and integrated: API routes mounted with DI, cron jobs registered, web routes + nav + AlertBanner wired, i18n wrapper mismatch in settings/import fixed, `/__scheduled` allowed through the Worker for local cron tests, `apps/api/scripts/seed-dev-session.mjs` added for Google-free local sessions. Full verification green (typecheck, 194 tests, build, prettier). Browser walk-through on phone and desktop, English and Arabic RTL, large text. Wave 2 (P1 polish, P2 Arabic) launched.

- 2026-09-14 — Plan v1 created (sequential phases). Environment: Node 24.12.0, pnpm 12.4.1, git 2.52, wrangler 4.131.1.
- 2026-09-15 — Wave 0: F1a, F1b, F2 done and verified. F3 hit an Opus rate limit mid-task and was re-spawned to finish from its partial output. A1–A5 and D1 launched in parallel with F3 (they depend only on F1a/F2). A1, A4 done.
- 2026-09-14 — User asked for parallel execution. Plan v2: waves of independent tasks with contracts-first and dependency injection. Master wrote root workspace, manifests, shared contracts, wrangler config, dev secrets; all dependencies installed (pnpm `allowBuilds` for esbuild/workerd; wrangler and zod pinned below pnpm's 24-hour minimum release age).
