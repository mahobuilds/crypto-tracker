# Task M2: Supabase JWT authentication on the API

## Goal

Replace Better Auth with Supabase Auth verification. The client sends `Authorization: Bearer <supabase access token>`; the API verifies it (JWKS, or legacy HS256 secret when configured), and `requireAuth` sets `user`. `GET /api/me` keeps the same response.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first: `docs/MIGRATION_SUPABASE.md` (binding, decisions 4–5), `apps/api/src/env.ts`, `apps/api/src/types.ts` (already references `AuthUser` from `./auth`), `apps/api/src/middleware/context.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/me.ts`, `apps/api/src/lib/errors.ts`, `apps/api/src/db/settings.ts` (exports `getOrCreateSettings`, unchanged signature), `packages/shared/src/types.ts` (`MeResponse`, `CurrentUser`).
- Installed: `jose` 6 (read `node_modules/jose/dist/types/index.d.ts` for `createRemoteJWKSet`, `jwtVerify`).
- Supabase token claims: `sub` (user id), `email`, `user_metadata: { full_name?, name?, avatar_url?, picture? }`, `aud: 'authenticated'`, `iss: <SUPABASE_URL>/auth/v1`. JWKS URL: `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`.
- Contracts you provide: `apps/api/src/auth/index.ts` → `export interface AuthUser { id: string; email: string; name: string; image: string | null }`, `export function createTokenVerifier(env: Env): (token: string) => Promise<AuthUser>` (caches the JWKS across calls), `export class AuthError extends ApiError` (401 `UNAUTHORIZED`). `apps/api/src/middleware/auth.ts` → `export const requireAuth: MiddlewareHandler<AppEnv>` reading `Authorization: Bearer` and using a verifier created once per process (module-level lazy init from `c.get('env')`).

## Parallel work warning

Other workers own `src/db/**` and query lines in services (M1); `src/server.ts`, `src/index.ts`, `src/cron/index.ts`, `src/services/push.ts`, `src/routes/push.ts` (M3); `apps/web/**` (M4); docs (M5). Do not touch them. The tree does not fully typecheck yet; judge by your files. No installs.

## Files you own

- `apps/api/src/auth/**` (rewrite), `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/me.ts`
- `apps/api/src/auth/verify.test.ts` (new)

## Steps

1. `auth/index.ts`: if `env.SUPABASE_JWT_SECRET` → `jwtVerify(token, new TextEncoder().encode(secret), { issuer, audience: 'authenticated' })`; else `jwtVerify(token, createRemoteJWKSet(jwksUrl), { issuer, audience: 'authenticated' })`. Map claims to `AuthUser` (`name` = `full_name ?? name ?? email`, `image` = `avatar_url ?? picture ?? null`). Any failure → `AuthError('Sign in required')`; expired → same code, message `Session expired`.
2. `middleware/auth.ts`: parse header (case-insensitive `Bearer`), missing → 401; verify; `c.set('user', user)`.
3. `routes/me.ts`: same shape as before using `c.get('user')` and `getOrCreateSettings(c.get('db'), user.id)`.
4. Test: sign an HS256 token with a test secret using `jose` `SignJWT` and verify `createTokenVerifier` maps claims correctly, rejects a bad signature, rejects expired, rejects wrong audience.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` reports zero errors in your files.
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/auth` passes with at least 4 tests.
- [ ] `pnpm exec prettier --check apps/api/src/auth apps/api/src/middleware/auth.ts apps/api/src/routes/me.ts` exits 0.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/auth
pnpm exec prettier --check apps/api/src/auth apps/api/src/middleware/auth.ts apps/api/src/routes/me.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
