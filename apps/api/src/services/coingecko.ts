import type { CoinSearchResult, PriceQuote } from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { nowIso } from '../lib/time';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CHUNK_SIZE = 50;
const SEARCH_RESULT_LIMIT = 10;

interface SimplePriceEntry {
  usd?: number;
  eur?: number;
  sar?: number;
  try?: number;
  usd_24h_change?: number | null;
}

type SimplePriceResponse = Record<string, SimplePriceEntry | undefined>;

interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
  thumb?: string | null;
  market_cap_rank?: number | null;
}

interface SearchResponse {
  coins: SearchCoin[];
}

async function callCoingecko(path: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'crypto-tracker/1.0' },
    });
  } catch (error) {
    throw new ApiError(
      502,
      'UPSTREAM_ERROR',
      `Failed to reach CoinGecko: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (response.status === 429) {
    throw new ApiError(503, 'UPSTREAM_RATE_LIMITED', 'Price service is busy, try again shortly');
  }
  if (!response.ok) {
    throw new ApiError(502, 'UPSTREAM_ERROR', `CoinGecko responded with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(502, 'UPSTREAM_ERROR', 'CoinGecko returned a non-JSON response');
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError(502, 'UPSTREAM_ERROR', 'CoinGecko returned malformed JSON');
  }
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function fetchSimplePrices(
  ids: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, PriceQuote>> {
  const result: Record<string, PriceQuote> = {};
  if (ids.length === 0) return result;

  for (const idsChunk of chunk(ids, CHUNK_SIZE)) {
    const path = `/simple/price?ids=${idsChunk.map(encodeURIComponent).join(',')}&vs_currencies=usd,eur,sar,try&include_24hr_change=true`;
    const data = (await callCoingecko(path, fetchImpl)) as SimplePriceResponse;
    for (const id of idsChunk) {
      const entry = data[id];
      if (
        !entry ||
        typeof entry.usd !== 'number' ||
        typeof entry.eur !== 'number' ||
        typeof entry.sar !== 'number' ||
        typeof entry.try !== 'number'
      ) {
        continue;
      }
      result[id] = {
        coinId: id,
        usd: entry.usd,
        eur: entry.eur,
        sar: entry.sar,
        try: entry.try,
        change24hPct: entry.usd_24h_change ?? 0,
        updatedAt: nowIso(),
      };
    }
  }

  return result;
}

function toCoinSearchResult(coin: SearchCoin): CoinSearchResult {
  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    thumb: coin.thumb ?? null,
  };
}

async function searchRaw(query: string, fetchImpl: typeof fetch): Promise<SearchCoin[]> {
  const data = (await callCoingecko(
    `/search?query=${encodeURIComponent(query)}`,
    fetchImpl,
  )) as SearchResponse;
  return [...data.coins].sort((a, b) => {
    const rankA = a.market_cap_rank ?? Number.POSITIVE_INFINITY;
    const rankB = b.market_cap_rank ?? Number.POSITIVE_INFINITY;
    return rankA - rankB;
  });
}

export async function searchCoins(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CoinSearchResult[]> {
  const coins = await searchRaw(query, fetchImpl);
  return coins.slice(0, SEARCH_RESULT_LIMIT).map(toCoinSearchResult);
}

export async function resolveCoin(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CoinSearchResult | null> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;

  const coins = await searchRaw(trimmed, fetchImpl);
  const bySymbol = coins.find((coin) => coin.symbol.toLowerCase() === trimmed.toLowerCase());
  if (bySymbol) return toCoinSearchResult(bySymbol);

  const byId = coins.find((coin) => coin.id.toLowerCase() === trimmed.toLowerCase());
  if (byId) return toCoinSearchResult(byId);

  return null;
}
