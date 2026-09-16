# Task A5: Alerts CRUD, push subscriptions, alert-check cron, Web Push delivery

## Goal

Let the user define price alerts and receive them as push notifications. Routes manage alerts and browser push subscriptions; a cron job runs every minute, compares enabled alerts against the latest prices, marks triggered alerts, and sends a Web Push message to every subscription of that user. Push encryption and VAPID signing use `@block65/webcrypto-web-push`, which runs on Workers.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 12, 14, 16), 2.1, 2.2, 2.3, 2.4.
  - `docs/PRD.md` — section 6.8.
  - `apps/api/src/types.ts`, `lib/errors.ts`, `lib/ids.ts`, `lib/time.ts`, `db/schema.ts` (`alerts`, `pushSubscriptions`, `settings`, row types), `db/client.ts`, `db/settings.ts` (`rowToSettings` for `alertsEnabled`), `middleware/auth.ts`, `contracts.ts`, `cron/index.ts` (`CronJob`), `routes/me.ts` (style), `worker-configuration.d.ts` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` are in `Env`).
  - `packages/shared/src/types.ts` (`Alert`, `AlertInput`, `AlertListResponse`, `PushSubscriptionInput`, `VapidPublicKeyResponse`), `alerts.ts` (`alertInputSchema`), `push.ts` (`pushSubscriptionSchema`), `constants.ts` (`CRON`).
  - Library API (installed, read it): `apps/api/node_modules/@block65/webcrypto-web-push/dist/lib/main.d.ts`, `payload.d.ts`, `types.d.ts`, `README.md`. Key call: `const { headers, method, body } = await buildPushPayload({ data, options: { ttl: 3600, urgency: 'high' } }, { endpoint, expirationTime: null, keys: { auth, p256dh } }, { subject, publicKey, privateKey })`, then `fetch(endpoint, { method, headers, body })`. HTTP 404/410 from the push service means the subscription is gone and must be deleted.
- Contracts you provide:
  ```ts
  // routes/alerts.ts
  export function createAlertsRoutes(): Hono<AppEnv>;     // GET /, POST /, PUT /:id, DELETE /:id — mounted at /api/alerts
  // routes/push.ts
  export function createPushRoutes(): Hono<AppEnv>;       // GET /vapid-public-key, POST /subscribe, DELETE /subscribe — mounted at /api/push
  // cron/alerts.ts
  export function createAlertCheckJob(deps: { prices: PriceProvider }): CronJob;   // cron: CRON.EVERY_MINUTE
  // services/push.ts
  export interface PushPayload { title: string; body: string; url: string; tag: string }
  export async function sendPush(env: Env, sub: PushSubscriptionRow, payload: PushPayload, fetchImpl?: typeof fetch): Promise<'sent' | 'gone' | 'failed'>;
  // services/alerts.ts
  export function rowToAlert(row: AlertRow): Alert;
  export function isTriggered(alert: Pick<Alert, 'direction' | 'targetPriceUsd'>, priceUsd: number): boolean;
  ```

## Parallel work warning

Other workers own `routes/settings.ts`, `routes/transactions.ts`, `routes/import.ts`, `routes/prices.ts`, `routes/coins.ts`, `routes/portfolio.ts`, `services/transactions.ts`, `services/import.ts`, `services/coingecko.ts`, `services/fx.ts`, `services/cache.ts`, `services/market.ts`, `services/portfolio.ts`, `cron/prices.ts`, `cron/fx.ts`, `cron/snapshots.ts`. Do not touch them, `src/index.ts`, or `cron/index.ts`. Never import a concrete price service; use `deps`. No installs, no `wrangler dev`.

## Files you own

- `apps/api/src/routes/alerts.ts`, `apps/api/src/routes/push.ts` (new)
- `apps/api/src/services/alerts.ts`, `apps/api/src/services/push.ts` (new) + `alerts.test.ts`, `push.test.ts`
- `apps/api/src/cron/alerts.ts` (new)

## Steps

1. `services/alerts.ts`: `rowToAlert`, `isTriggered` (`above`: `priceUsd >= target`; `below`: `priceUsd <= target`), `listAlerts(db, userId)`, `createAlert(db, userId, input)`, `updateAlert(db, userId, id, input)` (updating re-arms: sets `triggeredAt = null` when `enabled` is true), `deleteAlert(db, userId, id)`. 404 `NOT_FOUND` when missing; all queries scoped by `userId`. Limit 50 alerts per user → 400 `LIMIT_REACHED`.
2. `routes/alerts.ts`: `use(requireAuth)`; validate bodies with `alertInputSchema` (400 `VALIDATION_ERROR` `<path>: <message>`); responses `AlertListResponse` / `Alert` (201 on create) / 204 on delete.
3. `services/push.ts`: `sendPush` as in the contract. Build the payload JSON `{ title, body, url, tag }`. `'gone'` on 404/410 (caller deletes the row), `'failed'` on other non-2xx or thrown errors (log once, do not throw), `'sent'` on 2xx. Also `upsertSubscription(db, userId, input)` (unique `endpoint`: on conflict update `userId`, `p256dh`, `auth`), `deleteSubscription(db, userId, endpoint)`, `listSubscriptions(db, userId)`.
4. `routes/push.ts`: `use(requireAuth)`; `GET /vapid-public-key` → `{ publicKey: env.VAPID_PUBLIC_KEY }` (500 `NOT_CONFIGURED` if empty); `POST /subscribe` body via `pushSubscriptionSchema` → 201 `{ ok: true }`; `DELETE /subscribe` body `{ endpoint }` → 204.
5. `cron/alerts.ts`: `createAlertCheckJob(deps)`: `{ name: 'alert-check', cron: CRON.EVERY_MINUTE, run }`:
   - Load enabled, untriggered alerts joined with `settings.alertsEnabled = true` (skip users who turned alerts off).
   - Distinct coin ids → `deps.prices.getPrices(env, ids)`.
   - For each alert whose coin has a price and `isTriggered`: set `triggeredAt = nowIso()`, `enabled = false`; then for each of that user's subscriptions call `sendPush` with title `${coinSymbol} ${direction === 'above' ? '≥' : '≤'} $${target}` and body `Now $${price}` (format with up to 2 decimals for ≥ 1, up to 6 below 1), `url: '/alerts'`, `tag: alert.id`; delete subscriptions that return `'gone'`.
   - Log `alerts checked: N, triggered: M, pushes: sent/gone/failed counts`. Per-alert errors are caught and logged; the job never throws for one bad alert.
6. Tests (pure / fake fetch): `isTriggered` all four combinations plus equality; `rowToAlert` mapping; `sendPush` returns `'sent'`/`'gone'`/`'failed'` with a fake `fetchImpl` and real VAPID keys generated in the test via `crypto.subtle.generateKey` (export raw public key and JWK `d` as base64url) and a fake subscription (`p256dh` = a freshly generated P-256 public key in base64url, `auth` = 16 random bytes base64url) so `buildPushPayload` actually runs; the notification title/body formatting helper.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs. Drizzle query builder only.
- Never log subscription keys or VAPID private key.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` exits 0 (name failures confined to other workers' files).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/services/alerts src/services/push` passes with at least 10 tests, including a real `buildPushPayload` round through `sendPush`.
- [ ] `pnpm exec prettier --check apps/api/src/routes/alerts.ts apps/api/src/routes/push.ts apps/api/src/services/alerts.ts apps/api/src/services/push.ts apps/api/src/services/alerts.test.ts apps/api/src/services/push.test.ts apps/api/src/cron/alerts.ts` exits 0.
- [ ] Exports match the contract names exactly.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/services/alerts src/services/push
pnpm exec prettier --check apps/api/src/routes/alerts.ts apps/api/src/routes/push.ts apps/api/src/services/alerts.ts apps/api/src/services/push.ts apps/api/src/services/alerts.test.ts apps/api/src/services/push.test.ts apps/api/src/cron/alerts.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
