# Task F1a: Shared validation schemas and portfolio math

## Goal

Add the pure, framework-free logic the whole app depends on to `packages/shared`: zod schemas for every request body, and the portfolio engine (holdings by average cost, realized and unrealized P/L, allocation, currency conversion, and the rule that a sell can never exceed the quantity held at that moment). Everything is pure TypeScript with full Vitest coverage so the API and the web app call it instead of re-implementing it.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `C:\Users\medoh\Documents\crypto-tracker\docs\WORK_PLAN.md` — sections 1 and 2 are binding.
  - `C:\Users\medoh\Documents\crypto-tracker\docs\PRD.md` — section 6.7 "Profit / Loss Calculation".
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\types.ts` and `constants.ts` — use these types; do not redefine or edit them.
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\constants.test.ts` — match its test style.
- Contracts you build against: everything in `types.ts` and `constants.ts`.
- Contracts you provide: see WORK_PLAN.md section 2.2 rows 1–6. Export names must match exactly.
- Conventions: TypeScript strict, ESM, no `any`, Prettier config at the repo root. Vitest 4 and zod 4 are installed. All money math is in USD: use `pricePerUnitUsd` and `feeUsd`, never `pricePerUnit`/`fee` (entry currency).

## Parallel work warning

Three other workers are editing `packages/shared/src/csv/**`, `apps/api/**`, and `apps/web/**` right now. Do not read or touch those folders.
`packages/shared/src/index.ts` is also edited by the CSV worker: it appends one line. When you add your export lines, re-read the file immediately before editing, append your lines at the end, and do not remove anything.
Do not run any install command. Everything you need is installed: `zod`, `vitest`, `typescript`.

## Files you own

- `packages/shared/src/settings.ts`, `transactions.ts`, `alerts.ts`, `push.ts`, `history.ts` (new) and their `*.test.ts`
- `packages/shared/src/portfolio/` (new): `index.ts`, `holdings.ts`, `summary.ts`, `timeline.ts`, `convert.ts` and their `*.test.ts`
- `packages/shared/src/index.ts` — append export lines only

## Steps

### 1. Zod schemas (zod v4: `import { z } from 'zod'`)

`settings.ts`:
```ts
export const chartPrefsSchema = z.object({ lineChart: z.boolean(), pieChart: z.boolean(), order: z.array(z.enum(CHART_KINDS)) });
export const settingsSchema = z.object({ language: z.enum(LANGUAGES), baseCurrency: z.enum(CURRENCIES), largeText: z.boolean(), theme: z.enum(THEMES), alertsEnabled: z.boolean(), chartPrefs: chartPrefsSchema });
export const settingsUpdateSchema = settingsSchema.partial();
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
```
Add a compile-time check that `z.infer<typeof settingsSchema>` is assignable to the shared `Settings` and vice versa (for example `const _a: Settings = {} as z.infer<typeof settingsSchema>; const _b: z.infer<typeof settingsSchema> = {} as Settings;` guarded so it does not emit unused warnings — or use `satisfies` inside the test file).

`transactions.ts` — `transactionInputSchema` producing exactly `TransactionInput`:
- `type`: enum `TRANSACTION_TYPES`
- `coinId`: trimmed, min 1, max 100
- `coinSymbol`: trimmed, min 1, max 20, transformed to upper case
- `coinName`: trimmed, min 1, max 100
- `quantity`: finite number > 0
- `pricePerUnit`: finite number >= 0
- `currency`: enum `CURRENCIES`
- `fee`: finite number >= 0, default 0
- `occurredAt`: ISO 8601 datetime string (`z.iso.datetime({ offset: true })` in zod 4; also accept a value without offset by normalizing through `new Date()` and rejecting `Invalid Date`), output normalized to `new Date(value).toISOString()`
- `note`: string max 500, trimmed, empty string becomes `null`, default `null`

`alerts.ts` — `alertInputSchema` producing exactly `AlertInput`: `coinId`, `coinSymbol` (upper-cased), `coinName` as above; `targetPriceUsd` finite > 0; `direction` enum `ALERT_DIRECTIONS`; `enabled` boolean default `true`.

`push.ts` — `pushSubscriptionSchema` producing `PushSubscriptionInput`: `endpoint` must be an `https:` URL; `keys.p256dh` and `keys.auth` non-empty strings.

`history.ts` — `historyRangeSchema = z.enum(['24h', '7d', '30d', '90d', '1y', 'all'])` matching `HistoryRange`, plus `export function rangeToSince(range: HistoryRange, now: Date): Date | null` returning the lower bound (null for `all`).

Tests: one file per schema module covering accepts, rejects (with the failing field), transforms (symbol upper-cased, note empty → null, occurredAt normalized), and defaults.

### 2. `portfolio/holdings.ts` — average-cost engine

```ts
export type TransactionLike = Pick<Transaction, 'id' | 'type' | 'coinId' | 'coinSymbol' | 'coinName' | 'quantity' | 'pricePerUnitUsd' | 'feeUsd' | 'occurredAt' | 'createdAt'>;
export interface HoldingCore { coinId: string; coinSymbol: string; coinName: string; quantity: number; averageCostUsd: number; investedUsd: number }
export interface HoldingsResult { holdings: HoldingCore[]; realizedPnlUsd: number }
export const EPSILON = 1e-9;
export function sortTransactions<T extends TransactionLike>(txs: readonly T[]): T[];
export function computeHoldings(txs: readonly TransactionLike[]): HoldingsResult;
```

