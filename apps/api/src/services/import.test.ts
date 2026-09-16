import { describe, expect, it, vi } from 'vitest';
import type { CoinSearchResult, CsvRowResult } from '@crypto-tracker/shared';
import type { CoinResolver } from '../contracts';
import type { Env } from '../env';
import { resolveRows } from './import';

function fakeCoins(coins: Record<string, CoinSearchResult>): CoinResolver {
  return {
    searchCoins: vi.fn(async () => []),
    resolveCoin: vi.fn(async (_env: Env, query: string) => coins[query] ?? null),
  };
}

function csvRow(overrides: Partial<CsvRowResult> = {}): CsvRowResult {
  return {
    line: 2,
    values: {
      occurredAt: '2024-01-01T00:00:00.000Z',
      type: 'buy',
      coin: 'btc',
      quantity: 1,
      pricePerUnit: 100,
      currency: 'USD',
      fee: 0,
      note: null,
    },
    errors: [],
    ...overrides,
  };
}

const env = {} as Env;
const bitcoin: CoinSearchResult = { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', thumb: null };

describe('resolveRows', () => {
  it('resolves a valid row into a TransactionInput', async () => {
    const coins = fakeCoins({ btc: bitcoin });
    const [result] = await resolveRows(env, { coins }, [csvRow()]);
    expect(result?.errors).toEqual([]);
    expect(result?.input).toEqual({
      type: 'buy',
      coinId: 'bitcoin',
      coinSymbol: 'BTC',
      coinName: 'Bitcoin',
      quantity: 1,
      pricePerUnit: 100,
      currency: 'USD',
      // The fee is always recalculated at 0.1% of quantity x price; the CSV value is ignored.
      fee: 0.1,
      occurredAt: '2024-01-01T00:00:00.000Z',
      note: null,
    });
  });

  it('reports an unresolved coin', async () => {
    const coins = fakeCoins({});
    const [result] = await resolveRows(env, { coins }, [csvRow({ line: 3 })]);
    expect(result?.line).toBe(3);
    expect(result?.input).toBeNull();
    expect(result?.errors).toEqual(['coin "btc" not found']);
  });

  it('passes through rows that already failed CSV validation', async () => {
    const coins = fakeCoins({ btc: bitcoin });
    const failed = csvRow({
      values: null,
      errors: ['quantity must be a number greater than 0, got "-1"'],
    });
    const [result] = await resolveRows(env, { coins }, [failed]);
    expect(result?.input).toBeNull();
    expect(result?.errors).toEqual(['quantity must be a number greater than 0, got "-1"']);
    expect(coins.resolveCoin).not.toHaveBeenCalled();
  });

  it('caches coin lookups per distinct string within one request', async () => {
    const coins = fakeCoins({ btc: bitcoin });
    const rows = [csvRow({ line: 2 }), csvRow({ line: 3 }), csvRow({ line: 4 })];
    const results = await resolveRows(env, { coins }, rows);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.input !== null)).toBe(true);
    expect(coins.resolveCoin).toHaveBeenCalledTimes(1);
  });

  it('looks up each distinct coin string once', async () => {
    const coins = fakeCoins({
      btc: bitcoin,
      eth: { id: 'ethereum', symbol: 'eth', name: 'Ethereum', thumb: null },
    });
    const rows = [
      csvRow({ line: 2 }),
      csvRow({ line: 3, values: { ...csvRow().values!, coin: 'eth' } }),
    ];
    const results = await resolveRows(env, { coins }, rows);
    expect(results[0]?.input?.coinId).toBe('bitcoin');
    expect(results[1]?.input?.coinId).toBe('ethereum');
    expect(coins.resolveCoin).toHaveBeenCalledTimes(2);
  });

  it('rejects an otherwise-resolved row that fails schema validation', async () => {
    const coins = fakeCoins({ btc: bitcoin });
    const invalid = csvRow({ values: { ...csvRow().values!, quantity: 0 } });
    const [result] = await resolveRows(env, { coins }, [invalid]);
    expect(result?.input).toBeNull();
    expect(result?.errors.length).toBeGreaterThan(0);
  });
});
