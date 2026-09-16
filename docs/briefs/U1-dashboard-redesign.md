# Task U1: Dashboard redesign + P/L chart (replaces the portfolio-value snapshot chart)

## Goal

Rebuild `src/features/dashboard` on the new design foundation: hero stat cards, a **profit/loss area chart** in place of the old "Portfolio value" line chart, an allocation donut with a proper legend, and holdings as list rows / table. It must read as the calm, premium finance screen described in `docs/DESIGN.md` sections 7 and 8.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/DESIGN.md` (sections 2, 3, 5, 7 "Dashboard", 8, 9 are binding), then `src/components/ui/index.ts` and each component you will use (`Panel`, `StatCard`, `SegmentedControl`, `ListRow`, `Avatar`, `Badge`, `PnlText`, `Skeleton`, `EmptyState`, `ErrorMessage`, `IconButton`, `Dialog`, `Toggle`), `src/components/icons.tsx`, `src/lib/format.ts`, `src/app/settings/SettingsProvider.tsx`, `src/hooks/useFx.ts`, the current `src/features/dashboard/**` and `src/i18n/{en,ar}/dashboard.json`, `packages/shared/src/types.ts` (`PortfolioSummary`, `Holding`, `PortfolioHistoryResponse`).
- Chart rules: bundled dataviz skill at `C:\Users\medoh\AppData\Local\Temp\claude\bundled-skills\2.1.272\21276d94c1572d37ade9aa92e44cbf7a\dataviz\references\` — read `marks-and-anatomy.md`, `interaction.md`, `anti-patterns.md`. Palette is already validated (DESIGN.md section 2).
- Recharts 3 is installed (read its types for `AreaChart`, `Area`, `ReferenceLine`, `Tooltip`, `PieChart`, `Pie`, `Cell`, `ResponsiveContainer`).
- Contracts you keep: `export { DashboardPage }` from `features/dashboard/index.ts`; `portfolioQueryKey` from `queries.ts`.

## Parallel work warning

Other workers edit `src/features/{transactions,prices,alerts,import,settings}` and their i18n files. Do not touch `src/components/**`, `src/app/**`, `src/index.css`, or other features. If a kit component lacks something, compose locally inside your feature and note it. No installs, no `vite build`.

## Files you own

- `apps/web/src/features/dashboard/**`
- `apps/web/src/i18n/en/dashboard.json`, `apps/web/src/i18n/ar/dashboard.json`

## Steps

1. Delete `ValueChart.tsx`; create `PnlChart.tsx` exactly per DESIGN.md section 8 (area with sign-split gradient, zero reference line, `$ | %` and range segmented controls, header stat block, crosshair tooltip, touch highlight, compact tabular y-axis, horizontal grid only, accessible `aria-label`, "Show table" disclosure rendering a small `ListRow`/table of the points, empty state for < 2 points, skeleton while loading). Range default `30d`; remember the last range in `localStorage` (`crypto-tracker.dashboard.pnlRange`, try/catch).
2. `DashboardPage.tsx`: `PageHeader` (title, caption "Updated 2 min ago" via `formatRelative`; "prices unavailable" text when null); hero grid: `StatCard` Total value (display) with delta = unrealized P/L %; `StatCard` Unrealized P/L (signed money + %); `StatCard` Invested; `StatCard` Realized P/L. 1 column on phone, 2×2 on `md`, 4 across on `lg`. Charts in `settings.chartPrefs.order` (line → P/L chart, pie → allocation) filtered by the toggles; `ChartSettingsButton` becomes an `IconButton` (Phosphor `SlidersHorizontal` via `Icon.Sliders`? If not in the map, use `Icon.DotsThree`) opening the existing `Dialog` with `Toggle`s; keep saving through `updateSettings`.
3. `AllocationChart.tsx`: `Panel` with the donut (inner radius 60 %, 2 px surface gap between slices via `paddingAngle` + stroke `--surface`) and a legend list beside it on `md+` / below on phone, each legend row: color dot (only place a dot is allowed), symbol, allocation %, value; colors from the validated palette in fixed order by value rank at first render and **stable thereafter** (map coinId → color once per session); 7th+ → "Other".
4. `HoldingsTable.tsx`: phone → `ListRow`s with `Avatar` monogram, symbol + name, trailing value + `PnlText` %; desktop → table inside `Panel flush` with header row in `--surface-2`, columns symbol/qty/avg cost/price/value/P/L/allocation, tabular numbers, rows 56 px, hover `--surface-2`. Unpriced holding → em dash replaced by "no price" `Badge` (neutral).
5. Loading: skeleton hero (4 `StatCard.Skeleton`), chart skeleton, 4 `ListRow.Skeleton`. Error: `ErrorMessage` with retry. Empty: `EmptyState` (icon `Coins`, "Add your first transaction", link to `/transactions`).
6. i18n: update `dashboard.json` (en + real Arabic) for all new strings; remove unused keys.
7. Verify in the browser: `pnpm --filter @crypto-tracker/api dev` + `pnpm --filter @crypto-tracker/web dev` are likely already running (check ports 8787/5173; start only if not). Signed-in data needs Google, so verify layout using the DEV kitchen-sink route? No: build a DEV-only fixture: in `DashboardPage`, if `import.meta.env.DEV && new URLSearchParams(location.search).has('fixture')`, render with a local mock `PortfolioSummary` + history (48 hourly points crossing zero) instead of the queries. Screenshot `/?fixture` at 390 px and 1366 px, light and dark, into `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\u1-*.png`. The fixture branch must be tree-shaken in production (`import.meta.env.DEV` guard).

## Constraints

- No commits, pushes, installs. No `any`, no TODOs, zero em-dashes, logical utilities only, i18n for every string, no hand-drawn SVG, no emoji.
- Do not edit files outside your ownership.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (errors confined to other workers' folders must be named).
- [ ] `pnpm exec prettier --check apps/web/src/features/dashboard apps/web/src/i18n/en/dashboard.json apps/web/src/i18n/ar/dashboard.json` exits 0.
- [ ] `ValueChart.tsx` no longer exists; `PnlChart.tsx` implements every bullet of DESIGN.md section 8.
- [ ] Screenshots (4) attached; en/ar keys identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/dashboard apps/web/src/i18n/en/dashboard.json apps/web/src/i18n/ar/dashboard.json
git status --short apps/web/src/features/dashboard
```

## Report

Format from your agent instructions.
