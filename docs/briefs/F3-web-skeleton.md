# Task F3: Web skeleton — Vite, Tailwind, router, TanStack Query, i18n loader, auth, settings provider, layout, UI kit, hooks, PWA

## Goal

Build the React application shell that every wave-1 feature plugs into. When you are done, `pnpm --filter @crypto-tracker/web typecheck` and `build` pass, the app shows a Google sign-in page when signed out, and when signed in it renders a responsive shell (bottom tabs on phones, sidebar on laptops) with language/RTL, currency, large-text and theme applied from the user's settings. Feature pages are added later by the master; you provide the routes table, navigation list, UI kit, hooks, formatting helpers and i18n loader they rely on. The export names in WORK_PLAN.md section 2.5 are contracts: other workers are being briefed against them right now.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `C:\Users\medoh\Documents\crypto-tracker\docs\WORK_PLAN.md` — sections 1, 2.1, 2.4, 2.5 (binding).
  - `C:\Users\medoh\Documents\crypto-tracker\docs\PRD.md` — sections 4, 6.1, 6.9, 7, 8 (who the user is; settings; localization; accessibility).
  - `C:\Users\medoh\Documents\crypto-tracker\packages\shared\src\types.ts` and `constants.ts` (frozen contracts).
  - `C:\Users\medoh\Documents\crypto-tracker\apps\web\package.json` — dependencies are final; do not edit.
  - `C:\Users\medoh\Documents\crypto-tracker\tsconfig.base.json`, `.prettierrc`.
- Installed: React 19, react-router 7 (import from `react-router`), @tanstack/react-query 5, i18next 26 + react-i18next 17, Tailwind 4 + `@tailwindcss/vite`, vite-plugin-pwa 1.3, workbox-precaching/routing/window 7.4, better-auth 1.7 (client: `better-auth/react`), recharts (not used by you), zod. **Read the installed type definitions before using an API**, especially `better-auth/react` (`apps/web/node_modules/better-auth/dist/client/react/*.d.mts`) and `react-router` v7 declarative mode.
- The API (being built in parallel by another worker) will expose: `GET /api/me` → `MeResponse`; `PUT /api/settings` (partial `Settings`) → `Settings`; `GET /api/prices?ids=` → `PricesResponse`; `GET /api/fx` → `FxRates`; `GET /api/coins/search?q=` → `CoinSearchResponse`; Better Auth at `/api/auth/*` (Google social sign-in). You cannot call it during this task; verify with typecheck and build only.
- Design direction: calm, high-contrast, large touch targets (min 44 px, 48 px in large-text mode), generous spacing, one accent color (`indigo-600`), green/red for profit/loss with an explicit +/− sign. The primary user is an older, non-technical person on a phone.

## Parallel work warning

Other workers are editing `packages/shared/src/**` (except `types.ts`/`constants.ts`) and `apps/api/**`. Do not read or touch them. Do not import anything from `@crypto-tracker/shared` other than what `types.ts` and `constants.ts` export.
Do not run any install command. Do not edit `apps/web/package.json`. Do not run `vite dev`; only build and typecheck.

## Files you own

Everything under `apps/web/` except `package.json` and `src/features/**` (reserved for wave 1). That includes `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.sw.json`, `public/**`, and all of `src/` except `src/features/`.

## Steps

### 1. Build setup

