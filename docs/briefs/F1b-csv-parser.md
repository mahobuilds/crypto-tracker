# Task F1b: Shared CSV parser for transaction import

## Goal

Implement a dependency-free CSV parser and row validator in `packages/shared/src/csv/` so the API import route and the web import preview both use the same rules. Given the text of an uploaded file, it returns one result per data row with either the parsed values or a list of human-readable errors, plus a sample CSV string the app offers for download.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `C:\Users\medoh\Documents\crypto-tracker\docs\WORK_PLAN.md` — sections 1 and 2.
  - `C:\Users\medoh\Documents\crypto-tracker\docs\PRD.md` — section 6.4 "CSV Import".
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\types.ts` and `constants.ts`.
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\constants.test.ts` — test style.
- Contracts you build against: `Currency`, `CURRENCIES`, `TransactionType`, `TRANSACTION_TYPES` from constants.
- Contracts you provide (WORK_PLAN.md 2.2 row 7): `parseTransactionsCsv`, `CSV_COLUMNS`, `SAMPLE_CSV`, types `CsvRowValues`, `CsvRowResult`, `CsvParseResult`.
- Conventions: TypeScript strict, ESM, no `any`, Prettier at repo root, Vitest 4.

## Parallel work warning

Other workers are editing `packages/shared/src/portfolio/**`, `packages/shared/src/{settings,transactions,alerts,push,history}.ts`, `apps/api/**`, and `apps/web/**`. Do not read or touch them. Do not use zod here; the other shared worker owns the zod schemas, and this module must stay dependency-free so validation messages are fully under your control.
`packages/shared/src/index.ts` is also edited by that worker. Re-read it immediately before editing, append exactly one line `export * from './csv';` at the end, and remove nothing.
Do not run any install command.

## Files you own

- `packages/shared/src/csv/index.ts`, `parse.ts`, `rows.ts`, `sample.ts` and `*.test.ts` files (new)
- `packages/shared/src/index.ts` — append one export line only

## Steps

### 1. `parse.ts` — generic CSV tokenizer

`export function parseCsv(text: string): string[][]` implementing RFC 4180 essentials:
- Field separator `,`; records separated by `\n`, `\r\n`, or `\r`.
- Double-quoted fields may contain commas, newlines, and escaped quotes (`""`).
- A UTF-8 BOM at the start is stripped.
- Trailing empty line(s) are ignored; interior blank lines produce an empty record `[]` that the caller skips.
- Whitespace around unquoted fields is trimmed; inside quotes it is preserved.

### 2. `rows.ts` — header and row validation

```ts
export const CSV_COLUMNS = ['date', 'type', 'coin', 'quantity', 'price', 'currency', 'fee', 'note'] as const;
export interface CsvRowValues {
  occurredAt: string;        // ISO 8601, normalized with new Date(...).toISOString()
  type: TransactionType;
  coin: string;              // ticker or CoinGecko id as typed, trimmed; API resolves it
  quantity: number;
  pricePerUnit: number;
  currency: Currency;
  fee: number;
  note: string | null;
}
export interface CsvRowResult { line: number; values: CsvRowValues | null; errors: string[] }
export interface CsvParseResult { headerErrors: string[]; rows: CsvRowResult[] }
export function parseTransactionsCsv(text: string, options: { defaultCurrency: Currency }): CsvParseResult;
```

Rules:
- Header row is line 1. Column names are matched case-insensitively after trimming. Required: `date`, `type`, `coin`, `quantity`, `price`. Optional: `currency` (defaults to `options.defaultCurrency`), `fee` (defaults to 0), `note` (defaults to null). Unknown columns are ignored. Missing required columns produce `headerErrors` (one per missing column) and an empty `rows` array.
- `line` is the 1-based line number in the file (first data row is line 2). Blank records are skipped.
- `date`: accept ISO 8601 (`2025-01-31`, `2025-01-31T14:00:00Z`, with offset) and `YYYY-MM-DD HH:mm`. A date-only value means midnight UTC. Reject anything `new Date()` cannot parse or that does not match those shapes (do not accept `1/2/2025`; it is ambiguous).
- `type`: `buy` or `sell`, case-insensitive.
- `coin`: non-empty after trim, max 100 chars.
- `quantity`: number > 0. `price`: number >= 0. `fee`: number >= 0. Accept thousands separators `,` only inside quotes (the tokenizer already handled quoting); otherwise plain decimal with `.`.
- `currency`: one of `CURRENCIES`, case-insensitive; empty uses the default.
- `note`: max 500 chars; empty → null.
- Collect **all** errors for a row (do not stop at the first). Error messages are plain English, name the column, and quote the offending value, for example `quantity must be a number greater than 0, got "abc"`.
- Rows with any error have `values: null`.

### 3. `sample.ts`

`export const SAMPLE_CSV: string` — a header line using `CSV_COLUMNS` in order followed by three example rows (a bitcoin buy, an ethereum buy with a note containing a comma inside quotes, a bitcoin sell), using ISO dates and currency `USD`. It must parse with zero errors.

### 4. `index.ts` re-exports everything public from the three modules. Append `export * from './csv';` to `packages/shared/src/index.ts`.

### 5. Tests

`parse.test.ts`: simple rows; quoted commas; escaped quotes; CRLF; BOM; trailing newline; interior blank line.
`rows.test.ts`: valid file with all columns; optional columns missing; header case-insensitivity; missing required column → headerErrors; each validation rule rejects with a message naming the column; multiple errors on one row are all reported; line numbers correct after a blank line; `SAMPLE_CSV` parses with zero errors and three rows.

## Constraints

- No commits, pushes, or installs. No dependencies (not even zod).
- No `any`. Pure functions, no I/O.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/shared typecheck` exits 0.
- [ ] `pnpm --filter @crypto-tracker/shared test -- csv` exits 0 with at least 20 passing tests in the csv folder.
- [ ] `pnpm exec prettier --check packages/shared/src/csv` (from project root) exits 0.
- [ ] `git status --short` shows your changes only under `packages/shared/src/csv/` and `packages/shared/src/index.ts`.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/shared typecheck
pnpm --filter @crypto-tracker/shared test -- csv
pnpm exec prettier --check packages/shared/src/csv
git status --short
```

## Report

Return the report in the format defined in your agent instructions. Include the Vitest test-count line.
