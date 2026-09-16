import type { CoinSearchResult, FxRates, PriceQuote } from '@crypto-tracker/shared';
import type { CoinResolver, FxProvider, PriceProvider } from '../contracts';
import type { Env } from '../env';
import {
  CACHE_TTL,
  coinResolveKey,
  coinSearchKey,
  fxKey,
  getJson,
  priceKey,
  putJson,
} from './cache';
import {
  fetchSimplePrices,
  resolveCoin as resolveCoinFromCoingecko,
  searchCoins as searchCoinsFromCoingecko,
} from './coingecko';
import { fetchFxRates } from './fx';

const MIN_SEARCH_QUERY_LENGTH = 2;

interface ResolveMiss {
  miss: true;
}

async function getPrices(
  env: Env,
  coinIds: readonly string[],
): Promise<{ prices: Record<string, PriceQuote>; updatedAt: string | null }> {
  const ids = [...new Set(coinIds)];
  const prices: Record<string, PriceQuote> = {};
  if (ids.length === 0) {
    return { prices, updatedAt: null };
  }

  const cachedEntries = await Promise.all(
    ids.map(async (id) => [id, await getJson<PriceQuote>(env.CACHE, priceKey(id))] as const),
  );
  const missing: string[] = [];
  for (const [id, quote] of cachedEntries) {
    if (quote) prices[id] = quote;
    else missing.push(id);
  }

  if (missing.length > 0) {
    try {
      const fetched = await fetchSimplePrices(missing);
      await Promise.all(
        Object.entries(fetched).map(([id, quote]) =>
          putJson(env.CACHE, priceKey(id), quote, CACHE_TTL.PRICE),
        ),
      );
      Object.assign(prices, fetched);
    } catch (error) {
      if (Object.keys(prices).length === 0) {
        throw error;
      }
      console.error('[market] failed to fetch missing prices, serving cached values', error);
    }
  }

  const updatedAt = Object.values(prices).reduce<string | null>(
    (latest, quote) => (latest === null || quote.updatedAt > latest ? quote.updatedAt : latest),
    null,
  );

  return { prices, updatedAt };
}

async function getFxRates(env: Env): Promise<FxRates> {
  const cached = await getJson<FxRates>(env.CACHE, fxKey());
  if (cached) return cached;

  try {
    const rates = await fetchFxRates();
    await putJson(env.CACHE, fxKey(), rates, CACHE_TTL.FX);
    return rates;
  } catch (error) {
    console.error('[market] failed to fetch fx rates and nothing cached', error);
    throw error;
  }
}

async function searchCoins(env: Env, query: string): Promise<CoinSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) return [];

  const key = coinSearchKey(trimmed);
  const cached = await getJson<CoinSearchResult[]>(env.CACHE, key);
  if (cached) return cached;

  const results = await searchCoinsFromCoingecko(trimmed);
  await putJson(env.CACHE, key, results, CACHE_TTL.COIN_SEARCH);
  return results;
}

async function resolveCoin(env: Env, query: string): Promise<CoinSearchResult | null> {
  const trimmed = query.trim();
  const key = coinResolveKey(trimmed);
  const cached = await getJson<CoinSearchResult | ResolveMiss>(env.CACHE, key);
  if (cached) {
    return 'miss' in cached ? null : cached;
  }

  const result = await resolveCoinFromCoingecko(trimmed);
  if (result) {
    await putJson(env.CACHE, key, result, CACHE_TTL.COIN_RESOLVE);
  } else {
    await putJson(env.CACHE, key, { miss: true } satisfies ResolveMiss, CACHE_TTL.COIN_SEARCH);
  }
  return result;
}

export const marketData: PriceProvider & FxProvider & CoinResolver = {
  getPrices,
  getFxRates,
  searchCoins,
  resolveCoin,
};
