# Migration Plan — Cloudflare → Node server + Supabase + Railway

**Date:** 2026-09-15
**Reason:** The Cloudflare stack (Workers, D1, KV, Cron Triggers, Static Assets, wrangler) is more moving parts than this project needs. Target: one Node process, one database, one auth provider, one host.
**Method:** work-distribute waves (see `docs/WORK_PLAN.md` for the pattern).

---

## 1. Target architecture

```
Browser / PWA  ──HTTPS──▶  Railway service (Node 24)
                            ├─ Hono API            /api/*
                            ├─ static SPA          apps/web/dist (SPA fallback)
                            ├─ node-cron           every minute / hourly / 6h
                            └─ web-push            VAPID
                                   │
                                   ▼
                            Supabase project
                            ├─ Postgres (Drizzle)  app tables
                            └─ Auth (Google)       users, sessions, JWT
```

| Concern | Before (Cloudflare) | After |
|---|---|---|
| Runtime | Workers | Node 24 via `@hono/node-server` |
| Static SPA | Workers Static Assets | `serveStatic` from `apps/web/dist` with SPA fallback |
| Database | D1 (SQLite) | Supabase Postgres, Drizzle `pg-core`, `postgres.js` |
| Auth | Better Auth + 4 tables | Supabase Auth (Google); server verifies JWT with `jose`; no auth tables |
| Cache | Workers KV | In-memory `MemoryCache` with the same `get/put` shape (single process) |
| Cron | Cron Triggers | `node-cron` in the same process, same `cronJobs` registry |
| Push | `@block65/webcrypto-web-push` | `web-push` (Node) |
| Config | `wrangler.jsonc` vars + secrets | `.env` / Railway variables, loaded into one `Env` object |
| Deploy | wrangler | Railway "deploy from GitHub"; build `pnpm build`, start `pnpm start` |

## 2. What stays untouched

- `packages/shared` entirely (types, schemas, portfolio math, CSV, 127 tests).
- All web feature pages, dashboard charts, i18n, PWA manifest/icons, service worker.
- API route handlers and services logic (transactions, import, market data, portfolio, alerts). Only the seams below change.

## 3. Decisions

1. **`Env` stays the name.** `apps/api/src/env.ts` declares `interface Env` (`APP_ORIGIN`, `PORT`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET?`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CACHE: MemoryCache`) and `loadEnv()` reads `process.env` (via `dotenv` in dev). Every existing `env: Env` parameter keeps working. `worker-configuration.d.ts` is deleted.
2. **`MemoryCache` mimics the KV subset used** (`get(key, 'json')`, `put(key, value, { expirationTtl })`, `delete`). `services/cache.ts` and `services/market.ts` do not change.
3. **User id = Supabase `auth.users.id` (uuid, stored as `text`).** App tables keep `user_id text`; no cross-schema FK. `user`, `session`, `account`, `verification` tables are dropped.
4. **JWT verification:** `jose` with `createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', SUPABASE_URL))`; if `SUPABASE_JWT_SECRET` is set (older projects, HS256) verify with it instead. `AuthUser = { id: sub, email, name: user_metadata.full_name ?? email, image: user_metadata.avatar_url ?? null }`.
5. **Client sends `Authorization: Bearer <access_token>`** from `supabase.auth.getSession()`. Cookies are no longer used by the API. `apiFetch` adds the header; on 401 the `SettingsProvider` shows the sign-in page.
6. **Timestamps stay ISO text columns** (least churn). Numbers become `double precision`.
7. **Dev:** `pnpm dev` = Vite on 5173 (proxy `/api` → 8787 unchanged) + `tsx watch src/server.ts` on 8787. Prod: `tsx src/server.ts` (no separate build step for the API).
8. **Migrations:** `drizzle-kit generate` → `apps/api/drizzle/*.sql`; applied with `drizzle-kit migrate` in `pnpm db:migrate`, which Railway runs as the pre-deploy command.
9. **Supabase connection:** use the Session pooler string (port 5432) or Transaction pooler (6543) with `postgres(url, { prepare: false })`.
10. **Row Level Security** is enabled on all five tables (migration `0001`). The API connects as the table owner (`postgres`) and bypasses RLS; policies (`<table>_own_rows`, role `authenticated`, `user_id = auth.uid()::text`) only govern direct Supabase REST/Realtime access. The anon key gets no rows.
11. **`ExecutionContext`** disappears; cron jobs receive `(env)` only. Registry type becomes `run(env: Env): Promise<void>`.

## 4. Contracts (written by the master before wave 1)

`apps/api/src/env.ts`
```ts
export interface Env { APP_ORIGIN: string; PORT: number; DATABASE_URL: string; SUPABASE_URL: string; SUPABASE_JWT_SECRET?: string; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string; CACHE: MemoryCache }
export function loadEnv(): Env;
```
`apps/api/src/lib/memory-cache.ts`
```ts
export class MemoryCache { get<T>(key: string, type: 'json'): Promise<T | null>; get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>; delete(key: string): Promise<void> }
```
`apps/api/src/types.ts` → `AppEnv = { Variables: { env: Env; db: Database; user: AuthUser } }` (no `Bindings`; `env` is set by `withContext`; handlers use `c.get('env')` instead of `c.env`).