- `index.html`: `lang="en"`, viewport with `viewport-fit=cover`, `<title>Crypto Tracker</title>`, theme-color meta, `<div id="root">`, module script `/src/main.tsx`.
- `vite.config.ts`: plugins `react()`, `tailwindcss()`, `VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', registerType: 'autoUpdate', injectRegister: false, manifest: { name: 'Crypto Tracker', short_name: 'Crypto', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#4f46e5', icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, devOptions: { enabled: false } })`. `resolve.alias['@'] = ./src`. `server.port = 5173`, `server.proxy['/api'] = { target: 'http://localhost:8787', changeOrigin: false }`. `build.outDir = 'dist'`.
- `public/icons/icon.svg`: a simple, clean app icon (rounded square, indigo background, white coin/chart glyph). Also `public/favicon.svg` (same art).
- `tsconfig.json` with project references to `tsconfig.app.json` and `tsconfig.node.json` and `tsconfig.sw.json`. `tsconfig.app.json`: extends base, `jsx: react-jsx`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `types: ["vite/client", "vite-plugin-pwa/client"]`, `paths: { "@/*": ["./src/*"] }`, `include: ["src"]`, `exclude: ["src/sw.ts"]`, `noEmit: true`. `tsconfig.node.json` for `vite.config.ts` (`types: ["node"]` is not available; use `lib: ["ES2022"]` and `module: ESNext`, `moduleResolution: Bundler`, `skipLibCheck: true`, include `vite.config.ts`). `tsconfig.sw.json`: `lib: ["ES2022", "WebWorker"]`, `types: []`, `include: ["src/sw.ts"]`, `noEmit: true`, same alias.
- The `typecheck` script in package.json runs `tsc --noEmit -p tsconfig.app.json`; keep it working. Additionally make sure `tsc --noEmit -p tsconfig.sw.json` passes; you may not edit package.json, so just verify it manually and report.
- `src/sw.ts`: `/// <reference lib="webworker" />`, `declare let self: ServiceWorkerGlobalScope;`, `precacheAndRoute(self.__WB_MANIFEST)` from `workbox-precaching`, `cleanupOutdatedCaches()`, `self.skipWaiting()` on install message, `clientsClaim()`. Leave a clearly named exported-nothing section comment `// push handlers are added by the alerts feature` (this is not a TODO; it documents ownership).
- `src/pwa.ts`: registers the service worker in production using `registerSW` from `virtual:pwa-register` (`immediate: true`); no-op in dev.
- `src/index.css`: `@import "tailwindcss";` `@custom-variant dark (&:where(.dark, .dark *));` base rules: `html { font-size: 16px } html[data-large-text] { font-size: 18px }`, body background/text colors for light and dark (`bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100` via `@apply` or plain CSS), `:root { --touch-target: 44px } html[data-large-text] { --touch-target: 48px }`, a utility class `.touch-target { min-height: var(--touch-target); min-width: var(--touch-target) }`, focus-visible ring styles, and `@theme` extending nothing else.

### 2. Core libraries

- `src/lib/api.ts`:
  ```ts
  export class ApiRequestError extends Error { constructor(public status: number, public code: string, message: string) }
  export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>
  ```
  `json` is serialized to the body with `Content-Type: application/json`; `credentials: 'include'`; non-2xx parses the `ApiErrorBody` envelope (fallback `UNKNOWN`/status text) and throws `ApiRequestError`; 204 returns `undefined as T`.
- `src/lib/format.ts` (all take `language: Language`, use `Intl` with `LANGUAGE_LOCALE[language]`):
  - `formatFiat(amount: number, currency: Currency, language): string` — `Intl.NumberFormat` style currency, 2 fraction digits (0 for TRY/SAR when `>= 1000`? no: keep 2 everywhere; simpler and predictable).
  - `formatMoneyUsd(amountUsd: number, currency: Currency, fx: FxRates, language): string` — converts with `fx.rates[currency]` then `formatFiat`.
  - `formatPct(pct: number, language, opts?: { signed?: boolean })` → `+2.35%` / `-1.20%` with 2 decimals, signed by default.
  - `formatQuantity(qty: number, language)` — up to 8 fraction digits, trailing zeros trimmed.
  - `formatDate(iso, language)`, `formatDateTime(iso, language)`, `formatRelative(iso, language)` (`Intl.RelativeTimeFormat`, "3 minutes ago").
  - `pnlTone(value: number): 'positive' | 'negative' | 'neutral'`.
- `src/lib/query.ts`: `export const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 15_000, retry: 1 } } })` and `export const queryKeys = { me: ['me'], prices: (ids: string[]) => ['prices', ids], fx: ['fx'], coinSearch: (q: string) => ['coins', 'search', q] } as const`. Feature tasks extend keys in their own files.

### 3. i18n

