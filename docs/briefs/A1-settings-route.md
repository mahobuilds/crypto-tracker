# Task A1: `PUT /api/settings`

## Goal

Add the route that saves the user's settings. It validates a partial `Settings` body, merges it into the stored settings, saves, and returns the full `Settings` object.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `C:\Users\medoh\Documents\crypto-tracker\docs\WORK_PLAN.md` — sections 1, 2.3, 2.4.
  - `apps/api/src/routes/me.ts`, `apps/api/src/db/settings.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/errors.ts`, `apps/api/src/types.ts` — reuse exactly these helpers.
  - `packages/shared/src/settings.ts` — `settingsUpdateSchema`.
- Contracts you build against: `requireAuth`, `getOrCreateSettings`, `saveSettings`, `ApiError`, `AppEnv`, `settingsUpdateSchema`, shared `Settings`.
- Contracts you provide: `export function createSettingsRoutes(): Hono<AppEnv>` from `apps/api/src/routes/settings.ts`. The master mounts it at `/api/settings`.

## Parallel work warning

Eleven other workers are active. In `apps/api` they own `routes/transactions.ts`, `routes/import.ts`, `routes/prices.ts`, `routes/coins.ts`, `routes/portfolio.ts`, `routes/alerts.ts`, `routes/push.ts`, `services/**`, `cron/*.ts` (not `cron/index.ts`). Do not touch any of those, nor `src/index.ts`. Do not run installs or `wrangler dev`.

## Files you own

- `apps/api/src/routes/settings.ts` (new)
- `apps/api/src/routes/settings.test.ts` (new)

## Steps

1. `createSettingsRoutes()` returns `new Hono<AppEnv>()` with `requireAuth` applied and one handler `PUT /`:
   - Parse JSON body; on invalid JSON throw `ApiError(400, 'VALIDATION_ERROR', 'Body must be JSON')`.
   - `settingsUpdateSchema.safeParse(body)`; on failure throw `ApiError(400, 'VALIDATION_ERROR', <path>: <first issue message>)`.
   - Reject an empty patch (`{}`) with `ApiError(400, 'VALIDATION_ERROR', 'No settings provided')`.
   - `current = await getOrCreateSettings(db, user.id)`; `next = { ...current, ...patch }` (a provided `chartPrefs` replaces the whole object); `return c.json(await saveSettings(db, user.id, next))`.
2. Extract the pure merge into `export function mergeSettings(current: Settings, patch: SettingsUpdate): Settings` and unit-test it (patch overrides, untouched fields preserved, `chartPrefs` replaced whole, empty patch returns an equal object).

## Constraints

- No commits, pushes, installs. No new dependencies. No TODOs.
- Do not duplicate helpers that exist in `db/settings.ts`.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` exits 0 (if it fails only in files owned by other workers, say so with the file names and continue).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/routes/settings` passes with at least 4 tests.
- [ ] `pnpm exec prettier --check apps/api/src/routes/settings.ts apps/api/src/routes/settings.test.ts` exits 0.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/routes/settings
pnpm exec prettier --check apps/api/src/routes/settings.ts apps/api/src/routes/settings.test.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
