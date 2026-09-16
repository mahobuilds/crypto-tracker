# Task D1: README, deployment guide, GitHub Actions workflow

## Goal

Documentation a future maintainer (or the owner in six months) can follow: what the project is, how to run it locally, and an exact, ordered deployment guide for Cloudflare including Google OAuth and VAPID setup, plus a GitHub Actions workflow that deploys on push to `main`.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/PRD.md`, `docs/TECH_STACK.md`, `docs/WORK_PLAN.md` (sections 1–2).
  - `package.json` (root scripts), `pnpm-workspace.yaml`, `apps/api/package.json` (scripts), `apps/api/wrangler.jsonc`, `apps/api/.dev.vars.example`, `apps/api/scripts/*.mjs`, `apps/web/package.json`, `README.md` (current short version; you replace it).
- Facts to document exactly:
  - Node 24, pnpm 12 (`npm i -g pnpm`), `pnpm install`, `pnpm dev` (Vite on 5173 proxying `/api` to wrangler on 8787), `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm format`.
  - Local D1: `pnpm --filter @crypto-tracker/api db:migrate:local`. Schema changes: edit `apps/api/src/db/schema.ts`, `pnpm --filter @crypto-tracker/api db:generate`, migrate.
  - Secrets: names in `.dev.vars.example`; local in `apps/api/.dev.vars`; production via `wrangler secret put <NAME>` from `apps/api`.
  - Production steps: `wrangler login`; `wrangler d1 create crypto_tracker_db` → paste id into `wrangler.jsonc`; `wrangler kv namespace create CACHE` → paste id; set `APP_ORIGIN` in `wrangler.jsonc` `vars` to the deployed origin (`https://crypto-tracker.<account>.workers.dev` or a custom domain); Google Cloud Console OAuth client (Web application) with authorized redirect URI `<APP_ORIGIN>/api/auth/callback/google` and authorized JavaScript origin `<APP_ORIGIN>`; `node scripts/generate-vapid-keys.mjs`; `wrangler secret put` for all six secrets; `pnpm build` at the root (builds the SPA into `apps/web/dist`); `pnpm --filter @crypto-tracker/api db:migrate:remote`; `pnpm --filter @crypto-tracker/api deploy`; cron triggers come from `wrangler.jsonc`.
  - Free-tier notes from TECH_STACK.md section 8.

## Parallel work warning

Other workers are editing `apps/**` and `packages/**`. Do not touch code. No installs.

## Files you own

- `README.md` (replace)
- `docs/DEPLOY.md` (new)
- `.github/workflows/deploy.yml` (new)

## Steps

1. `README.md`: project name and one-paragraph description (for whom, what it does), feature list (from PRD section 6 headings), screenshots section placeholder is NOT allowed — instead a short "Screens" list in words; "Tech stack" table (short, from TECH_STACK.md); "Getting started" (prerequisites, install, run, test); "Project layout" tree; link to `docs/PRD.md`, `docs/TECH_STACK.md`, `docs/DEPLOY.md`; license line "Private project".
2. `docs/DEPLOY.md`: numbered steps in the exact order above with the exact commands, what to copy where, and how to verify each step (`curl https://<origin>/api/health`, open the app, sign in). Include a "Rotating secrets" and "Updating" (pull, build, migrate, deploy) section and a troubleshooting table (Google `redirect_uri_mismatch`, 401 on `/api/me`, empty prices, push not arriving).
3. `.github/workflows/deploy.yml`: on push to `main`; `pnpm/action-setup@v4` with pnpm 12, `actions/setup-node@v4` Node 24 with pnpm cache; `pnpm install --frozen-lockfile`; `pnpm typecheck`; `pnpm test`; `pnpm build`; `pnpm --filter @crypto-tracker/api db:migrate:remote`; `pnpm --filter @crypto-tracker/api deploy`; env `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository secrets. Document in DEPLOY.md how to create that token (Workers Scripts edit, D1 edit, KV edit) and add the two secrets.

## Constraints

- Plain, precise English. No marketing tone. No emoji.
- No commits, pushes, installs.

## Acceptance criteria

- [ ] `pnpm exec prettier --check README.md docs/DEPLOY.md .github/workflows/deploy.yml` exits 0.
- [ ] Every command in DEPLOY.md matches a script that exists in the repo's `package.json` files.
- [ ] `.github/workflows/deploy.yml` is valid YAML (`node -e "require('js-yaml')"` is not available; validate by careful indentation and by running `pnpm exec prettier --check` which parses YAML).

## Verification commands to run before reporting

```
pnpm exec prettier --check README.md docs/DEPLOY.md .github/workflows/deploy.yml
git status --short
```

## Report

Format from your agent instructions.
