import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/errors';
import { fetchSimplePrices, resolveCoin, searchCoins } from './coingecko';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

describe('fetchSimplePrices', () => {
  it('maps a single-chunk response to PriceQuote, defaulting a missing 24h change to 0', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        bitcoin: { usd: 65000, eur: 60000, sar: 244000, try: 2100000, usd_24h_change: -1.5 },
        ethereum: { usd: 3400, eur: 3100, sar: 12750, try: 109000 },
      }),
    );

    const result = await fetchSimplePrices(['bitcoin', 'ethereum'], fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.bitcoin).toMatchObject({ coinId: 'bitcoin', usd: 65000, change24hPct: -1.5 });
    expect(result.ethereum).toMatchObject({ coinId: 'ethereum', usd: 3400, change24hPct: 0 });
    expect(typeof result.bitcoin?.updatedAt).toBe('string');
  });

  it('skips ids missing from the response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ bitcoin: { usd: 1, eur: 1, sar: 1, try: 1 } }));
    const result = await fetchSimplePrices(['bitcoin', 'doesnotexist'], fetchImpl);
    expect(Object.keys(result)).toEqual(['bitcoin']);
  });

  it('chunks requests into batches of 50 ids', async () => {
    const ids = Array.from({ length: 61 }, (_, i) => `coin-${i}`);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));

    await fetchSimplePrices(ids, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstUrl = String(fetchImpl.mock.calls[0]?.[0]);
    const secondUrl = String(fetchImpl.mock.calls[1]?.[0]);
    expect(firstUrl.split('coin-').length - 1).toBe(50);
    expect(secondUrl.split('coin-').length - 1).toBe(11);
  });

  it('throws a 503 ApiError on 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    await expect(fetchSimplePrices(['bitcoin'], fetchImpl)).rejects.toMatchObject({
      status: 503,
      code: 'UPSTREAM_RATE_LIMITED',
    });
    await expect(fetchSimplePrices(['bitcoin'], fetchImpl)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws a 502 ApiError on other failures', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(fetchSimplePrices(['bitcoin'], fetchImpl)).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_ERROR',
    });
  });
});

const SEARCH_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', thumb: 'btc.png', market_cap_rank: 1 },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'bch', thumb: null, market_cap_rank: 20 },
  { id: 'unranked-coin', name: 'Unranked', symbol: 'unr', market_cap_rank: null },
];

describe('searchCoins', () => {
  it('sorts by market_cap_rank with nulls last and maps fields, upper-casing the symbol', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ coins: SEARCH_COINS }));
    const results = await searchCoins('bit', fetchImpl);
    expect(results.map((r) => r.id)).toEqual(['bitcoin', 'bitcoin-cash', 'unranked-coin']);
    expect(results[0]).toEqual({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', thumb: 'btc.png' });
    expect(results[1]?.thumb).toBeNull();
  });

  it('limits to the top 10 results', async () => {
    const coins = Array.from({ length: 15 }, (_, i) => ({
      id: `coin-${i}`,
      name: `Coin ${i}`,
      symbol: `c${i}`,
      market_cap_rank: i + 1,
    }));
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ coins }));
    const results = await searchCoins('coin', fetchImpl);
    expect(results).toHaveLength(10);
  });
});

describe('resolveCoin', () => {
  it('resolves by symbol (case-insensitive), preferring the best-ranked match', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ coins: SEARCH_COINS }));
    const result = await resolveCoin('BTC', fetchImpl);
    expect(result?.id).toBe('bitcoin');
  });

  it('resolves by id when no symbol matches', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ coins: SEARCH_COINS }));
    const result = await resolveCoin('bitcoin-cash', fetchImpl);
    expect(result?.id).toBe('bitcoin-cash');
  });

  it('returns null when nothing matches by symbol or id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ coins: SEARCH_COINS }));
    expect(await resolveCoin('doesnotexist', fetchImpl)).toBeNull();
  });
});