Rules:
- `sortTransactions` returns a new array ordered by `occurredAt` ascending, then `createdAt` ascending, then `id` ascending. Never mutate the input.
- Replay in that order, one state per `coinId`: `quantity`, `totalCostUsd`.
- **Buy:** `totalCostUsd += quantity * pricePerUnitUsd + feeUsd`; `quantity += quantity`.
- **Sell:** `averageCost = totalCostUsd / quantity` (before the sell). `realizedPnlUsd += (pricePerUnitUsd - averageCost) * soldQuantity - feeUsd`. `totalCostUsd -= averageCost * soldQuantity`. `quantity -= soldQuantity`. If the remaining quantity is below `EPSILON`, set `quantity` and `totalCostUsd` to exactly 0 so a later buy starts a fresh average.
- A sell larger than the held quantity must not throw here; clamp the sold quantity to the held quantity for the math (timeline.ts reports the violation; routes validate before saving).
- `averageCostUsd = totalCostUsd / quantity`; `investedUsd = totalCostUsd`.
- `holdings` contains only coins with `quantity > EPSILON`, sorted by `investedUsd` descending. `coinSymbol`/`coinName` come from the most recent transaction for that coin.

### 3. `portfolio/timeline.ts` — sell validation

```ts
export interface TimelineViolation { transactionId: string; coinId: string; occurredAt: string; requested: number; available: number }
export function findTimelineViolation(txs: readonly TransactionLike[]): TimelineViolation | null;
export function applyChange(txs: readonly TransactionLike[], change:
  | { kind: 'create'; transaction: TransactionLike }
  | { kind: 'update'; transaction: TransactionLike }   // replaces the one with the same id
  | { kind: 'delete'; id: string }): TransactionLike[];
```
- `findTimelineViolation` replays in sorted order and returns the **first** sell whose quantity exceeds the held quantity by more than `EPSILON`, else `null`.
- `applyChange` returns a new array (never mutates). Routes call `findTimelineViolation(applyChange(existing, change))` before writing, so deleting or editing an old buy that would break a later sell is caught too.

### 4. `portfolio/convert.ts`

```ts
export function convertFromUsd(amountUsd: number, currency: Currency, fx: FxRates): number;
export function convertToUsd(amount: number, currency: Currency, fx: FxRates): number;
```
`fx.rates` maps currency to units per 1 USD; `USD` is 1. Throw a plain `Error` with a clear message when the rate is missing or not a positive finite number.

### 5. `portfolio/summary.ts`

```ts
export function computePortfolio(input: {
  transactions: readonly TransactionLike[];
  prices: Readonly<Record<string, PriceQuote | undefined>>;
  fx: FxRates;
  pricesUpdatedAt: string | null;
}): PortfolioSummary;
```
- Holdings via `computeHoldings`, enriched to the shared `Holding` shape.
- Missing price: `currentPriceUsd`, `currentValueUsd`, `unrealizedPnlUsd`, `unrealizedPnlPct`, `allocationPct` are `null`; excluded from `totalValueUsd`, **included** in `investedUsd`.
- `unrealizedPnlPct = unrealizedPnlUsd / investedUsd * 100`, `0` when `investedUsd` is 0.
- `allocationPct = currentValueUsd / totalValueUsd * 100` over priced holdings; all `0` when `totalValueUsd` is 0.
- Summary `unrealizedPnlUsd` / `unrealizedPnlPct` are over priced holdings only (their `investedUsd` as denominator).
- Holdings sorted by `currentValueUsd` descending, unpriced last (by `investedUsd` descending among themselves).
- `realizedPnlUsd` from `computeHoldings`; `fx` and `pricesUpdatedAt` passed through.

### 6. `portfolio/index.ts` re-exports everything public. Append to `packages/shared/src/index.ts`:
```ts
export * from './settings';
export * from './transactions';
export * from './alerts';
export * from './push';
export * from './history';
export * from './portfolio';
```

### 7. Tests

Use small builders (for example `tx({ type: 'buy', coinId: 'bitcoin', quantity: 1, pricePerUnitUsd: 100 })` with sensible defaults). Cover at least:
- `sortTransactions`: ordering, tie-breaks, no mutation.
- `computeHoldings`: single buy; weighted average of two buys; fee in cost; sell realizes P/L with average cost minus fee; sell-all then rebuy resets average; two coins independent; fully sold coin absent; sort order; latest symbol/name wins; oversell clamps without throwing.
- `findTimelineViolation` / `applyChange`: valid returns null; oversell reports `requested`/`available`; invalid only in `occurredAt` order is caught; create/update/delete never mutate; deleting an old buy that invalidates a later sell is reported.
- `convert`: round trip within `1e-9`; USD identity; missing or zero rate throws.
- `computePortfolio`: totals with two priced coins; unpriced coin nulls and totals rule; allocation sums to 100 within `1e-6`; sort order; zero-investment no divide-by-zero; empty input returns zeros and `[]`.
- Schemas: as in step 1.

Use `toBeCloseTo` for floats.

## Constraints

- No commits, pushes, or installs.
- No `any`, no non-null assertions outside tests.
- Pure functions only: no `Date.now()` inside library code (accept `now` as a parameter where needed), no I/O.
- Do not change `types.ts` or `constants.ts`. If a contract blocks you, report BLOCKED with the reason.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/shared typecheck` exits 0.
- [ ] `pnpm --filter @crypto-tracker/shared test` exits 0 with at least 40 passing tests.
- [ ] `pnpm exec prettier --check packages/shared/src` (run from the project root) exits 0.
- [ ] Every export listed in WORK_PLAN.md section 2.2 rows 1–6 resolves from `@crypto-tracker/shared`.
- [ ] `git status --short` shows changes only under `packages/shared/src/` (other workers' folders may show too; you must not have touched them).

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/shared typecheck
pnpm --filter @crypto-tracker/shared test
pnpm exec prettier --check packages/shared/src
git status --short
```

## Report

Return the report in the format defined in your agent instructions. Include the Vitest test-count line.
