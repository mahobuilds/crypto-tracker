# Task U4: Import and Settings pages redesign

## Goal

Rebuild `src/features/import` and `src/features/settings` on the new design foundation per `docs/DESIGN.md` section 7 ("Import", "Settings"). Behaviour stays (parsing, preview/commit calls, settings saving); only presentation changes.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/DESIGN.md` (2, 3, 5, 7, 9), `src/components/ui/index.ts` + components (`Panel`, `ListRow`, `Avatar`, `Badge`, `Button`, `IconButton`, `SegmentedControl`, `Toggle`, `Select`, `Field`, `Textarea`, `Skeleton`, `EmptyState`, `ErrorMessage`, `useToast`), `src/components/icons.tsx`, `src/app/settings/SettingsProvider.tsx`, `src/app/auth/client.ts`, current `src/features/import/**`, `src/features/settings/**`, `src/i18n/{en,ar}/{import,settings}.json`, `packages/shared/src/csv/`.
- Contracts you keep: `ImportPage`, `SettingsPage` exports.

## Parallel work warning

Other workers edit dashboard, transactions, prices, alerts. Do not touch `src/components/**`, `src/app/**`, `src/index.css`. No installs, no `vite build`.

## Files you own

- `apps/web/src/features/import/**`, `apps/web/src/features/settings/**`
- `apps/web/src/i18n/{en,ar}/import.json`, `apps/web/src/i18n/{en,ar}/settings.json`

## Steps

### Import
1. `ImportPage`: `PageHeader` with title, one-sentence subtitle, secondary pill "Download sample CSV" (`Icon.FileCsv`). Step indicator: plain text "Step 1 of 3 · Prepare" as a caption (no numbered eyebrows, no progress bars with tracks). Step 1 `Panel`: expected columns as a compact two-column definition list (column name in `--ink` medium, description in `--ink-2`), then a dashed drop-zone (`border-2 border-dashed border-line rounded-[var(--r-md)]`, `Icon.Upload` in an accent circle, "Choose a CSV file or drop it here", 48 px+ tall label as the click target), and a "Paste rows instead" disclosure revealing the `Textarea`.
2. Step 2 `Panel`: summary strip ("8 valid · 2 need attention" with gain/loss `Badge`s), preview as `ListRow`s on phone (line number, date, type badge, coin, quantity × price; error rows with `--loss-soft` background and an expandable error list) and a table on `md+` inside `Panel flush`. Footer: secondary "Start over", primary "Import 8 transactions" (disabled with a helper line while errors exist).
3. Step 3: success `Panel tone="gain"` with `Icon.Check` circle, count, primary pill "View transactions". Toast on success too.
4. Header errors and API errors in `ErrorMessage`.

### Settings
5. `SettingsPage`: `PageHeader`. Account `Panel`: `ListRow` with `Avatar` (image or initials), name, email; trailing nothing. Display `Panel`: `ListRow`s "Language" (trailing `SegmentedControl` EN | العربية), "Base currency" (trailing `Select`), "Theme" (trailing `SegmentedControl` with `Icon.Sun` / `Icon.Moon` / "Auto"), "Large text" (trailing `Toggle`). Alerts `Panel`: `ListRow` "Price alerts" with `Toggle` and a subtitle sentence. Charts `Panel`: `ListRow`s "Profit and loss chart" `Toggle`, "Allocation chart" `Toggle`, "Show first" `SegmentedControl`. Bottom: a lone `danger`-variant ghost `Button` "Sign out" (`Icon.SignOut`), full width on phone, separated by 32 px. Saving indicator: small `Spinner` in the header while `isSaving`; failure → `ErrorMessage` with retry (keep current logic). Footer caption "Crypto Tracker v1.0" in `--ink-3`.
6. On `md+` the settings page is a single column `max-w-2xl`.
7. i18n en + real Arabic for all strings; remove unused keys.
8. Verify with DEV fixtures where needed (import preview step with mock rows via `?fixture`), screenshots at 390/1366 light/dark into `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\u4-*.png`. The settings page needs a signed-in session; screenshot it with a DEV fixture too (mock `useSettings` values behind `import.meta.env.DEV && ?fixture`).

## Constraints

- No commits, pushes, installs. No `any`, no TODOs, zero em-dashes, logical utilities only, i18n everywhere, no hand-drawn SVG, no emoji.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name errors confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/import apps/web/src/features/settings apps/web/src/i18n/en/import.json apps/web/src/i18n/ar/import.json apps/web/src/i18n/en/settings.json apps/web/src/i18n/ar/settings.json` exits 0.
- [ ] Screenshots attached; en/ar keys identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/import apps/web/src/features/settings apps/web/src/i18n/en/import.json apps/web/src/i18n/ar/import.json apps/web/src/i18n/en/settings.json apps/web/src/i18n/ar/settings.json
git status --short apps/web/src/features/import apps/web/src/features/settings
```

## Report

Format from your agent instructions.