Web env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`apps/web/.env.local`, gitignored; `.env.example` committed).

## 5. Waves

### Wave 0 — Master prerequisites
- Add deps: api `@hono/node-server`, `postgres`, `jose`, `node-cron`, `web-push`, `dotenv`, `tsx`; dev `@types/node`, `@types/node-cron`, `@types/web-push`. Web: `@supabase/supabase-js`. Remove: `wrangler`, `better-auth` (both packages), `@block65/webcrypto-web-push`, `drizzle-kit` stays.
- Write `env.ts`, `lib/memory-cache.ts`, new `types.ts`, `package.json` scripts (`dev`, `start`, `db:generate`, `db:migrate`, `typecheck`, `test`), `tsconfig.json` (`types: ["node"]`), `.env.example`, delete `wrangler.jsonc`, `worker-configuration.d.ts`, `scripts/ensure-assets-dir.mjs`, `.dev.vars*`, `.github/workflows/deploy.yml`, `apps/api/drizzle/**` (regenerated by M1).
- Update `middleware/context.ts` to set `env` and `db` (tiny).

### Wave 1 — Parallel swaps (5 tasks)

| Id | Title | Tier | Owns |
|---|---|---|---|
| M1 | Postgres schema (`pg-core`, no auth tables, `user_id text`), `drizzle.config.ts` (`dialect: 'postgresql'`), `db/client.ts` (`postgres.js`), `db/settings.ts` upsert syntax, regenerate migration; fix any SQLite-specific query in `services/*.ts` and `cron/*.ts` (`sql` fragments, `db.batch`) | hard | `apps/api/src/db/**`, `apps/api/drizzle.config.ts`, `apps/api/drizzle/**`, DB-query lines only in `services/**`, `cron/{prices,snapshots,alerts}.ts` |
| M2 | Supabase JWT auth: `auth/index.ts` (`verifySupabaseJwt`), `middleware/auth.ts` (bearer → `user`), `routes/me.ts` (unchanged logic, new user source), delete Better Auth code | medium | `apps/api/src/auth/**`, `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/me.ts` |
| M3 | Node runtime: `server.ts` (node-server + static + SPA fallback + cron start), `cron/index.ts` (`node-cron` scheduler, new `CronJob` type), `services/push.ts` (`web-push`, same return contract), `index.ts` exports the Hono `app` and `registerCronJobs()` | medium | `apps/api/src/server.ts`, `apps/api/src/index.ts`, `apps/api/src/cron/index.ts`, `apps/api/src/services/push.ts` + test, `apps/api/src/routes/push.ts` (VAPID key from `env`) |
| M4 | Web auth: `lib/supabase.ts`, `app/auth/client.ts` (`signInWithGoogle`, `signOut`, `useSession` on `onAuthStateChange`), `AuthGate`, `SignInPage` (same UI), `lib/api.ts` bearer header, `vite-env.d.ts` env typing, `.env.example` | medium | `apps/web/src/app/auth/**`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/vite-env.d.ts`, `apps/web/.env.example` |
| M5 | Docs + Railway: `README.md`, `docs/DEPLOY.md` rewritten (Supabase project, Google provider, Railway service, variables, pre-deploy migrate), `railway.json`; remove `docs/DEPLOY.md` Cloudflare content; update `docs/TECH_STACK.md` summary/table | easy | `README.md`, `docs/DEPLOY.md`, `docs/TECH_STACK.md`, `railway.json` |

Every API route that used `c.env.X` switches to `c.get('env').X` — the master does this mechanical replace in wave 0 so M1–M3 start from a compiling tree.

### Wave 2 — Integration (master)
- Typecheck/test/build green. `pnpm db:migrate` against the user's Supabase project. `pnpm dev` end to end: Google sign-in in the browser, all pages, cron logs, push subscribe.
- Delete the seed-session script (Supabase Auth replaces it) or rewrite it to mint a Supabase test user via the service-role key (optional).
- Railway: connect repo, set variables, deploy, verify `https://<app>.up.railway.app/api/health`, then set `APP_ORIGIN` and Supabase Auth "Site URL" + redirect URL to that origin.

## 6. Needed from the owner before wave 2
1. Supabase project (free tier): Project URL, anon key, database connection string (Settings → Database → Connection string, URI, pooler).
2. Supabase Auth → Providers → Google enabled with a Google OAuth client (Google Cloud Console; authorized redirect URI is the one Supabase shows: `https://<project-ref>.supabase.co/auth/v1/callback`). Add `http://localhost:5173` to Auth → URL Configuration → Redirect URLs.
3. Railway account linked to the GitHub repo (repo needs a first commit + push).

Put values in `apps/api/.env` and `apps/web/.env.local` (both gitignored) — templates will exist after wave 0.

## 7. Estimate
Wave 0: master, ~30 min. Wave 1: 5 workers in parallel, ~20 min wall time. Wave 2: 1–2 h including deploy. Total about half a day.
