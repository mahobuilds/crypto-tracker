# Task W5: Alerts UI, push permission flow, service-worker push handlers, in-app banner

## Goal

The user can create price alerts (coin, target price, above/below), see and manage them, enable browser push notifications on this device, and see an in-app banner for alerts that triggered since they last looked. The service worker shows the push notification and opens the app on click.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 9, 10, 12, 15, 16), 2.1, 2.4, 2.5.
  - `docs/PRD.md` — section 6.8.
  - `apps/web/src/sw.ts` (you extend it), `src/pwa.ts`, `vite.config.ts` (injectManifest); `src/components/ui/index.ts` and components; `src/components/CoinPicker.tsx`; `src/hooks/usePrices.ts`; `src/lib/api.ts`, `src/lib/format.ts`, `src/lib/query.ts`; `src/app/settings/SettingsProvider.tsx`; `src/i18n/en/common.json`; `src/app/WelcomePage.tsx`.
  - `packages/shared/src/types.ts` (`Alert`, `AlertInput`, `AlertListResponse`, `PushSubscriptionInput`, `VapidPublicKeyResponse`), `alerts.ts` (`alertInputSchema`), `constants.ts`.
- API: `GET /api/alerts` → `AlertListResponse`; `POST /api/alerts` (`AlertInput`) → `Alert` 201; `PUT /api/alerts/:id` (`AlertInput`) → `Alert`; `DELETE /api/alerts/:id` → 204; `GET /api/push/vapid-public-key` → `{ publicKey }`; `POST /api/push/subscribe` (`PushSubscriptionInput`) → 201; `DELETE /api/push/subscribe` (`{ endpoint }`) → 204. Push payload JSON sent by the server: `{ title, body, url, tag }`. Target prices are in USD (`targetPriceUsd`); show the base-currency equivalent as a hint using `useFx`.
- Contracts you provide: from `apps/web/src/features/alerts/index.ts`: `export { AlertsPage } from './AlertsPage'` and `export { AlertBanner } from './AlertBanner'` (the master mounts `AlertBanner` at the top of the app shell).

## Parallel work warning

Other workers own the other `src/features/*` folders and API folders. Touch nothing outside your owned files. `src/sw.ts` is yours to extend in this wave; keep its existing precaching code. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/features/alerts/**` (new)
- `apps/web/src/sw.ts` (edit)
- `apps/web/src/i18n/en/alerts.json`, `apps/web/src/i18n/ar/alerts.json` (top-level key `alerts`)

## Steps

1. `queries.ts`: `alertsQueryKey = ['alerts']`, `useAlerts()` (`refetchInterval` 60 s), `useCreateAlert`, `useUpdateAlert`, `useDeleteAlert` (invalidate on success).
2. `push.ts` (browser side): `isPushSupported()`, `getPushPermission()`, `subscribeToPush(): Promise<'subscribed' | 'denied' | 'unsupported'>` — fetch the VAPID key, `navigator.serviceWorker.ready`, `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })`, POST the `subscription.toJSON()` (`endpoint`, `keys`); `unsubscribeFromPush()` — get the existing subscription, DELETE it server-side, `subscription.unsubscribe()`; `getCurrentSubscription()`.
3. `AlertsPage.tsx`: `PageHeader` with "New alert" button. If `settings.alertsEnabled` is false: a `Card` explaining alerts are off with a `Button` that calls `updateSettings({ alertsEnabled: true })`. A `Card` "Notifications on this device": status text (unsupported / blocked / off / on) and a Toggle-like `Button` to subscribe/unsubscribe. List of alerts (active first, then triggered): coin symbol/name, condition (`≥`/`≤` target in USD + base-currency hint), current price via `usePrices` for the alert coin ids, status `Badge` (active / triggered at date / paused), actions: re-arm (PUT with `enabled: true`), edit, delete. Empty → `EmptyState`.
4. `AlertForm.tsx` in a `Dialog`: `CoinPicker`, direction (two segmented buttons "goes above" / "goes below"), target price (USD, `inputMode="decimal"`), quick-fill buttons "current price" and "+5% / −5%" when a current price is available. Validate with `alertInputSchema`.
5. `AlertBanner.tsx`: uses `useAlerts()`; shows a dismissible banner listing alerts with `triggeredAt` newer than the last-seen timestamp stored in `localStorage` (`crypto-tracker.alerts.lastSeen`); dismiss stores now. Renders nothing when there is nothing new. Must be safe to render before the query resolves and must not throw outside the alerts route.
6. `src/sw.ts`: add `push` handler: parse JSON payload (fallback title "Crypto Tracker"), `self.registration.showNotification(title, { body, tag, data: { url }, icon: '/icons/icon.svg', badge: '/icons/icon.svg' })`; `notificationclick` handler: close, focus an existing client at the app origin and navigate it to `data.url`, else `clients.openWindow(url)`. Keep the precaching lines from F3.
7. i18n `alerts.json` (en + real Arabic).

## Constraints

- Logical Tailwind utilities only, touch targets, no `any`, no TODOs, no hard-coded strings, no new dependencies.
- Wrap all `localStorage` and `Notification`/`PushManager` access in feature checks and try/catch.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0 (name failures confined to other workers' folders).
- [ ] From `apps/web`: `pnpm exec tsc --noEmit -p tsconfig.sw.json` exits 0.
- [ ] `pnpm exec prettier --check apps/web/src/features/alerts apps/web/src/sw.ts apps/web/src/i18n/en/alerts.json apps/web/src/i18n/ar/alerts.json` exits 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src/features/alerts` returns nothing.
- [ ] en/ar key sets identical.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm --filter @crypto-tracker/web exec tsc --noEmit -p tsconfig.sw.json
pnpm exec prettier --check apps/web/src/features/alerts apps/web/src/sw.ts apps/web/src/i18n/en/alerts.json apps/web/src/i18n/ar/alerts.json
git status --short apps/web
```

## Report

Format from your agent instructions.
