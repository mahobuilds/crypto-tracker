# Deployment Guide

This guide sets up production Cloudflare resources and deploys the app for the first time, then
covers day-to-day updates. Run all commands from the repository root unless a step says otherwise.
Steps that operate on the Worker are run from `apps/api` (`pnpm --filter @crypto-tracker/api <script>`
runs them from the root without changing directory).

## Prerequisites

- Node.js 24 and pnpm 12 installed (`npm i -g pnpm`).
- A Cloudflare account, logged in with `wrangler login` (opens a browser window).
- A Google Cloud project (for the OAuth client).

## First-time production setup

Do these steps in order. Each one says what to copy where and how to verify it.

### 1. Log in to Cloudflare

```sh
wrangler login
```

Verify: the browser confirms the login and the terminal prints "Successfully logged in".

### 2. Create the D1 database

```sh
cd apps/api
wrangler d1 create crypto_tracker_db
```

Copy the `database_id` printed in the output into `apps/api/wrangler.jsonc`, replacing the
placeholder in `d1_databases[0].database_id`.

Verify: `wrangler.jsonc` no longer contains `00000000-0000-0000-0000-000000000000` for
`database_id`.

### 3. Create the KV namespace

```sh
wrangler kv namespace create CACHE
```

Copy the `id` printed in the output into `apps/api/wrangler.jsonc`, replacing the placeholder in
`kv_namespaces[0].id`.

Verify: `wrangler.jsonc` no longer contains the placeholder KV id.

### 4. Set `APP_ORIGIN`

Decide the deployed origin: `https://crypto-tracker.<account>.workers.dev` (the default
`workers.dev` subdomain) or a custom domain you have attached to the Worker. Set it in
`apps/api/wrangler.jsonc` under `vars.APP_ORIGIN`, replacing `http://localhost:5173`.

Verify: `vars.APP_ORIGIN` in `wrangler.jsonc` matches the origin you intend to deploy to.

### 5. Create the Google OAuth client

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials →
Create Credentials → OAuth client ID → Application type **Web application**:

- Authorized JavaScript origin: `<APP_ORIGIN>`
- Authorized redirect URI: `<APP_ORIGIN>/api/auth/callback/google`

Copy the generated Client ID and Client Secret; they are set as secrets in step 7.

Verify: the Credentials page lists the new OAuth client with exactly one JavaScript origin and one
redirect URI, both using your `APP_ORIGIN`.

### 6. Generate VAPID keys

```sh
node scripts/generate-vapid-keys.mjs
```

(Run from `apps/api`.) This prints a public and private VAPID key pair. Copy both; they are set as
secrets in step 7.

Verify: the command prints two distinct base64url strings.

### 7. Set production secrets

From `apps/api`, set each of the six secrets. Wrangler prompts for the value after each command:

```sh
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT
```

Values:

- `BETTER_AUTH_SECRET`: a random 32+ byte secret, e.g. `openssl rand -base64 32`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: from step 5.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: from step 6.
- `VAPID_SUBJECT`: a `mailto:` or `https:` contact URL, e.g. `mailto:you@example.com`.

Verify: `wrangler secret list` (from `apps/api`) lists all six names.

### 8. Build the web app

```sh
pnpm build
```

(Run from the repository root.) This type-checks `packages/shared` and `apps/api`, and builds the
SPA into `apps/web/dist`, which the Worker serves as static assets.

Verify: `apps/web/dist/index.html` exists.

### 9. Apply database migrations to production

```sh
pnpm --filter @crypto-tracker/api db:migrate:remote
```

Verify: the command reports the migrations as applied with no errors.

### 10. Deploy the Worker

```sh
pnpm --filter @crypto-tracker/api deploy
```

This uploads the Worker together with the static assets in `apps/web/dist` and registers the cron
triggers already defined in `apps/api/wrangler.jsonc` (`triggers.crons`) — no separate step is
needed for cron.

Verify:

```sh
curl https://<origin>/api/health
```

should return a success response. Then open `https://<origin>` in a browser and sign in with
Google; a successful sign-in redirects into the app and shows the dashboard.

## Rotating secrets

To change any secret (for example, after rotating the Google client secret or regenerating VAPID
keys), set it again from `apps/api`:

```sh
wrangler secret put <NAME>
```

This overwrites the existing value; the next request picks it up immediately, no redeploy needed.
If you rotate `BETTER_AUTH_SECRET`, existing sessions are invalidated and users must sign in again.

## Updating

To ship a new version after code changes have been merged to `main`:

```sh
git pull
pnpm install
pnpm build
pnpm --filter @crypto-tracker/api db:migrate:remote
pnpm --filter @crypto-tracker/api deploy
```

Always run `db:migrate:remote` before `deploy` when the change includes a schema migration
(generated with `pnpm --filter @crypto-tracker/api db:generate` after editing
`apps/api/src/db/schema.ts`), so the deployed Worker never runs against a schema it does not expect.

This same sequence runs automatically in CI on every push to `main` — see
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) and the CI setup section below.

## CI deployment (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main`: install, typecheck, test, build,
migrate the remote D1 database, then deploy. It needs two repository secrets.

### Create a Cloudflare API token

In the Cloudflare dashboard → My Profile → API Tokens → Create Token → Create Custom Token, grant:

- Account → Workers Scripts → Edit
- Account → D1 → Edit
- Account → Workers KV Storage → Edit

Scope it to the account that owns this project. Copy the generated token.

### Add the repository secrets

In the GitHub repository → Settings → Secrets and variables → Actions → New repository secret, add:

- `CLOUDFLARE_API_TOKEN`: the token created above.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID (Cloudflare dashboard → Workers & Pages →
  Overview, shown in the right-hand sidebar).

Verify: push a commit to `main` and confirm the "Deploy" workflow run in the GitHub Actions tab
completes successfully, then `curl https://<origin>/api/health` again.

## Troubleshooting

| Symptom                                           | Likely cause                                                                                                                                                 | Fix                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google sign-in fails with `redirect_uri_mismatch` | The redirect URI registered in Google Cloud Console does not exactly match `<APP_ORIGIN>/api/auth/callback/google` (scheme, host, or trailing slash differs) | In Google Cloud Console, edit the OAuth client's authorized redirect URI to match `APP_ORIGIN` in `wrangler.jsonc` exactly; redeploy is not needed, the change is live immediately |
| `GET /api/me` returns 401 after signing in        | Session cookie not being set or sent — usually `APP_ORIGIN` in `wrangler.jsonc` does not match the URL actually used to reach the app                        | Set `APP_ORIGIN` to the exact origin used in the browser and redeploy; do not access the app through two different origins (e.g. both the `workers.dev` URL and a custom domain)   |
| Prices are empty on the dashboard                 | The price refresh cron has not run yet, or CoinGecko is unreachable                                                                                          | Wait up to one minute after first deploy for the cron to populate KV; check `wrangler tail` for errors from the price refresh job                                                  |
| Push notifications never arrive                   | VAPID keys missing/mismatched, or the user never granted browser notification permission                                                                     | Confirm `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are set with `wrangler secret list`, and that the app's push permission prompt was accepted in the browser                          |
