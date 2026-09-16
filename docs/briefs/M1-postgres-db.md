# Task M1: Postgres schema, Drizzle client, migration, SQLite-specific query fixes

## Goal

Move the database layer from Cloudflare D1 (SQLite) to Supabase Postgres. Schema in `drizzle-orm/pg-core`, no auth tables (Supabase Auth owns users), client via `postgres.js`, one fresh migration, and every query in the services/cron that relied on SQLite specifics fixed for Postgres. The API must typecheck; the migration must apply to the real Supabase database.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/MIGRATION_SUPABASE.md` (binding), `apps/api/src/env.ts`, `apps/api/src/types.ts`, `apps/api/src/middleware/context.ts`, `apps/api/src/db/*.ts`, `apps/api/drizzle.config.ts`, every file under `apps/api/src/services/` and `apps/api/src/cron/` (to find SQLite-specific query code), `apps/api/.env` (real `DATABASE_URL`; the password placeholder `[YOUR-PASSWORD]` may still be there — if so, the migration step is BLOCKED; do everything else and report it).
- Installed: `drizzle-orm` 0.45, `drizzle-kit` 0.31, `postgres` 3.4, `@types/node`. Read `node_modules/drizzle-orm/pg-core` types for column builders.
- Contracts you provide: `apps/api/src/db/client.ts` → `export type Database = PostgresJsDatabase<typeof schema>`, `export function createDb(env: Env): Database`, `export async function closeDb(db): Promise<void>` (ends the postgres connection; used on shutdown). `apps/api/src/db/schema.ts` → tables `settings`, `transactions`, `alerts`, `pushSubscriptions`, `portfolioSnapshots` with the same property names and row/insert type exports as today (`SettingsRow`, `TransactionRow`, `NewTransactionRow`, `AlertRow`, `PushSubscriptionRow`, `PortfolioSnapshotRow`, ...). `db/settings.ts` keeps its three exports.

## Parallel work warning

Other workers own `src/auth/**`, `src/middleware/auth.ts`, `src/routes/me.ts` (M2); `src/server.ts`, `src/index.ts`, `src/cron/index.ts`, `src/services/push.ts`, `src/routes/push.ts` (M3); `apps/web/**` (M4); docs (M5). You own the DB layer plus **only the query lines** inside `src/services/{transactions,import,portfolio,alerts,market,coingecko,fx,cache}.ts` and `src/cron/{prices,fx,snapshots,alerts}.ts`. Do not restructure those files; change what Postgres needs. The tree currently does not typecheck because M2/M3 files still reference deleted Cloudflare/Better Auth modules; judge your work by errors in your owned files only. No installs.

## Files you own

- `apps/api/src/db/**`, `apps/api/drizzle.config.ts`, `apps/api/drizzle/**` (new)
- Query lines in the services/cron files listed above

## Steps

1. `db/schema.ts` with `pgTable`, `text`, `doublePrecision`, `boolean`, `index`, `uniqueIndex`. Drop `user`, `session`, `account`, `verification`. `userId` is `text` (Supabase `auth.users.id` uuid as string), no foreign key. Keep ISO `text` timestamps. Same indexes as before.
2. `db/client.ts`: `postgres(env.DATABASE_URL, { prepare: false, max: 5 })` + `drizzle(client, { schema })`. Export `Database`, `createDb`, `closeDb`.
3. `db/settings.ts`: Postgres upsert (`onConflictDoUpdate({ target: settings.userId, set: {...} })`), `onConflictDoNothing` for get-or-create.
4. `drizzle.config.ts`: `dialect: 'postgresql'`, `dbCredentials: { url: process.env.DATABASE_URL! }` (load `dotenv/config` at the top so `pnpm db:generate`/`db:migrate` read `.env`).
5. Grep services/cron for SQLite-isms: `selectDistinct` is fine; `sql` fragments with `unixepoch`/`strftime`; `db.batch`; boolean comparisons `eq(x, true)` are fine; `integer({ mode: 'boolean' })` gone. Fix what breaks typecheck.
6. `pnpm --filter @crypto-tracker/api db:generate` → one migration creating five tables. If `.env` has a real password: `pnpm --filter @crypto-tracker/api db:migrate` against Supabase and confirm the five tables exist (`SELECT tablename FROM pg_tables WHERE schemaname='public'` via a tiny `node -e` using `postgres`). Note: the direct `db.<ref>.supabase.co:5432` host is IPv6-only on Supabase free tier; if connection fails with ENETUNREACH, report BLOCKED asking for the Session pooler URI from the Supabase dashboard.
7. Unit tests under `src/db/settings.test.ts` must still pass.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs. Drizzle query builder only.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` reports zero errors in `src/db/**`, `src/services/**`, `src/cron/{prices,fx,snapshots,alerts}.ts`, `drizzle.config.ts` (list remaining errors, all in other workers' files).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/db src/services` passes.
- [ ] `apps/api/drizzle/` has one migration with five `CREATE TABLE` statements.
- [ ] Migration applied to Supabase, or BLOCKED with the exact connection error.
- [ ] `pnpm exec prettier --check apps/api/src/db apps/api/drizzle.config.ts` exits 0.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/db src/services
pnpm --filter @crypto-tracker/api db:generate
pnpm exec prettier --check apps/api/src/db apps/api/drizzle.config.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
