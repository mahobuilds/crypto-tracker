# Task M4: Web app — Supabase Auth client, bearer token on API calls

## Goal

The SPA signs in with Google through Supabase Auth, keeps the session with `supabase-js`, and sends `Authorization: Bearer <access_token>` on every API call. The sign-in page and app shell look the same as today; only the auth plumbing changes. Better Auth code is removed.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/MIGRATION_SUPABASE.md` (decision 5), `apps/web/src/app/auth/*.ts(x)`, `apps/web/src/app/settings/SettingsProvider.tsx` (uses `ApiRequestError` 401 → `SignInPage`; keep that behaviour), `apps/web/src/lib/api.ts`, `apps/web/src/lib/query.ts`, `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/layout/AppShell.tsx` (sign-out button uses `signOut` from `@/app/auth/client`), `apps/web/src/features/settings/SettingsPage.tsx` (same), `apps/web/.env.local` (real values, gitignored), `apps/web/.env.example`.
- Installed: `@supabase/supabase-js` (read `node_modules/@supabase/supabase-js/dist/module/index.d.ts` and the auth client types for `signInWithOAuth`, `getSession`, `onAuthStateChange`, `signOut`).
- Vite env: `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Contracts you provide (same names as today so nothing else changes): `@/app/auth/client` exports `useSession(): { data: { user: { id: string; email: string; name: string; image: string | null } } | null; isPending: boolean }`, `signInWithGoogle(): Promise<void>`, `signOut(): Promise<void>`. `@/lib/supabase` exports `supabase` (the client). `@/lib/api` `apiFetch` unchanged signature, now adds the bearer header from `supabase.auth.getSession()` when a session exists.

## Parallel work warning

API workers are editing `apps/api/**`; docs worker edits `README.md`, `docs/**`. Do not touch them. Do not edit feature folders, `components/**`, `SettingsProvider.tsx`, `AppShell.tsx`. No installs, no `vite dev`, no `vite build`.

## Files you own

- `apps/web/src/app/auth/**`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/supabase.ts` (new), `apps/web/src/vite-env.d.ts`, `apps/web/.env.example`

## Steps

1. `lib/supabase.ts`: `createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })`; throw a clear error at startup if either env var is missing.
2. `vite-env.d.ts`: declare `ImportMetaEnv` with the two variables.
3. `app/auth/client.ts`: `useSession` implemented with `useState`/`useEffect` over `supabase.auth.getSession()` + `onAuthStateChange`, mapping the Supabase user to the shape above (`name` = `user_metadata.full_name ?? user_metadata.name ?? email`, `image` = `user_metadata.avatar_url ?? user_metadata.picture ?? null`). `signInWithGoogle` → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. `signOut` → `supabase.auth.signOut()` then `queryClient.clear()`.
4. `AuthGate.tsx` / `SignInPage.tsx`: keep UI; use the new client. On sign-in error show the existing `auth.signInFailed` text.
5. `lib/api.ts`: before `fetch`, `const { data } = await supabase.auth.getSession()`; if `data.session?.access_token` add `Authorization: Bearer ...`. Keep `credentials` out (not needed). Keep error mapping.
6. Remove all `better-auth` imports. `grep -rn "better-auth" apps/web/src` must return nothing.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs. No hard-coded strings (i18n keys exist already).

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0.
- [ ] `pnpm exec prettier --check apps/web/src/app/auth apps/web/src/lib/api.ts apps/web/src/lib/supabase.ts apps/web/src/vite-env.d.ts` exits 0.
- [ ] `grep -rn "better-auth" apps/web/src` returns nothing.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm exec prettier --check apps/web/src/app/auth apps/web/src/lib/api.ts apps/web/src/lib/supabase.ts apps/web/src/vite-env.d.ts
git status --short apps/web
```

## Report

Format from your agent instructions.
