# Task U2: Transactions page redesign

## Goal

Rebuild `src/features/transactions` on the new design foundation per `docs/DESIGN.md` section 7 "Transactions": list rows with coin avatars and Buy/Sell badges, a bottom-sheet form with a segmented Buy/Sell control and a live total strip, a proper delete confirmation, skeletons, and a composed empty state. Behaviour (queries, validation, error handling) stays exactly as it is.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/DESIGN.md` (2, 3, 5, 7, 9), `src/components/ui/index.ts` + the components (`Panel`, `ListRow`, `Avatar`, `Badge`, `Button`, `IconButton`, `SegmentedControl`, `Dialog`, `Field`, `Input`, `Select`, `Textarea`, `Skeleton`, `EmptyState`, `ErrorMessage`, `useToast`), `src/components/icons.tsx`, `src/components/CoinPicker.tsx`, `src/lib/format.ts`, current `src/features/transactions/**`, `src/i18n/{en,ar}/transactions.json`, `packages/shared/src/transactions.ts`.
- Contracts you keep: `TransactionsPage` export, `transactionsQueryKey`.

## Parallel work warning

Other workers edit the other feature folders. Do not touch `src/components/**`, `src/app/**`, `src/index.css`. No installs, no `vite build`.

## Files you own

- `apps/web/src/features/transactions/**`
- `apps/web/src/i18n/en/transactions.json`, `apps/web/src/i18n/ar/transactions.json`

## Steps

1. `TransactionsPage.tsx`: `PageHeader` with title, subtitle count ("12 transactions"), primary pill "Add transaction" (`Icon.Plus` leading) and a secondary ghost "Import CSV" (`Icon.FileCsv`) linking to `/import`. Filters: two `Select`s in one row inside a `Panel` header strip (or as a compact filter bar above the list), coin options from the unfiltered query as now. List: `Panel flush` containing `ListRow`s: leading `Avatar` monogram, title `BTC` + `Badge` Buy/Sell (gain/loss tone), subtitle `Jan 10, 2026 · 0.5 BTC @ $60,000` (one middle dot max), trailing total (tabular, medium) and a `IconButton` overflow (`Icon.DotsThree`) opening a small action `Dialog`/menu with Edit / Delete on phone; on `md+` show Edit/Delete `IconButton`s inline on hover/focus (always visible on touch). Group rows by month with a small `--ink-2` label row ("January 2026"). Fee shown in the subtitle only when non-zero.
2. `TransactionForm.tsx`: `Dialog` (bottom sheet on phone). Order: `SegmentedControl` Buy | Sell (full width, gain/loss tint on the selected pill); `CoinPicker`; quantity and price side by side on `md+` (stack on phone), both `inputMode="decimal"`; currency `Select`; fee (collapsed behind a "Add fee" ghost link until clicked, or visible when editing with fee > 0); date-time input; note `Textarea`. Live total strip: `--surface-2` block above the footer showing "Total 0.5 BTC × $60,000 = $30,000". Errors per field via `Field`; server error in `ErrorMessage` at top; submit button `loading`. On success: close and `useToast().success('Transaction saved')`.
3. `DeleteTransactionDialog.tsx`: `Dialog` with the row summary and a `danger` button; success toast "Transaction deleted".
4. Loading: 6 `ListRow.Skeleton`; error `ErrorMessage`; empty `EmptyState` (`Icon.Coins`, "No transactions yet", one primary action "Add transaction").
5. i18n en + real Arabic; remove unused keys.
6. Verify: DEV fixture like the dashboard task (`?fixture` renders 8 mock transactions), screenshots at 390 / 1366, light / dark, plus the open form sheet on phone, into `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\u2-*.png`. Servers are probably running on 8787/5173; start only if not.

## Constraints

- No commits, pushes, installs. No `any`, no TODOs, zero em-dashes, logical utilities only, i18n everywhere, no hand-drawn SVG, no emoji.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name errors confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/transactions apps/web/src/i18n/en/transactions.json apps/web/src/i18n/ar/transactions.json` exits 0.
- [ ] Screenshots attached; en/ar keys identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/transactions apps/web/src/i18n/en/transactions.json apps/web/src/i18n/ar/transactions.json
git status --short apps/web/src/features/transactions
```

## Report

Format from your agent instructions.