- `src/i18n/index.ts`: load every `./en/*.json` and `./ar/*.json` with `import.meta.glob('./{en,ar}/*.json', { eager: true, import: 'default' })`, merge each language's files into one flat `translation` namespace (top-level keys are the feature names: `common`, `nav`, `auth`, `errors`, ...). Initialize i18next with `initReactI18next`, `lng: 'en'`, `fallbackLng: 'en'`, `interpolation.escapeValue: false`, `returnNull: false`. Export `applyLanguage(lang: Language)` that changes language and sets `document.documentElement.lang` and `.dir` from `LANGUAGE_DIRECTION`.
- `src/i18n/en/common.json`, `nav.json`, `auth.json`, `errors.json` and the same four under `ar/` with real Arabic translations. Keys at minimum: `common.appName`, `common.save`, `common.cancel`, `common.delete`, `common.confirm`, `common.close`, `common.loading`, `common.retry`, `common.search`, `common.noResults`, `common.back`, `common.add`, `common.edit`, `common.optional`; `nav.dashboard`, `nav.transactions`, `nav.prices`, `nav.alerts`, `nav.import`, `nav.settings`; `auth.title`, `auth.subtitle`, `auth.continueWithGoogle`, `auth.signOut`, `auth.signedInAs`; `errors.generic`, `errors.network`, `errors.unauthorized`, `errors.notFound`, `errors.validation`.

### 4. Auth

- `src/app/auth/client.ts`: `export const authClient = createAuthClient({ baseURL: window.location.origin, basePath: '/api/auth' })` from `better-auth/react`; `export const useSession = authClient.useSession`; `export function signInWithGoogle() { return authClient.signIn.social({ provider: 'google', callbackURL: '/' }) }`; `export async function signOut() { await authClient.signOut(); queryClient.clear(); }`.
- `src/app/auth/SignInPage.tsx`: centered card, app icon, title/subtitle from i18n, one large "Continue with Google" button (Google "G" mark inline SVG), language switch (EN/AR) that calls `applyLanguage` and stores the choice in `localStorage` under `crypto-tracker.language` so the sign-in page can be Arabic before login.
- `src/app/auth/AuthGate.tsx`: uses `useSession()`; pending → full-screen `Spinner`; no session → `SignInPage`; session → renders children.

### 5. Settings provider

- `src/app/settings/SettingsProvider.tsx`: `useQuery(queryKeys.me, () => apiFetch<MeResponse>('/api/me'))`. While loading show `Spinner`; on `ApiRequestError` 401 render `SignInPage`; on other errors render `ErrorMessage` with retry. Provides context `{ user: CurrentUser; settings: Settings; updateSettings(patch: Partial<Settings>): Promise<void>; isSaving: boolean }`. `updateSettings` does optimistic update of the `me` query then `apiFetch<Settings>('/api/settings', { method: 'PUT', json: patch })`, rolling back on error. A `useEffect` applies settings to the document: `applyLanguage(settings.language)`, `data-large-text` attribute, `dark` class from `theme` (`system` follows `prefers-color-scheme` with a media-query listener). Export `useSettings()` which throws if used outside the provider.

### 6. Layout, navigation, routes

- `src/app/nav.ts`: `export interface NavItem { to: string; labelKey: string; icon: (props: { className?: string }) => JSX.Element }` and `export const NAV_ITEMS: NavItem[] = []` with entries for dashboard `/`, transactions `/transactions`, prices `/prices`, alerts `/alerts`, settings `/settings` (import `/import` is reached from the transactions page, not the nav). Icons: small inline SVG components in `src/components/icons.tsx` (home, list, chart, bell, gear, upload, plus, trash, pencil, search, close, chevron, logout, google).
- `src/app/layout/AppShell.tsx`: on `md` and up a fixed start-side sidebar (logical `inset-inline-start`) with app name and nav links; below `md` a fixed bottom tab bar with icon + label, safe-area padding (`pb-[env(safe-area-inset-bottom)]`). Content area uses `<Outlet />`, `max-w-5xl mx-auto`, page padding. Active link styling via `NavLink`. Signed-in user's name/avatar and sign-out in the sidebar footer (mobile: on the settings page, so no duplicate here).
- `src/app/routes.tsx`: `export const featureRoutes: RouteObject[] = []` — empty array the master fills, and `export function AppRoutes()` rendering `<Routes>`: `/` → `AppShell` (wrapped by `SettingsProvider`) with children from `featureRoutes` plus an `index` element `HomePlaceholder`? No placeholders: make the index route a real `WelcomePage` (`src/app/WelcomePage.tsx`) that shows the app name, signed-in user, and a short i18n sentence — the master replaces it with the dashboard at integration. Also a `*` route rendering `NotFoundPage` (i18n `errors.notFound`, link home).
- `src/app/App.tsx`: `QueryClientProvider` → `BrowserRouter` → `AuthGate` → `AppRoutes`.
- `src/main.tsx`: imports `./index.css`, `./i18n`, `./pwa`; applies the stored language from localStorage before first render; renders `<App />` in `StrictMode`.

