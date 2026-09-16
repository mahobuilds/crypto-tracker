import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PriceQuote } from '@crypto-tracker/shared';
import { priceKey, putJson } from './cache';
import { marketData } from './market';

/** Minimal in-memory KVNamespace fake, local to this test file. */
class FakeKVNamespace {
  private readonly store = new Map<string, string>();

  async get<T>(key: string, type?: 'json'): Promise<T | string | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    return type === 'json' ? (JSON.parse(raw) as T) : raw;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function makeEnv(kv: FakeKVNamespace): Env {
  return { CACHE: kv } as unknown as Env;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

function quote(coinId: string): PriceQuote {
  return {
    coinId,
    usd: 1,
    eur: 1,
    sar: 1,
    try: 1,
    change24hPct: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('marketData.getPrices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves entirely from cache without calling fetch', async () => {
    const kv = new FakeKVNamespace();
    await putJson(kv as unknown as KVNamespace, priceKey('bitcoin'), quote('bitcoin'), 300);
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);

    const result = await marketData.getPrices(makeEnv(kv), ['bitcoin']);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.prices.bitcoin).toEqual(quote('bitcoin'));
    expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('fetches only the ids missing from the cache', async () => {
    const kv = new FakeKVNamespace();
    await putJson(kv as unknown as KVNamespace, priceKey('bitcoin'), quote('bitcoin'), 300);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ethereum: { usd: 2, eur: 2, sar: 2, try: 2, usd_24h_change: 1 } }),
      );
    vi.stubGlobal('fetch', fetchImpl);

    const result = await marketData.getPrices(makeEnv(kv), ['bitcoin', 'ethereum']);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('ethereum');
    expect(requestedUrl).not.toContain('ids=bitcoin');
    expect(result.prices.bitcoin?.usd).toBe(1);
    expect(result.prices.ethereum?.usd).toBe(2);
  });

  it('falls back to cached quotes when the upstream fetch fails', async () => {
    const kv = new FakeKVNamespace();
    await putJson(kv as unknown as KVNamespace, priceKey('bitcoin'), quote('bitcoin'), 300);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    vi.stubGlobal('fetch', fetchImpl);

    const result = await marketData.getPrices(makeEnv(kv), ['bitcoin', 'ethereum']);

    expect(result.prices).toEqual({ bitcoin: quote('bitcoin') });
  });

  it('rethrows the upstream error when nothing is cached', async () => {
    const kv = new FakeKVNamespace();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    vi.stubGlobal('fetch', fetchImpl);

    await expect(marketData.getPrices(makeEnv(kv), ['ethereum'])).rejects.toMatchObject({
      status: 502,
    });
  });

  it('returns an empty result for an empty id list without calling fetch', async () => {
    const kv = new FakeKVNamespace();
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);

    const result = await marketData.getPrices(makeEnv(kv), []);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ prices: {}, updatedAt: null });
  });
});
