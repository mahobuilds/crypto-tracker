# Task W4: Settings page

## Goal

A simple settings screen: language, base currency, large text, theme, price alerts on/off, chart preferences, and sign out. Every change saves immediately through `useSettings().updateSettings` and applies at once.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 15, 16), 2.1, 2.5.
  - `docs/PRD.md` — sections 6.9, 8.
  - `apps/web/src/components/ui/index.ts` and components; `src/app/settings/SettingsProvider.tsx` (`useSettings`); `src/app/auth/client.ts` (`signOut`); `src/i18n/en/common.json`, `src/i18n/en/auth.json`; `src/app/WelcomePage.tsx`.
  - `packages/shared/src/types.ts` (`Settings`, `ChartPrefs`), `constants.ts` (`LANGUAGES`, `CURRENCIES`, `THEMES`, `CURRENCY_SYMBOLS`, `CHART_KINDS`).
- Contracts you provide: `export { SettingsPage } from './SettingsPage'` in `apps/web/src/features/settings/index.ts`.

## Parallel work warning

Other workers own the other `src/features/*` folders, `src/sw.ts`, and API folders. Touch nothing outside your owned files. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/settings/**` (new)
- `apps/web/src/i18n/en/settings.json`, `apps/web/src/i18n/ar/settings.json` (top-level key `settings`)

## Steps

1. `SettingsPage.tsx`: `PageHeader`; a `Card` with the signed-in user's name/email/avatar (`useSettings().user`) and a "Sign out" `Button` (secondary, lg) calling `signOut()`.
2. A `Card` "Display": language (`Select`: English / العربية — label each language in its own script), base currency (`Select` with symbol + code), theme (`Select`: light / dark / system), large text (`Toggle`).
3. A `Card` "Alerts": `Toggle` for `alertsEnabled` with a hint sentence explaining push notifications; when turning on, nothing else here (the alerts feature handles the push permission prompt on its own page).
4. A `Card` "Dashboard charts": `Toggle`s for line and pie chart plus a "Show first" `Select` (`line` or `pie`) that rewrites `chartPrefs.order`.
5. Saving state: while `isSaving` show a small `Spinner` next to the page title; on `updateSettings` rejection show an `ErrorMessage` at the top with retry of the last change (keep last patch in state).
6. A footer line with the app name and version text "v1.0" from i18n.
7. i18n `settings.json` (en + real Arabic).

## Constraints

- Logical Tailwind utilities only, touch targets, no `any`, no TODOs, no hard-coded strings, no new dependencies.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' folders).
- [ ] `pnpm exec prettier --check apps/web/src/features/settings apps/web/src/i18n/en/settings.json apps/web/src/i18n/ar/settings.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/settings` returns nothing.
- [ ] en/ar key sets identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/features/settings apps/web/src/i18n/en/settings.json apps/web/src/i18n/ar/settings.json
git status --short apps/web
```

## Report

Format from your agent instructions.
