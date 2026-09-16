# Task A2: Transactions CRUD and CSV import routes

## Goal

Implement the API for recording trades: list, create, update, delete, and CSV import (preview and commit). Every write normalizes prices to USD with the current FX rate, and every write is rejected when it would make any sell exceed the quantity held at that point in the timeline.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (especially decisions 6, 14), 2.1, 2.2, 2.3, 2.4.
  - `apps/api/src/types.ts`, `lib/errors.ts`, `lib/ids.ts`, `lib/time.ts`, `db/schema.ts` (`transactions` table, `TransactionRow`, `NewTransactionRow`), `db/client.ts`, `middleware/auth.ts`, `contracts.ts`, `routes/me.ts` (style).
  - `packages/shared/src/types.ts` (`Transaction`, `TransactionInput`, `TransactionListResponse`, `ImportRequest`, `ImportResponse`, `ImportRowResult`), `transactions.ts` (`transactionInputSchema`), `portfolio/` (`findTimelineViolation`, `applyChange`, `sortTransactions`, `convertToUsd`, `TransactionLike`), `csv/` (`parseTransactionsCsv`).
- Contracts you build against: all of the above. Services from other wave-1 tasks arrive through `deps` only.
- Contracts you provide, from `apps/api/src/routes/transactions.ts`:
  ```ts
  export interface TransactionsDeps { fx: FxProvider; coins: CoinResolver }
  export function createTransactionsRoutes(deps: TransactionsDeps): Hono<AppEnv>   // CRUD + POST /import, master mounts at /api/transactions
  ```
  and from `apps/api/src/services/transactions.ts`: `listTransactions(db, userId, filter?)`, `rowToTransaction(row): Transaction`, `toTransactionLike(row)`.

## Parallel work warning

Other workers own `routes/settings.ts`, `routes/prices.ts`, `routes/coins.ts`, `routes/portfolio.ts`, `routes/alerts.ts`, `routes/push.ts`, `services/coingecko.ts`, `services/fx.ts`, `services/cache.ts`, `services/market.ts`, `services/portfolio.ts`, `services/push.ts`, `services/alerts.ts`, `cron/*.ts`. Do not touch them or `src/index.ts`. Never import a concrete FX or coin service; use `deps`. No installs, no `wrangler dev`.

## Files you own

- `apps/api/src/routes/transactions.ts`, `apps/api/src/routes/import.ts` (new)
- `apps/api/src/services/transactions.ts`, `apps/api/src/services/import.ts` (new)
- `apps/api/src/services/transactions.test.ts`, `apps/api/src/services/import.test.ts` (new)

## Steps

### 1. `services/transactions.ts`

- `rowToTransaction(row: TransactionRow): Transaction` (type cast of `type`/`currency` after membership check; `note ?? null`).
- `toTransactionLike(row): TransactionLike` and `inputToLike(id, input, usd, createdAt): TransactionLike` helpers for timeline checks.
- `listTransactions(db, userId, filter: { coinId?: string; type?: TransactionType }): Promise<TransactionRow[]>` ordered by `occurredAt` desc, `createdAt` desc.
- `normalizeUsd(input: TransactionInput, fx: FxRates): { pricePerUnitUsd: number; feeUsd: number }` using `convertToUsd`.
- `assertTimelineValid(existing: TransactionLike[], change): void` — calls `findTimelineViolation(applyChange(existing, change))`; on violation throw `ApiError(409, 'INSUFFICIENT_HOLDINGS', `Cannot sell ${requested} ${coinId}; only ${available} held on ${occurredAt}`)`. Format numbers with up to 8 decimals.
- `createTransaction(db, userId, input, fx)`, `updateTransaction(db, userId, id, input, fx)`, `deleteTransaction(db, userId, id)` — each loads the user's rows, runs `assertTimelineValid`, writes, returns the `Transaction` (delete returns void). Missing id → `ApiError(404, 'NOT_FOUND', 'Transaction not found')`. All queries scoped by `userId`.

### 2. `routes/transactions.ts`

`createTransactionsRoutes(deps)`:
- `use(requireAuth)`.
- `GET /` — query `coinId`, `type` (validate `type` against `TRANSACTION_TYPES`, else 400) → `TransactionListResponse`.
- `POST /` — body via `transactionInputSchema` (400 `VALIDATION_ERROR` with `<path>: <message>`), `fx = await deps.fx.getFxRates(c.env)`, create → 201 `Transaction`.
- `PUT /:id` — same validation, update → 200.
- `DELETE /:id` → 204.
- `route('/import', createImportRoutes(deps))`.

### 3. `services/import.ts` and `routes/import.ts`

- `resolveRows(env, deps, rows: CsvRowResult[]): Promise<ImportRowResult[]>` — for each row with `values`, call `deps.coins.resolveCoin(env, values.coin)`; cache lookups per distinct coin string within one request; unresolved → error `coin "xyz" not found`; resolved → build `TransactionInput` (`coinId`, `coinSymbol` upper-cased, `coinName` from the result) and validate it with `transactionInputSchema` (belt and braces). Rows with header errors: the route returns 400 `VALIDATION_ERROR` listing the header errors.
- `POST /` handler: body `ImportRequest` (validate `csv` non-empty string ≤ 1 MB, `mode` in `preview | commit`). Parse with `parseTransactionsCsv(csv, { defaultCurrency })` where the default currency is the user's `baseCurrency` from `getOrCreateSettings`. Resolve rows. In `preview` return `ImportResponse` with `importedCount: 0`. In `commit`: if `errorCount > 0` return 400 `VALIDATION_ERROR` "Fix the highlighted rows before importing"; otherwise apply all valid inputs as one batch: compute `usd` per row with one FX fetch, check the timeline once with all new rows added (`applyChange` repeatedly), insert with `db.batch` or sequential inserts inside a loop, return `importedCount`.

### 4. Tests (pure, no D1)

- `normalizeUsd` with EUR → USD.
- `assertTimelineValid` throws 409 with the message shape; passes for valid change.
- `rowToTransaction` mapping.
- `resolveRows` with a fake `CoinResolver` (resolved, unresolved, per-request caching by counting calls).

## Constraints

- No commits, pushes, installs. No `any`. No TODOs.
- All DB access via Drizzle query builder; no raw SQL strings.
- Never trust `coinSymbol` from the client for identity; `coinId` is the identity.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` exits 0 (failures confined to other workers' files must be listed by name).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/services/transactions src/services/import` passes with at least 10 tests.
- [ ] `pnpm exec prettier --check apps/api/src/routes/transactions.ts apps/api/src/routes/import.ts apps/api/src/services/transactions.ts apps/api/src/services/import.ts apps/api/src/services/transactions.test.ts apps/api/src/services/import.test.ts` exits 0.
- [ ] Exports match the contract names above exactly.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/services/transactions src/services/import
pnpm exec prettier --check apps/api/src/routes/transactions.ts apps/api/src/routes/import.ts apps/api/src/services/transactions.ts apps/api/src/services/import.ts apps/api/src/services/transactions.test.ts apps/api/src/services/import.test.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
