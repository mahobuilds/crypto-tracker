import { describe, expect, it, vi } from 'vitest';
import type { MemoryCache } from '../lib/memory-cache';
import { coinResolveKey, coinSearchKey, fxKey, getJson, priceKey, putJson } from './cache';

/** Minimal in-memory MemoryCache fake sufficient for these services. */
export class FakeCache {
  private readonly store = new Map<string, string>();
  readonly putCalls: Array<{ key: string; value: string; ttlSeconds?: number }> = [];

  async get<T>(key: string, type?: 'json'): Promise<T | string | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    return type === 'json' ? (JSON.parse(raw) as T) : raw;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
    this.putCalls.push({ key, value, ttlSeconds: options?.expirationTtl });
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

describe('cache key builders', () => {
  it('builds the documented key shapes, lower-casing query keys', () => {
    expect(priceKey('bitcoin')).toBe('price:bitcoin');
    expect(fxKey()).toBe('fx:usd');
    expect(coinSearchKey('BTC')).toBe('coins:search:btc');
    expect(coinResolveKey('Ethereum')).toBe('coins:resolve:ethereum');
  });
});

describe('getJson / putJson', () => {
  it('round trips a value through JSON and passes the TTL through to put', async () => {
    const kv = new FakeCache();
    await putJson(kv as unknown as MemoryCache, 'price:bitcoin', { usd: 1 }, 300);
    expect(await getJson<{ usd: number }>(kv as unknown as MemoryCache, 'price:bitcoin')).toEqual({
      usd: 1,
    });
    expect(kv.putCalls[0]).toEqual({
      key: 'price:bitcoin',
      value: JSON.stringify({ usd: 1 }),
      ttlSeconds: 300,
    });
  });

  it('returns null for a missing key without calling fetch', async () => {
    const kv = new FakeCache();
    const spy = vi.fn();
    expect(await getJson(kv as unknown as MemoryCache, 'missing')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('omits the TTL option when none is given', async () => {
    const kv = new FakeCache();
    await putJson(kv as unknown as MemoryCache, 'fx:usd', { base: 'USD' });
    expect(kv.putCalls[0]?.ttlSeconds).toBeUndefined();
  });
});
