# Task W2: Dashboard UI

## Goal

The home screen: total value, invested, profit/loss, a holdings table, a value-over-time line chart, and an allocation pie chart. Charts shown and their order follow the user's `chartPrefs`. Values display in the user's base currency.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 15, 16), 2.1, 2.4, 2.5.
  - `docs/PRD.md` — section 6.6.
  - `apps/web/src/components/ui/index.ts` and its components; `src/lib/api.ts`, `src/lib/format.ts` (`formatMoneyUsd`, `formatPct`, `formatQuantity`, `pnlTone`), `src/lib/query.ts`; `src/app/settings/SettingsProvider.tsx` (`useSettings`); `src/i18n/en/common.json`; `src/app/WelcomePage.tsx`.
  - `packages/shared/src/types.ts` (`PortfolioSummary`, `Holding`, `PortfolioHistoryResponse`, `HistoryRange`, `ChartPrefs`), `constants.ts` (`PRICE_REFRESH_INTERVAL_MS`, `CHART_KINDS`).
  - Recharts 3 is installed: `apps/web/node_modules/recharts` (read its `types` for `LineChart`, `PieChart`, `ResponsiveContainer`, `Tooltip`).
- API: `GET /api/portfolio` → `PortfolioSummary` (contains `fx` and `pricesUpdatedAt`); `GET /api/portfolio/history?range=24h|7d|30d|90d|1y|all` → `PortfolioHistoryResponse` (points in USD).
- Contracts you provide: `export { DashboardPage } from './DashboardPage'` in `apps/web/src/features/dashboard/index.ts`; `export const portfolioQueryKey = ['portfolio'] as const` in `features/dashboard/queries.ts`.

## Parallel work warning

Other workers own `src/features/transactions`, `prices`, `settings`, `alerts`, `import`, `src/sw.ts`, and API folders. Do not touch them or anything outside your owned files. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/dashboard/**` (new)
- `apps/web/src/i18n/en/dashboard.json`, `apps/web/src/i18n/ar/dashboard.json` (top-level key `dashboard`)

## Steps

1. `queries.ts`: `usePortfolio()` (key `portfolioQueryKey`, `refetchInterval: PRICE_REFRESH_INTERVAL_MS`), `usePortfolioHistory(range)` (key `[...portfolioQueryKey, 'history', range]`, `staleTime` 5 min).
2. `DashboardPage.tsx`: `PageHeader` with title and a "last updated" line (`formatRelative(pricesUpdatedAt)`; if null show the i18n "prices unavailable" text). Summary grid (1 column on phones, 3 on `md+`) of `StatCard`s (local component in this feature): total value, invested, unrealized P/L (amount + percent, colored with `PnlText`), and a smaller realized P/L line. Then charts in `settings.chartPrefs.order` filtered by the enabled flags, then the holdings table. Empty portfolio (no holdings, invested 0) → `EmptyState` linking to `/transactions` (use `Link` from `react-router`).
3. `ValueChart.tsx`: range selector (segmented buttons: 24h, 7d, 30d, 90d, 1y, all; default `30d`), Recharts `LineChart` inside `ResponsiveContainer` (height 240 on phones, 320 on `md+`), one line for value and a dashed line for invested, y-axis formatted with `formatMoneyUsd` compact (use `Intl` `notation: 'compact'` via a local helper), tooltip showing date and both values in base currency. Fewer than 2 points → an inline i18n message "Not enough history yet; snapshots are taken hourly". Colors: value = `#4f46e5`, invested = `#94a3b8`; respect dark mode for axis text (`currentColor`).
4. `AllocationChart.tsx`: Recharts `PieChart` (`innerRadius` for a donut) over holdings with `allocationPct !== null`; legend list beside/below with symbol, percent, and value. Use a fixed palette of 8 distinguishable colors; more holdings than colors → group the rest as "Other". Chart `aria-label` with a text summary.
5. `HoldingsTable.tsx`: rows per `Holding`: symbol + name, quantity, average cost, current price, value, P/L amount + percent (`PnlText`), allocation. Unpriced holdings show an em dash for null fields and a `Badge` "no price". Phones: stacked `Card`s with the four most important numbers; `md+`: table. Sort by value desc (already sorted by the API).
6. `ChartSettingsButton.tsx`: a ghost button opening a `Dialog` with two `Toggle`s (line chart, pie chart) and up/down buttons to reorder; saves through `updateSettings({ chartPrefs })`.
7. i18n `dashboard.json` (en + real Arabic).

## Constraints

- Logical Tailwind utilities only. Touch targets. No `any`, no TODOs, no hard-coded strings. No new dependencies.
- Never divide by zero in the UI; use the API's values.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/dashboard apps/web/src/i18n/en/dashboard.json apps/web/src/i18n/ar/dashboard.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/dashboard` returns nothing.
- [ ] en/ar key sets identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/dashboard apps/web/src/i18n/en/dashboard.json apps/web/src/i18n/ar/dashboard.json
git status --short apps/web
```

## Report

Format from your agent instructions.
