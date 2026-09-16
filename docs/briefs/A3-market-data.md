# Task A3: Market data — CoinGecko and FX services, KV cache, prices/fx/coins routes, refresh cron jobs

## Goal

Provide live prices, FX rates and coin search to the rest of the API. CoinGecko and open.er-api.com are called only from a small service layer that caches into Workers KV, so the app stays within free-tier limits. Routes read from the cache; cron jobs refresh it.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first:
  - `docs/WORK_PLAN.md` — sections 1 (decisions 5, 14, 16), 2.1, 2.3, 2.4.
  - `docs/TECH_STACK.md` — section 7.
  - `apps/api/src/contracts.ts` (you implement these interfaces), `types.ts`, `lib/errors.ts`, `lib/time.ts`, `db/schema.ts` (`transactions`, `alerts` for collecting coin ids), `db/client.ts`, `middleware/auth.ts`, `cron/index.ts` (`CronJob` type), `routes/me.ts` (style), `worker-configuration.d.ts` (`Env.CACHE` is a `KVNamespace`).
  - `packages/shared/src/types.ts` (`PriceQuote`, `PricesResponse`, `FxRates`, `CoinSearchResult`, `CoinSearchResponse`), `constants.ts` (`CRON`, `CURRENCIES`).
- Contracts you provide:
  ```ts
  // services/market.ts
  export const marketData: PriceProvider & FxProvider & CoinResolver;
  // routes/prices.ts
  export function createPricesRoutes(deps: { prices: PriceProvider; fx: FxProvider }): Hono<AppEnv>; // GET / (prices), GET /fx  -> master mounts at /api/prices and exposes /api/fx via a second mount, so ALSO export createFxRoutes(deps: { fx: FxProvider }) with GET /
  // routes/coins.ts
  export function createCoinsRoutes(deps: { coins: CoinResolver }): Hono<AppEnv>;  // GET /search?q=
  // cron/prices.ts
  export function createPriceRefreshJob(deps: { prices: PriceProvider }): CronJob;   // cron: CRON.EVERY_MINUTE
  // cron/fx.ts
  export function createFxRefreshJob(deps: { fx: FxProvider }): CronJob;             // cron: CRON.EVERY_6_HOURS
  ```
- External APIs:
  - CoinGecko simple price: `GET https://api.coingecko.com/api/v3/simple/price?ids=<comma ids>&vs_currencies=usd,eur,sar,try&include_24hr_change=true` → `{ [id]: { usd, eur, sar, try, usd_24h_change, ... } }`. Max ~50 ids per call; chunk if more.
  - CoinGecko search: `GET https://api.coingecko.com/api/v3/search?query=<q>` → `{ coins: [{ id, name, symbol, thumb, market_cap_rank }] }`.
  - CoinGecko coin lookup by id: `GET https://api.coingecko.com/api/v3/coins/<id>?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false` (only if needed for `resolveCoin`; prefer the search endpoint).
  - FX: `GET https://open.er-api.com/v6/latest/USD` → `{ result: 'success', rates: { EUR, SAR, TRY, ... }, time_last_update_utc }`.
  - Send header `Accept: application/json` and a `User-Agent: crypto-tracker/1.0`. Treat non-2xx and non-JSON as errors.

## Parallel work warning

Other workers own `routes/settings.ts`, `routes/transactions.ts`, `routes/import.ts`, `routes/portfolio.ts`, `routes/alerts.ts`, `routes/push.ts`, `services/transactions.ts`, `services/import.ts`, `services/portfolio.ts`, `services/push.ts`, `services/alerts.ts`, `cron/snapshots.ts`, `cron/alerts.ts`. Do not touch them or `src/index.ts` / `cron/index.ts`. No installs, no `wrangler dev`.

## Files you own

- `apps/api/src/services/cache.ts`, `coingecko.ts`, `fx.ts`, `market.ts` (new) + `coingecko.test.ts`, `fx.test.ts`, `cache.test.ts`
- `apps/api/src/routes/prices.ts`, `routes/coins.ts` (new)
- `apps/api/src/cron/prices.ts`, `cron/fx.ts` (new)

## Steps

### 1. `services/cache.ts`

Typed KV helpers over `env.CACHE`: `getJson<T>(kv, key): Promise<T | null>`, `putJson(kv, key, value, ttlSeconds?)`. Keys: `price:<coinId>` (TTL 300 s), `fx:usd` (TTL 24 h; refreshed every 6 h so it never expires in practice), `coins:search:<lowercased q>` (TTL 1 h), `coins:resolve:<lowercased query>` (TTL 24 h). Export the key builders.

### 2. `services/coingecko.ts`

