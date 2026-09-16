# Task F2: API skeleton — Hono app, schema, migration, Better Auth with Google, middleware, `/api/health`, `/api/me`, cron registry, contracts

## Goal

Build the Cloudflare Worker foundation every wave-1 API task plugs into. When you are done: the Worker starts with `wrangler dev`, Drizzle describes every table the app will ever use, the first migration applies to the local D1 database, Better Auth handles Google sign-in with sessions in D1, `withContext` and `requireAuth` middleware exist, `GET /api/health` and `GET /api/me` work, a cron registry dispatches scheduled jobs, and `src/contracts.ts` declares the dependency-injection interfaces other tasks implement or consume.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `C:\Users\medoh\Documents\crypto-tracker\docs\WORK_PLAN.md` — sections 1, 2.1, 2.3, 2.4 are binding. The export names in 2.3 are contracts; other tasks are being briefed against them right now.
  - `C:\Users\medoh\Documents\crypto-tracker\docs\TECH_STACK.md` — sections 5–7.
  - `C:\Users\medoh\Documents\crypto-tracker\apps\api\wrangler.jsonc`, `worker-configuration.d.ts` (generated; declares global `Env` with `DB`, `CACHE`, `APP_ORIGIN`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VAPID_*`), `.dev.vars` (local secrets, already filled), `package.json` (scripts and dependencies are final; do not edit).
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\types.ts` and `constants.ts`.
- Environment: Windows 11, Node 24, pnpm 12. Same-origin deployment: `APP_ORIGIN` is the public origin of both SPA and API and is Better Auth's `baseURL`. In development the browser uses Vite on `http://localhost:5173`, which proxies `/api` to wrangler on 8787.
- Installed and ready: `hono` 4.13, `drizzle-orm` 0.45, `drizzle-kit` 0.31, `better-auth` 1.7.4, `zod` 4.6.4, `wrangler` 4.131.1, `vitest` 4. **Read the installed type definitions before using an API** (`apps/api/node_modules/better-auth/dist/**/*.d.mts`, `apps/api/node_modules/drizzle-orm/...`). Better Auth's core table fields are defined in `node_modules/.pnpm/@better-auth+core@1.7.4_*/node_modules/@better-auth/core/dist/db/schema/{user,session,account,verification}.mjs` and `get-tables.mjs`.
- Contracts you build against: `packages/shared` `types.ts` (`Settings`, `DEFAULT_SETTINGS`, `MeResponse`, `CurrentUser`, `PriceQuote`, `FxRates`, `CoinSearchResult`, `ApiErrorBody`) and `constants.ts`. Do **not** import `settingsSchema` or anything from `packages/shared/src/{settings,transactions,alerts,push,history,portfolio,csv}` — another worker is writing those right now and they may not exist yet.
- Contracts you provide: WORK_PLAN.md section 2.3, exactly.

## Parallel work warning

Other workers are editing `packages/shared/src/**` (except `types.ts`/`constants.ts`, which are frozen) and `apps/web/**`. Do not read or touch those folders.
Do not run any install command. Do not edit `apps/api/package.json`, `wrangler.jsonc`, `worker-configuration.d.ts`, `.dev.vars`, or `.dev.vars.example`.
Only you run `wrangler dev` in this wave, on port 8787.

## Files you own

- `apps/api/src/**` (new)
- `apps/api/drizzle.config.ts` (new)
- `apps/api/drizzle/**` (generated migrations)

## Steps

### 1. Utilities

- `src/lib/errors.ts`: `export class ApiError extends Error { constructor(public readonly status: number, public readonly code: string, message: string) }` and `export function errorBody(code: string, message: string): ApiErrorBody`.
- `src/lib/ids.ts`: `export function newId(): string` → `crypto.randomUUID()`.
- `src/lib/time.ts`: `export function nowIso(): string`.

### 2. Drizzle schema — `src/db/schema.ts` (`drizzle-orm/sqlite-core`; column names `snake_case`, properties `camelCase`)

**Better Auth tables** — match the installed core schema exactly (see paths above). Expected:
- `user`: `id` text pk; `name` text notnull; `email` text notnull unique; `emailVerified` integer boolean notnull default false; `image` text; `createdAt`, `updatedAt` integer `{ mode: 'timestamp_ms' }` notnull.
- `session`: `id`; `expiresAt` timestamp_ms notnull; `token` text notnull unique; `createdAt`, `updatedAt`; `ipAddress`, `userAgent` text; `userId` text notnull references `user.id` on delete cascade. Index on `userId`.
- `account`: `id`; `accountId`, `providerId` text notnull; `userId` references cascade; `accessToken`, `refreshToken`, `idToken`, `scope`, `password` text; `accessTokenExpiresAt`, `refreshTokenExpiresAt` timestamp_ms; `createdAt`, `updatedAt`. Index on `userId`.
- `verification`: `id`; `identifier`, `value` text notnull; `expiresAt` timestamp_ms notnull; `createdAt`, `updatedAt`. Index on `identifier`.

If the installed `better-auth` Drizzle adapter or CLI schema uses `timestamp` instead of `timestamp_ms`, follow the installed version and note it under Deviations.

**App tables** (timestamps are ISO-8601 `text`, ids are `newId()`):
- `settings`: `userId` text pk references `user.id` cascade; `language` text notnull default `'en'`; `baseCurrency` text notnull default `'USD'`; `largeText` integer boolean notnull default false; `theme` text notnull default `'system'`; `alertsEnabled` integer boolean notnull default false; `chartPrefs` text notnull (JSON string); `updatedAt` text notnull.
- `transactions`: `id` pk; `userId` cascade; `type`; `coinId`, `coinSymbol`, `coinName` text notnull; `quantity`, `pricePerUnit` real notnull; `currency` text notnull; `pricePerUnitUsd` real notnull; `fee`, `feeUsd` real notnull default 0; `occurredAt` text notnull; `note` text; `createdAt`, `updatedAt` text notnull. Indexes `(userId, occurredAt)`, `(userId, coinId)`.
- `alerts`: `id` pk; `userId` cascade; `coinId`, `coinSymbol`, `coinName` notnull; `targetPriceUsd` real notnull; `direction` text notnull; `enabled` integer boolean notnull default true; `triggeredAt` text; `createdAt` text notnull. Index `userId`.
- `pushSubscriptions` (table `push_subscriptions`): `id` pk; `userId` cascade; `endpoint` text notnull unique; `p256dh`, `auth` text notnull; `createdAt` text notnull.
- `portfolioSnapshots` (table `portfolio_snapshots`): `id` pk; `userId` cascade; `takenAt` text notnull; `totalValueUsd`, `investedUsd` real notnull. Index `(userId, takenAt)`.

Export every table. Also export inferred row types `SettingsRow`, `TransactionRow`, `AlertRow`, `PushSubscriptionRow`, `PortfolioSnapshotRow` (`typeof table.$inferSelect`) and insert types with the `New` prefix (`NewTransactionRow`, ...).

### 3. DB client and settings helpers

- `src/db/client.ts`: `import * as schema from './schema'`; `export type Database = DrizzleD1Database<typeof schema>`; `export function createDb(env: Env): Database { return drizzle(env.DB, { schema }); }`.
- `src/db/settings.ts`:
  - `rowToSettings(row: SettingsRow): Settings` — parse `chartPrefs` JSON; if it fails to parse or is not an object with the three expected keys, fall back to `DEFAULT_SETTINGS.chartPrefs`. Cast `language`/`baseCurrency`/`theme` only after checking they are in `LANGUAGES`/`CURRENCIES`/`THEMES`, otherwise use the default.
  - `getOrCreateSettings(db, userId): Promise<Settings>` — select; if missing insert `DEFAULT_SETTINGS` (chartPrefs serialized) and return it.
  - `saveSettings(db, userId, settings: Settings): Promise<Settings>` — upsert the full object with `updatedAt = nowIso()`.

### 4. Drizzle config and migration

`apps/api/drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ schema: './src/db/schema.ts', out: './drizzle', dialect: 'sqlite', driver: 'd1-http',
  dbCredentials: { accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '', databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? '', token: process.env.CLOUDFLARE_D1_TOKEN ?? '' } });
```
(`tsconfig.json` deliberately excludes this file; drizzle-kit loads it itself.)
Run `pnpm --filter @crypto-tracker/api db:generate` → one SQL file in `apps/api/drizzle/` creating nine tables. Then `pnpm --filter @crypto-tracker/api db:migrate:local`. If wrangler asks for confirmation, it accepts `--yes`? No: `wrangler d1 migrations apply` prompts only in interactive TTYs; in a non-TTY it applies directly. If it hangs, run it with `CI=true` set in the environment.

### 5. Better Auth — `src/auth/index.ts`

```ts
export function createAuth(env: Env, db: Database) {
  return betterAuth({
    baseURL: env.APP_ORIGIN,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'sqlite', schema: { user, session, account, verification } }),
    socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
    emailAndPassword: { enabled: false },
    trustedOrigins: [env.APP_ORIGIN],
  });
}
export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth['$Infer']['Session']['user'];
```
Adjust to the installed version's option names after reading its types. Import paths: `better-auth` and `better-auth/adapters/drizzle`.

### 6. Types, middleware, contracts

- `src/types.ts`: `export type AppEnv = { Bindings: Env; Variables: { db: Database; auth: Auth; user: AuthUser } }`.
- `src/middleware/context.ts`: `export const withContext: MiddlewareHandler<AppEnv>` — creates `db` and `auth` per request and sets both.
- `src/middleware/auth.ts`: `export const requireAuth: MiddlewareHandler<AppEnv>` — `const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers })`; no session → `throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required')`; else `c.set('user', session.user)`.
- `src/contracts.ts`: copy the three interfaces from WORK_PLAN.md section 2.3 verbatim (`PriceProvider`, `FxProvider`, `CoinResolver`), importing `PriceQuote`, `FxRates`, `CoinSearchResult` from `@crypto-tracker/shared`.

### 7. Routes and app

- `src/routes/health.ts`: `export const healthRoutes = new Hono<AppEnv>().get('/', (c) => c.json({ ok: true, time: nowIso() }))`.
- `src/routes/me.ts`: `export const meRoutes = new Hono<AppEnv>().use(requireAuth).get('/', ...)` returning `MeResponse`: `{ user: { id, name, email, image: image ?? null }, settings: await getOrCreateSettings(db, user.id) }`.
- `src/cron/index.ts`:
  ```ts
  export interface CronJob { name: string; cron: string; run(env: Env, ctx: ExecutionContext): Promise<void> }
  export const cronJobs: CronJob[] = [];   // the master pushes jobs here at integration
  export async function handleScheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void>
  ```
  `handleScheduled` selects jobs whose `cron === event.cron`, runs them with `Promise.allSettled`, logs one summary line (cron, job names, failures with reasons). Unknown cron → warning.
- `src/index.ts`:
  ```ts
  const app = new Hono<AppEnv>();
  app.use('/api/*', withContext);
  app.on(['GET', 'POST'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw));
  app.route('/api/health', healthRoutes);
  app.route('/api/me', meRoutes);
  // wave-1 route groups are mounted here by the master
  app.notFound((c) => c.json(errorBody('NOT_FOUND', `No route for ${c.req.method} ${c.req.path}`), 404));
  app.onError((err, c) => { if (err instanceof ApiError) return c.json(errorBody(err.code, err.message), err.status as ContentfulStatusCode); console.error(err); return c.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), 500); });
  export default { fetch: app.fetch, scheduled: handleScheduled } satisfies ExportedHandler<Env>;
  ```
  Use Hono's `ContentfulStatusCode` type (or the equivalent in the installed version) so `c.json(body, status)` type-checks.

### 8. Tests

`src/db/settings.test.ts`: unit-test `rowToSettings` (valid JSON, corrupt JSON falls back, invalid enum falls back). Keep it pure (construct a row object; no D1).

### 9. Verify

1. `pnpm --filter @crypto-tracker/api typecheck` exits 0.
2. `pnpm --filter @crypto-tracker/api db:generate` a second time produces no new migration.
3. `pnpm --filter @crypto-tracker/api db:migrate:local` succeeds (or reports already applied).
4. `pnpm --filter @crypto-tracker/api test` exits 0.
5. `pnpm exec prettier --check apps/api/src apps/api/drizzle.config.ts` (from the root) exits 0.
6. Dev smoke: from `apps/api` start `pnpm dev` in the background, wait ~15 s, then:
   - `curl -s http://localhost:8787/api/health` → `{"ok":true,"time":"..."}`
   - `curl -s http://localhost:8787/api/auth/ok` → `{"ok":true}`
   - `curl -s -i http://localhost:8787/api/me` → HTTP 401 and `{"error":{"code":"UNAUTHORIZED","message":"Sign in required"}}`
   - `curl -s -X POST http://localhost:8787/api/auth/sign-in/social -H "Content-Type: application/json" -H "Origin: http://localhost:5173" -d "{\"provider\":\"google\",\"callbackURL\":\"/\"}"` → JSON with a `url` starting `https://accounts.google.com/`
   - `curl -s -i http://localhost:8787/api/nothing` → 404 `NOT_FOUND` envelope
   Stop the background process afterwards.

## Constraints

- No commits, pushes, or installs.
- No `@cloudflare/workers-types`; the generated `worker-configuration.d.ts` is the source of runtime types.
- No placeholders or TODOs.
- Keep contract names exactly as in WORK_PLAN.md 2.3. If Better Auth forces a change, keep the names and report the internal difference under Deviations.

## Acceptance criteria

- [ ] All six verification steps pass with the exact bodies above.
- [ ] `apps/api/drizzle/` has exactly one migration creating `user`, `session`, `account`, `verification`, `settings`, `transactions`, `alerts`, `push_subscriptions`, `portfolio_snapshots`.
- [ ] `git status --short` shows your changes only under `apps/api/src/`, `apps/api/drizzle/`, `apps/api/drizzle.config.ts` (plus `.wrangler/` which is ignored).

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api db:generate
pnpm --filter @crypto-tracker/api db:migrate:local
pnpm --filter @crypto-tracker/api test
pnpm exec prettier --check apps/api/src apps/api/drizzle.config.ts
git status --short
```
plus the dev smoke calls in step 9.

## Report

Return the report in the format defined in your agent instructions. Include the exact bodies of the five `curl` calls.