### 7. UI kit — `src/components/ui/` with barrel `index.ts`

All components: Tailwind classes, logical properties only, `touch-target` on interactive elements, `forwardRef` where a DOM ref is useful, `className` merge via a tiny `cn()` helper in `src/lib/cn.ts` (string join + filter, no dependency).
- `Button` — variants `primary | secondary | danger | ghost`, sizes `md | lg`, `loading` prop shows `Spinner`, full-width option.
- `Card` — rounded-2xl, border, padding; `CardHeader`/`CardTitle` optional sub-components.
- `Field` — label + optional hint + error text wrapper, associates `htmlFor`.
- `Input`, `Textarea`, `Select` (native `<select>` styled, `options: { value, label }[]`), `Toggle` (`role="switch"`, large, label on the start side).
- `Dialog` — wraps native `<dialog>`; props `open`, `onClose`, `title`, `children`, `footer?`; calls `showModal()`/`close()` in an effect; closes on backdrop click and Escape; body scroll lock while open; full-screen sheet on small screens, centered on `md+`.
- `PageHeader` — title, optional subtitle, optional `actions` slot.
- `EmptyState` — icon, title, description, optional action.
- `Spinner` — sizes; `ErrorMessage` — message + optional retry button; `Badge` — tones `neutral | positive | negative | info`.
- `PnlText` — `{ value: number; children: ReactNode }` colors by `pnlTone(value)` and prefixes an explicit sign is the caller's job via `formatPct`; the component only sets color and `aria-label`.

### 8. Hooks and CoinPicker

- `src/hooks/usePrices.ts`: `usePrices(coinIds: string[])` → `useQuery` on `/api/prices?ids=` (sorted, deduplicated ids; disabled when empty) with `refetchInterval: PRICE_REFRESH_INTERVAL_MS`; returns `{ prices, updatedAt, isLoading, isError, refetch }`.
- `src/hooks/useFx.ts`: `useFx()` → `/api/fx`, `refetchInterval: 6 * 60 * 60 * 1000`, `staleTime` 1 h; returns `{ fx, isLoading }` where `fx` falls back to `{ base: 'USD', rates: { USD: 1, EUR: 1, SAR: 1, TRY: 1 }, updatedAt: '' }` only while loading (never after an error; expose `isError`).
- `src/hooks/useDebouncedValue.ts`.
- `src/components/CoinPicker.tsx`: props `{ value: CoinSearchResult | null; onChange: (coin: CoinSearchResult | null) => void; label?: string; autoFocus?: boolean }`. Text input with debounced (300 ms) query to `/api/coins/search?q=` (min 2 chars), results list with thumb, name, symbol; keyboard navigation (arrow keys, Enter, Escape); selected coin shown as a chip with a clear button. Uses i18n `common.search` / `common.noResults`.

### 9. Verify

1. `pnpm --filter @crypto-tracker/web typecheck` exits 0.
2. From `apps/web`: `pnpm exec tsc --noEmit -p tsconfig.sw.json` exits 0.
3. `pnpm --filter @crypto-tracker/web build` exits 0 and produces `dist/index.html`, `dist/sw.js`, `dist/manifest.webmanifest`.
4. `pnpm exec prettier --check apps/web` (from the root) exits 0.
5. `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src` returns nothing (logical properties only).

## Constraints

- No commits, pushes, or installs. No new dependencies.
- No placeholders, TODOs, or lorem ipsum. No `any`.
- No hard-coded user-facing strings in components; everything goes through i18n keys with English and Arabic values.
- Do not create anything under `src/features/`.

## Acceptance criteria

- [ ] All five verification steps pass.
- [ ] Every export in WORK_PLAN.md section 2.5 exists with the stated name and path.
- [ ] `git status --short` shows your changes only under `apps/web/` (never `apps/web/package.json`).

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm --filter @crypto-tracker/web exec tsc --noEmit -p tsconfig.sw.json
pnpm --filter @crypto-tracker/web build
pnpm exec prettier --check apps/web
git status --short
```

## Report

Return the report in the format defined in your agent instructions. List every file under `src/components/ui`, `src/hooks`, `src/lib`, `src/app` you created.
