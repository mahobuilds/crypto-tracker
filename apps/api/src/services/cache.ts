/** Typed helpers over the `CACHE` KV namespace, plus the cache key builders services use. */

export async function getJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  return kv.get<T>(key, 'json');
}

export async function putJson<T>(
  kv: KVNamespace,
  key: string,
  value: T,
  ttlSeconds?: number,
): Promise<void> {
  await kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
}

export const CACHE_TTL = {
  PRICE: 300,
  FX: 24 * 60 * 60,
  COIN_SEARCH: 60 * 60,
  COIN_RESOLVE: 24 * 60 * 60,
} as const;

export function priceKey(coinId: string): string {
  return `price:${coinId}`;
}

export function fxKey(): string {
  return 'fx:usd';
}

export function coinSearchKey(query: string): string {
  return `coins:search:${query.toLowerCase()}`;
}

export function coinResolveKey(query: string): string {
  return `coins:resolve:${query.toLowerCase()}`;
}
