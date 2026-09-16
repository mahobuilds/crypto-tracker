# Task W1: Transactions UI

## Goal

The screen where the user records and reviews trades: a list of transactions with filters, an add/edit form in a dialog with a coin picker, and a delete confirmation. It must be fast to use on a phone by a non-technical person.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 15, 16), 2.1, 2.4, 2.5.
  - `docs/PRD.md` — section 6.3.
  - `apps/web/src/components/ui/index.ts` and every component it exports; `src/components/CoinPicker.tsx`; `src/lib/api.ts`, `src/lib/format.ts`, `src/lib/query.ts`; `src/app/settings/SettingsProvider.tsx` (`useSettings`); `src/hooks/useFx.ts`; `src/i18n/index.ts` and `src/i18n/en/common.json`; `src/app/WelcomePage.tsx` (page style).
  - `packages/shared/src/types.ts` (`Transaction`, `TransactionInput`, `TransactionListResponse`), `transactions.ts` (`transactionInputSchema` — reuse for client-side validation), `constants.ts`.
- API (exists after integration; you cannot call it now): `GET /api/transactions?coinId=&type=` → `TransactionListResponse`; `POST /api/transactions` (`TransactionInput`) → `Transaction` 201; `PUT /api/transactions/:id` → `Transaction`; `DELETE /api/transactions/:id` → 204. Errors: `{ error: { code, message } }`; `409 INSUFFICIENT_HOLDINGS` when a sell exceeds holdings — show its `message` in the form.
- Contracts you provide: `export { TransactionsPage } from './TransactionsPage'` in `apps/web/src/features/transactions/index.ts`. Route path will be `/transactions` (master wires it). Also `export const transactionsQueryKey = ['transactions'] as const` from `features/transactions/queries.ts` — other features invalidate it after import.

## Parallel work warning

Other workers own `src/features/dashboard`, `prices`, `settings`, `alerts`, `import`, `src/sw.ts`, and API folders. Do not touch them. Do not edit anything outside your owned files (no changes to `components/ui`, `app/**`, `i18n/en/common.json`; if a shared component lacks something you need, build it locally inside your feature folder and mention it under Open issues). No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/transactions/**` (new)
- `apps/web/src/i18n/en/transactions.json`, `apps/web/src/i18n/ar/transactions.json` (new; top-level key `transactions`)

## Steps

1. `queries.ts`: `useTransactions(filter)` (`useQuery`, key `[...transactionsQueryKey, filter]`), `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` (`useMutation`, invalidate `transactionsQueryKey` and `['portfolio']` on success).
2. `TransactionsPage.tsx`: `PageHeader` with title and an "Add" `Button` (primary, lg). Filters row: coin `Select` (options built from distinct coins in the loaded list, "All coins") and type `Select` (all / buy / sell). List: on phones a stack of `Card`s, on `md+` a table; each row shows date (`formatDate`), coin symbol + name, type `Badge` (buy = positive tone, sell = negative), quantity (`formatQuantity`), price per unit (`formatFiat` in the transaction's own `currency`), total (`quantity * pricePerUnit` in that currency), fee if non-zero, note (truncated), and edit/delete icon buttons with `aria-label`s. Loading → `Spinner`; error → `ErrorMessage` with retry; empty → `EmptyState` with an "Add your first transaction" action.
3. `TransactionForm.tsx` inside a `Dialog`: fields type (two large segmented buttons Buy/Sell), coin (`CoinPicker`; when editing, preselect from the transaction), quantity, price per unit, currency (`Select` from `CURRENCIES`, default the user's `settings.baseCurrency`), fee (default 0), date and time (`<input type="datetime-local">`, default now, converted to ISO on submit), note (`Textarea`). Live total preview. Validate with `transactionInputSchema.safeParse` on submit; show per-field errors via `Field`. Submit shows `loading`; server errors (including 409) shown in an `ErrorMessage` at the top of the form. On success close the dialog.
4. `DeleteTransactionDialog.tsx`: confirmation with the coin/quantity/date and a danger `Button`.
5. `formatTransactionTotal` helper + a tiny `toDatetimeLocal(iso)` / `fromDatetimeLocal(value)` pair in `utils.ts` with unit tests? The web package has no vitest; keep `utils.ts` small and pure (no tests required here).
6. i18n: all strings in `transactions.json` under the `transactions` key, English and real Arabic (buy = شراء, sell = بيع, etc.). Use `useTranslation()` with keys like `transactions.title`.

## Constraints

- Logical Tailwind utilities only (no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`).
- Every interactive element has `touch-target`. Inputs use `inputMode="decimal"` for numbers.
- No `any`, no TODOs, no hard-coded English strings.
- No new dependencies.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' feature folders if any).
- [ ] `pnpm exec prettier --check apps/web/src/features/transactions apps/web/src/i18n/en/transactions.json apps/web/src/i18n/ar/transactions.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/transactions` returns nothing.
- [ ] Both JSON files have the identical key set (verify with a quick `node -e` script and paste the result).

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/transactions apps/web/src/i18n/en/transactions.json apps/web/src/i18n/ar/transactions.json
git status --short apps/web
```

## Report

Format from your agent instructions.
