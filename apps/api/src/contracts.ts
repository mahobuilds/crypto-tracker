import type { CoinSearchResult, FxRates, PriceQuote } from '@crypto-tracker/shared';

export interface PriceProvider {
  /** Latest quotes for the given CoinGecko ids. Missing ids are absent from the result. */
  getPrices(
    env: Env,
    coinIds: readonly string[],
  ): Promise<{ prices: Record<string, PriceQuote>; updatedAt: string | null }>;
}

export interface FxProvider {
  getFxRates(env: Env): Promise<FxRates>;
}

export interface CoinResolver {
  searchCoins(env: Env, query: string): Promise<CoinSearchResult[]>;
  /** Resolve a ticker ("btc") or CoinGecko id ("bitcoin") to one coin, or null. */
  resolveCoin(env: Env, query: string): Promise<CoinSearchResult | null>;
}
