# Task A4: Portfolio summary and history routes, hourly snapshot job

## Goal

Expose the computed portfolio (`GET /api/portfolio`) and its value over time (`GET /api/portfolio/history?range=`), and record an hourly snapshot per user so the line chart has data. All math comes from `@crypto-tracker/shared`; prices and FX arrive through injected providers.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 7, 14, 16), 2.1, 2.2, 2.3, 2.4.
  - `apps/api/src/types.ts`, `lib/errors.ts`, `lib/ids.ts`, `lib/time.ts`, `db/schema.ts` (`transactions`, `portfolioSnapshots`, row types), `db/client.ts`, `middleware/auth.ts`, `contracts.ts`, `cron/index.ts` (`CronJob`), `routes/me.ts` (style).
  - `packages/shared/src/types.ts` (`PortfolioSummary`, `PortfolioSnapshot`, `HistoryRange`, `PortfolioHistoryResponse`), `history.ts` (`historyRangeSchema`, `rangeToSince`), `portfolio/` (`computePortfolio`, `TransactionLike`), `constants.ts` (`CRON`).
- Contracts you provide:
  ```ts
  // routes/portfolio.ts
  export interface PortfolioDeps { prices: PriceProvider; fx: FxProvider }
  export function createPortfolioRoutes(deps: PortfolioDeps): Hono<AppEnv>;   // GET /, GET /history — master mounts at /api/portfolio
  // cron/snapshots.ts
  export function createSnapshotJob(deps: PortfolioDeps): CronJob;             // cron: CRON.HOURLY
  // services/portfolio.ts
  export function rowToTransactionLike(row: TransactionRow): TransactionLike;
  export async function buildPortfolio(env: Env, db: Database, userId: string, deps: PortfolioDeps): Promise<PortfolioSummary>;
  export function downsample(points: PortfolioSnapshot[], maxPoints: number): PortfolioSnapshot[];
  ```

## Parallel work warning

Other workers own `routes/settings.ts`, `routes/transactions.ts`, `routes/import.ts`, `routes/prices.ts`, `routes/coins.ts`, `routes/alerts.ts`, `routes/push.ts`, `services/transactions.ts`, `services/import.ts`, `services/coingecko.ts`, `services/fx.ts`, `services/cache.ts`, `services/market.ts`, `services/push.ts`, `services/alerts.ts`, `cron/prices.ts`, `cron/fx.ts`, `cron/alerts.ts`. Do not touch them, `src/index.ts`, or `cron/index.ts`. Never import a concrete price/FX service; use `deps`. No installs, no `wrangler dev`.

## Files you own

- `apps/api/src/routes/portfolio.ts`, `apps/api/src/services/portfolio.ts`, `apps/api/src/cron/snapshots.ts` (new)
- `apps/api/src/services/portfolio.test.ts` (new)

## Steps

1. `services/portfolio.ts`
   - `rowToTransactionLike(row)` — pick the `TransactionLike` fields (cast `type` after membership check).
   - `buildPortfolio(env, db, userId, deps)` — load the user's transactions, derive distinct `coinId`s, `const [{ prices, updatedAt }, fx] = await Promise.all([deps.prices.getPrices(env, ids), deps.fx.getFxRates(env)])`, return `computePortfolio({ transactions, prices, fx, pricesUpdatedAt: updatedAt })`. With zero transactions skip the price call (still fetch FX) and return an empty summary.
   - `downsample(points, maxPoints)` — if `points.length <= maxPoints` return as is; otherwise keep evenly spaced points, always keeping the first and the last. Pure.
   - `listSnapshots(db, userId, since: Date | null): Promise<PortfolioSnapshot[]>` ordered by `takenAt` asc.
   - `recordSnapshot(db, userId, summary: PortfolioSummary, takenAt: string)` — insert `{ id: newId(), userId, takenAt, totalValueUsd, investedUsd }`.
2. `routes/portfolio.ts` — `createPortfolioRoutes(deps)`: `use(requireAuth)`; `GET /` → `buildPortfolio`; `GET /history` → parse `range` with `historyRangeSchema` (default `'30d'`; invalid → 400 `VALIDATION_ERROR`), `since = rangeToSince(range, new Date())`, `points = downsample(await listSnapshots(...), 500)`, respond `PortfolioHistoryResponse`.
3. `cron/snapshots.ts` — `createSnapshotJob(deps)`: `{ name: 'portfolio-snapshot', cron: CRON.HOURLY, run }`: select distinct `userId`s from `transactions`; for each, `buildPortfolio` and `recordSnapshot` with one shared `takenAt`. Errors for one user are logged and do not stop the others (`Promise.allSettled`). Log `snapshots written: N`.
4. Tests (pure): `rowToTransactionLike` mapping; `downsample` (below limit unchanged; keeps first and last; length equals `maxPoints`); `buildPortfolio` with fake `db`? No — keep `buildPortfolio` untested at the DB level; instead extract `summarize(transactions: TransactionLike[], prices, fx, updatedAt)` if you need a seam and test that it delegates correctly (one priced holding, totals match `computePortfolio`).

## Constraints

- No commits, pushes, installs. No `any`. No TODOs. Drizzle query builder only.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` exits 0 (name failures confined to other workers' files).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/services/portfolio` passes with at least 6 tests.
- [ ] `pnpm exec prettier --check apps/api/src/routes/portfolio.ts apps/api/src/services/portfolio.ts apps/api/src/services/portfolio.test.ts apps/api/src/cron/snapshots.ts` exits 0.
- [ ] Exports match the contract names exactly.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/services/portfolio
pnpm exec prettier --check apps/api/src/routes/portfolio.ts apps/api/src/services/portfolio.ts apps/api/src/services/portfolio.test.ts apps/api/src/cron/snapshots.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
