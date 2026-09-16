# Task M3: Node runtime — server entry, static SPA, node-cron scheduler, web-push

## Goal

Run the API as one Node process: `@hono/node-server` serves `/api/*` and the built SPA from `apps/web/dist` with SPA fallback, cron jobs run in-process with `node-cron`, and push notifications are sent with the `web-push` package. `pnpm --filter @crypto-tracker/api dev` starts it on port 8787.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/MIGRATION_SUPABASE.md` (binding, decisions 1, 7, 10), `apps/api/src/env.ts`, `apps/api/src/types.ts`, `apps/api/src/middleware/context.ts` (now `withContext(env, db)`), `apps/api/src/index.ts` (current Cloudflare wiring; you rewrite it), `apps/api/src/cron/index.ts` and `cron/{prices,fx,snapshots,alerts}.ts` (job factories), `apps/api/src/services/push.ts` + `push.test.ts`, `apps/api/src/routes/push.ts`, `apps/api/package.json` (scripts are final).
- Installed: `@hono/node-server` 2 (read its types: `serve`, `serveStatic` from `@hono/node-server/serve-static`), `node-cron` 4 + `@types/node-cron`, `web-push` 3 + `@types/web-push`, `dotenv`, `tsx`.
- Other workers are, in parallel, replacing `db/client.ts` (`createDb(env)`, `closeDb(db)`, `Database` type — M1) and `middleware/auth.ts` / `auth/index.ts` (M2). Code against those names; they will exist.
- Contracts you provide: `apps/api/src/index.ts` → `export function createApp(env: Env, db: Database): Hono<AppEnv>` and `export function registerCronJobs(): void` (pushes the four jobs into `cronJobs` with `marketData` injected). `apps/api/src/cron/index.ts` → `CronJob = { name; cron; run(env: Env): Promise<void> }`, `cronJobs`, `startScheduler(env): { stop(): void }` (node-cron, one task per job, errors logged never thrown, one summary log per run). `apps/api/src/server.ts` → boots: `loadEnv()`, `createDb`, `createApp`, `registerCronJobs`, `startScheduler`, `serve({ fetch: app.fetch, port: env.PORT })`, graceful shutdown on SIGINT/SIGTERM (`stop()`, `closeDb`). `apps/api/src/services/push.ts` → same exports as today (`PushPayload`, `sendPush(env, sub, payload)` returning `'sent' | 'gone' | 'failed'`, `upsertSubscription`, `deleteSubscription`, `listSubscriptions`) implemented with `web-push` (`setVapidDetails` per call or once; `sendNotification`; `WebPushError` statusCode 404/410 → `'gone'`).

## Parallel work warning

Do not touch `src/db/**`, `src/auth/**`, `src/middleware/auth.ts`, `src/routes/me.ts`, services other than `push.ts`, cron job files other than `cron/index.ts`, `apps/web/**`, docs. The tree does not fully typecheck until all workers finish; judge by your files. No installs.

## Files you own

- `apps/api/src/server.ts` (new), `apps/api/src/index.ts`, `apps/api/src/cron/index.ts`, `apps/api/src/services/push.ts`, `apps/api/src/services/push.test.ts`, `apps/api/src/routes/push.ts`

## Steps

1. `index.ts`: `createApp` mounts `withContext(env, db)` on `/api/*`, then all route groups exactly as now (no `/api/auth/*` any more), `notFound`/`onError` unchanged, and **after** the API routes: `app.use('/*', serveStatic({ root: '../web/dist' }))` and a final `app.get('*', ...)` that returns `apps/web/dist/index.html` for non-`/api` GET requests (SPA fallback; resolve the path from `import.meta.url`, read once and cache; 404 JSON if the file does not exist so dev without a build still works). Static assets under `/assets/*` should get `Cache-Control: public, max-age=31536000, immutable`; `index.html` and `sw.js` `no-cache`.
2. `cron/index.ts`: keep `cronJobs` registry; `startScheduler(env)` uses `cron.schedule(job.cron, ...)` per job with `{ timezone: 'UTC' }`; log `[cron] <name> ok (<ms>)` / `[cron] <name> failed: <message>`. Also export `runJobsFor(cron: string, env)` for manual triggering (used by a dev-only route `POST /api/dev/cron/:expr`? No — keep scope; export only).
3. Cron job files currently type `run(env, ctx)` with an unused `ctx` — you may not edit them; the new `CronJob` type with `run(env)` remains assignable from a function declaring an extra optional parameter only if they declare it optional. Check: if they declare `ctx` as required, they still assign to `(env) => Promise<void>`? No — a function with more required params is NOT assignable. In that case define `run(env: Env, ctx?: unknown): Promise<void>` in the type and call `job.run(env)`. Verify with typecheck.
4. `services/push.ts` with `web-push`; keep the tests meaningful: mock `webpush.sendNotification` with `vi.mock('web-push')` to return resolved / throw `{ statusCode: 410 }` / throw `{ statusCode: 500 }`, asserting the three outcomes and that payload JSON has `title/body/url/tag`.
5. `routes/push.ts`: read VAPID public key from `c.get('env')` (already replaced) — confirm it compiles.
6. `server.ts` as in the contract. Print `API listening on http://localhost:<port>` and the number of cron jobs.
7. Smoke: `.env` may have a placeholder DB password; `createDb` with `postgres.js` is lazy (no connection until a query), so the server should still start. Run `pnpm --filter @crypto-tracker/api dev` in the background, `curl http://localhost:8787/api/health` → 200, `curl http://localhost:8787/api/me` → 401, `curl -I http://localhost:8787/` → 200 if `apps/web/dist/index.html` exists else JSON 404. Stop it.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` reports zero errors in your files.
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/services/push` passes.
- [ ] Dev server smoke as in step 7 with exact outputs.
- [ ] `pnpm exec prettier --check apps/api/src/server.ts apps/api/src/index.ts apps/api/src/cron/index.ts apps/api/src/services/push.ts apps/api/src/services/push.test.ts apps/api/src/routes/push.ts` exits 0.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/services/push
pnpm exec prettier --check apps/api/src/server.ts apps/api/src/index.ts apps/api/src/cron/index.ts apps/api/src/services/push.ts apps/api/src/services/push.test.ts apps/api/src/routes/push.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