- `fetchSimplePrices(ids: readonly string[], fetchImpl = fetch): Promise<Record<string, PriceQuote>>` — chunks of 50, maps to `PriceQuote` (`change24hPct = usd_24h_change ?? 0`, `updatedAt = nowIso()`). Skips ids missing from the response.
- `searchCoins(query, fetchImpl = fetch): Promise<CoinSearchResult[]>` — top 10 by `market_cap_rank` (nulls last), `symbol` upper-cased, `thumb ?? null`.
- `resolveCoin(query, fetchImpl = fetch)` — trims; if the search returns a coin whose `symbol` equals the query (case-insensitive) pick the best-ranked such coin; else if a coin's `id` equals the query pick it; else `null`.
- Handle HTTP 429 by throwing `ApiError(503, 'UPSTREAM_RATE_LIMITED', 'Price service is busy, try again shortly')`; other failures `ApiError(502, 'UPSTREAM_ERROR', ...)`.

### 3. `services/fx.ts`

`fetchFxRates(fetchImpl = fetch): Promise<FxRates>` — `{ base: 'USD', rates: { USD: 1, EUR, SAR, TRY }, updatedAt: nowIso() }`; missing any of the three → `ApiError(502, 'UPSTREAM_ERROR', ...)`.

### 4. `services/market.ts` — the `marketData` object implementing the contracts with caching

- `getPrices(env, coinIds)`: read `price:<id>` for each id (use `Promise.all`); ids missing from KV are fetched from CoinGecko in one call, stored, and merged. `updatedAt` = the newest `updatedAt` among returned quotes, else `null`. If CoinGecko fails and some cached quotes exist, return the cached ones (log the error); if nothing is cached, rethrow.
- `getFxRates(env)`: cached `fx:usd`, else fetch + store. If fetch fails and nothing cached, rethrow.
- `searchCoins(env, query)`: min length 2 else `[]`; cached per query.
- `resolveCoin(env, query)`: cached per query (store `null` results too, as `{ miss: true }`, TTL 1 h).

### 5. Routes

- `createPricesRoutes(deps)`: `use(requireAuth)`; `GET /` with `ids` query (comma-separated, trimmed, lowercase, deduplicated, max 100 else 400) → `PricesResponse`. Empty `ids` → `{ prices: {}, updatedAt: null }`.
- `createFxRoutes(deps)`: `use(requireAuth)`; `GET /` → `FxRates`.
- `createCoinsRoutes(deps)`: `use(requireAuth)`; `GET /search?q=` → `CoinSearchResponse` (`q` trimmed, max 50 chars).

### 6. Cron jobs

- `createPriceRefreshJob(deps)`: `{ name: 'price-refresh', cron: CRON.EVERY_MINUTE, run }` — collects distinct `coinId`s from `transactions` and enabled `alerts` across all users (Drizzle `selectDistinct`), calls `fetchSimplePrices` directly for those ids and writes them to KV (bypassing the read-through so quotes stay fresh), logs count. No ids → no call.
- `createFxRefreshJob(deps)`: `{ name: 'fx-refresh', cron: CRON.EVERY_6_HOURS, run }` — fetch + store.

### 7. Tests (fake `fetch` returning canned JSON; fake KV implemented in-memory in the test file)

- `fetchSimplePrices` mapping and chunking (61 ids → 2 calls); 429 → 503 ApiError.
- `searchCoins` ordering and mapping; `resolveCoin` by symbol, by id, miss.
- `fetchFxRates` success and missing-rate failure.
- `cache` get/put round trip and TTL argument passed.
- `marketData.getPrices` serves from cache without calling fetch; fetches only missing ids; falls back to cache on upstream failure.

## Constraints

- No commits, pushes, installs. No `any`. No TODOs. No API keys (free tier only).
- Everything network-related goes through an injectable `fetchImpl` so tests never hit the network.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/api typecheck` exits 0 (name any failures confined to other workers' files).
- [ ] `pnpm --filter @crypto-tracker/api exec vitest run src/services/coingecko src/services/fx src/services/cache src/services/market` passes with at least 15 tests (add `market.test.ts` if you keep those tests separate).
- [ ] `pnpm exec prettier --check apps/api/src/services apps/api/src/routes/prices.ts apps/api/src/routes/coins.ts apps/api/src/cron/prices.ts apps/api/src/cron/fx.ts` exits 0 for your files (other workers' files in `services/` may be mid-edit; report only yours).
- [ ] Exports match the contract names exactly.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/api typecheck
pnpm --filter @crypto-tracker/api exec vitest run src/services/coingecko src/services/fx src/services/cache src/services/market
pnpm exec prettier --check apps/api/src/services/cache.ts apps/api/src/services/coingecko.ts apps/api/src/services/fx.ts apps/api/src/services/market.ts apps/api/src/routes/prices.ts apps/api/src/routes/coins.ts apps/api/src/cron/prices.ts apps/api/src/cron/fx.ts
git status --short apps/api
```

## Report

Format from your agent instructions.
