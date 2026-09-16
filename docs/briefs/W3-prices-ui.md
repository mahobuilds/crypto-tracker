# Task W3: Prices page

## Goal

A screen that shows live prices for the coins the user owns and lets them search the price of any other coin. Prices display in the user's base currency with the 24-hour change.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 15, 16), 2.1, 2.4, 2.5.
  - `docs/PRD.md` — section 6.5.
  - `apps/web/src/components/ui/index.ts` and components; `src/components/CoinPicker.tsx`; `src/hooks/usePrices.ts`; `src/lib/api.ts`, `src/lib/format.ts`, `src/lib/query.ts`; `src/app/settings/SettingsProvider.tsx`; `src/i18n/en/common.json`; `src/app/WelcomePage.tsx`.
  - `packages/shared/src/types.ts` (`PriceQuote`, `PricesResponse`, `PortfolioSummary`, `CoinSearchResult`), `constants.ts`.
- API: `GET /api/portfolio` → `PortfolioSummary` (use its `holdings` for the owned list); `GET /api/prices?ids=` via `usePrices`; `GET /api/coins/search?q=` via `CoinPicker`.
- Contracts you provide: `export { PricesPage } from './PricesPage'` in `apps/web/src/features/prices/index.ts`.

## Parallel work warning

Other workers own the other `src/features/*` folders, `src/sw.ts`, and API folders. Touch nothing outside your owned files. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/prices/**` (new)
- `apps/web/src/i18n/en/prices.json`, `apps/web/src/i18n/ar/prices.json` (top-level key `prices`)

## Steps

1. `PricesPage.tsx`: `PageHeader` with title and "updated X ago" from `usePrices` `updatedAt` (`formatRelative`). Section "Your coins": query `/api/portfolio` (`useQuery`, key `['portfolio']`, `staleTime` 30 s), take `holdings` coin ids, feed `usePrices`; render a list of `PriceRow`s. Empty holdings → `EmptyState` linking to `/transactions`.
2. Section "Search any coin": a `CoinPicker`; when a coin is selected, show a `PriceCard` for it using `usePrices([coin.id])`, with a "watch" list kept in `localStorage` key `crypto-tracker.watchlist` (array of `CoinSearchResult`, max 20) so searched coins persist between visits; each watched coin renders a `PriceRow` with a remove button. Wrap all `localStorage` access in try/catch.
3. `PriceRow.tsx`: thumb (if any), symbol, name, price in base currency (pick the quote field matching `settings.baseCurrency`: `usd`/`eur`/`sar`/`try`, format with `formatFiat`), 24h change `Badge`/`PnlText` with `formatPct`. Missing quote → em dash and a "no price" `Badge`.
4. i18n `prices.json` (en + real Arabic).

## Constraints

- Logical Tailwind utilities only, touch targets, no `any`, no TODOs, no hard-coded strings, no new dependencies.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/prices apps/web/src/i18n/en/prices.json apps/web/src/i18n/ar/prices.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/prices` returns nothing.
- [ ] en/ar key sets identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/prices apps/web/src/i18n/en/prices.json apps/web/src/i18n/ar/prices.json
git status --short apps/web
```

## Report

Format from your agent instructions.
