# Task W6: CSV import page

## Goal

A screen where the user uploads a CSV of transactions, sees a preview with invalid rows highlighted, and confirms the import. A sample CSV is offered for download so the format is obvious.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 15, 16), 2.1, 2.4, 2.5.
  - `docs/PRD.md` — section 6.4.
  - `apps/web/src/components/ui/index.ts` and components; `src/lib/api.ts`, `src/lib/format.ts`, `src/lib/query.ts`; `src/app/settings/SettingsProvider.tsx`; `src/i18n/en/common.json`; `src/app/WelcomePage.tsx`.
  - `packages/shared/src/types.ts` (`ImportRequest`, `ImportResponse`, `ImportRowResult`), `csv/` (`parseTransactionsCsv`, `SAMPLE_CSV`, `CSV_COLUMNS` — use the parser client-side for an instant local pre-check before calling the API).
- API: `POST /api/transactions/import` with `{ csv, mode: 'preview' | 'commit' }` → `ImportResponse`; 400 `VALIDATION_ERROR` with a message when the header is invalid or commit is attempted with errors.
- Contracts you provide: `export { ImportPage } from './ImportPage'` in `apps/web/src/features/import/index.ts`. Route path `/import` (master wires it; the transactions page links to it).

## Parallel work warning

Other workers own the other `src/features/*` folders, `src/sw.ts`, and API folders. Touch nothing outside your owned files. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/import/**` (new)
- `apps/web/public/sample-transactions.csv` (new; content must equal `SAMPLE_CSV` from shared)
- `apps/web/src/i18n/en/import.json`, `apps/web/src/i18n/ar/import.json` (top-level key `import`)

## Steps

1. `ImportPage.tsx`: `PageHeader` with title and a "Download sample CSV" link (`<a href="/sample-transactions.csv" download>` styled as a secondary `Button`). Step 1 card: expected columns list (from `CSV_COLUMNS`) with one-line descriptions; a file input (`accept=".csv,text/csv"`, large drop-zone styled label with `touch-target`) and a `Textarea` alternative for pasting CSV. Read the file with `File.text()`; limit 1 MB.
2. Local pre-check: run `parseTransactionsCsv(text, { defaultCurrency: settings.baseCurrency })`; show header errors immediately without calling the API. Otherwise call the API in `preview` mode (coins are resolved server-side) and render the preview table.
3. `PreviewTable.tsx`: one row per `ImportRowResult` — line number, date, type, coin, quantity, price, currency, fee, note; rows with errors get a red start-side border and an expandable error list; summary line "N valid, M with errors". Phones: stacked cards.
4. Commit: `Button` "Import N transactions" enabled only when `errorCount === 0`; on success show a success `Card` with the count and a link to `/transactions`; invalidate `['transactions']` and `['portfolio']` queries.
5. `public/sample-transactions.csv`: write exactly `SAMPLE_CSV` (generate it with a one-off `node -e` that imports nothing: copy the string from `packages/shared/src/csv/sample.ts` by reading that file) — and state in your report that the two are byte-identical (compare with a `node -e` diff).
6. i18n `import.json` (en + real Arabic).

## Constraints

- Logical Tailwind utilities only, touch targets, no `any`, no TODOs, no hard-coded strings, no new dependencies.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/import apps/web/src/i18n/en/import.json apps/web/src/i18n/ar/import.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/import` returns nothing.
- [ ] `public/sample-transactions.csv` equals `SAMPLE_CSV`.
- [ ] en/ar key sets identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/import apps/web/src/i18n/en/import.json apps/web/src/i18n/ar/import.json
git status --short apps/web
```

## Report

Format from your agent instructions.
