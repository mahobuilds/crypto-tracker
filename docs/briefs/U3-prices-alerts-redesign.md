# Task U3: Prices and Alerts pages redesign

## Goal

Rebuild `src/features/prices` and `src/features/alerts` on the new design foundation per `docs/DESIGN.md` section 7 ("Prices", "Alerts"). Behaviour, queries, push subscription logic and the service worker stay exactly as they are; only presentation changes.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/DESIGN.md` (2, 3, 5, 7, 9), `src/components/ui/index.ts` + components (`Panel`, `ListRow`, `Avatar`, `Badge`, `Button`, `IconButton`, `SegmentedControl`, `Dialog`, `Field`, `Input`, `Skeleton`, `EmptyState`, `ErrorMessage`, `useToast`, `PnlText`), `src/components/icons.tsx`, `src/components/CoinPicker.tsx`, `src/hooks/usePrices.ts`, `src/lib/format.ts`, current `src/features/prices/**`, `src/features/alerts/**`, `src/i18n/{en,ar}/{prices,alerts}.json`.
- Contracts you keep: `PricesPage`, `AlertsPage`, `AlertBanner` exports; `alertsQueryKey`.

## Parallel work warning

Other workers edit dashboard, transactions, import, settings. Do not touch `src/components/**`, `src/app/**`, `src/index.css`, `src/sw.ts`. No installs, no `vite build`.

## Files you own

- `apps/web/src/features/prices/**`, `apps/web/src/features/alerts/**`
- `apps/web/src/i18n/{en,ar}/prices.json`, `apps/web/src/i18n/{en,ar}/alerts.json`

## Steps

### Prices
1. `PricesPage`: `PageHeader` with title and caption "Updated 12 s ago". Panel "Your coins": `ListRow`s with `Avatar` (thumb if present else monogram), title symbol, subtitle name, trailing price (tabular, semibold) over 24 h `PnlText` with arrow icon. Empty → `EmptyState` linking to `/transactions`.
2. Panel "Search any coin": `CoinPicker`; selected coin renders a `PriceCard` as a `StatCard`-like block inside the panel (price display size, 24 h delta, "Add to watchlist" secondary pill); watchlist `ListRow`s below with trailing `IconButton` remove (`Icon.X`, `aria-label`). Watchlist persistence unchanged.
3. Loading skeletons (4 rows), error states.

### Alerts
4. `AlertsPage`: `PageHeader` with primary pill "New alert". If alerts are off: `Panel tone="accent"` with `Icon.BellRinging` in an accent circle, one sentence, one primary pill "Turn on alerts". Notifications panel: `ListRow` with status `Badge` (on = gain tone, off = neutral, blocked = warn, unsupported = neutral) and a trailing `Button` (Turn on / Turn off) or nothing when unsupported/blocked (explain in the subtitle).
5. Alert list: `Panel flush` of `ListRow`s: `Avatar` monogram, title `BTC ≥ $1,000` (condition in the title, tabular), subtitle "Now $77,728 · base-currency hint" (one middle dot), trailing status `Badge` (Active accent / Triggered warn with date / Paused neutral). Actions: on phone an overflow `IconButton` (`Icon.DotsThree`) opening a small action sheet `Dialog` (Re-arm, Edit, Delete); on `md+` inline `IconButton`s. Sections "Active" and "Triggered" with small `--ink-2` labels.
6. `AlertForm`: `Dialog` sheet; `CoinPicker`; `SegmentedControl` "Goes above | Goes below"; target price `Input` (`inputMode="decimal"`, currency prefix "$"); quick-fill row as small secondary pills ("Current", "+5%", "-5%"); validation unchanged; toast on save.
7. `AlertBanner`: `Panel tone="warn"` compact: icon, title, one-line list, dismiss `IconButton`. Keep the localStorage logic.
8. Delete confirmation via `Dialog` (already), restyled with danger button.
9. i18n en + real Arabic; remove unused keys.
10. Verify with DEV fixtures (`?fixture`) for both pages, screenshots at 390/1366 light/dark into `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\u3-*.png`.

## Constraints

- No commits, pushes, installs. No `any`, no TODOs, zero em-dashes, logical utilities only, i18n everywhere, no hand-drawn SVG, no emoji, no decorative dots.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name errors confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/prices apps/web/src/features/alerts apps/web/src/i18n/en/prices.json apps/web/src/i18n/ar/prices.json apps/web/src/i18n/en/alerts.json apps/web/src/i18n/ar/alerts.json` exits 0.
- [ ] Screenshots attached; en/ar keys identical for both files.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/prices apps/web/src/features/alerts apps/web/src/i18n/en/prices.json apps/web/src/i18n/ar/prices.json apps/web/src/i18n/en/alerts.json apps/web/src/i18n/ar/alerts.json
git status --short apps/web/src/features/prices apps/web/src/features/alerts
```

## Report

Format from your agent instructions.
