import { describe, expect, it } from 'vitest';
import { EPSILON, computeHoldings, sortTransactions } from './holdings';
import { tx } from './testUtils';

describe('sortTransactions', () => {
  it('orders by occurredAt ascending', () => {
    const a = tx({ id: 'a', occurredAt: '2024-03-01T00:00:00.000Z' });
    const b = tx({ id: 'b', occurredAt: '2024-01-01T00:00:00.000Z' });
    const c = tx({ id: 'c', occurredAt: '2024-02-01T00:00:00.000Z' });
    expect(sortTransactions([a, b, c]).map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by createdAt, then id', () => {
    const at = '2024-01-01T00:00:00.000Z';
    const a = tx({ id: 'z', occurredAt: at, createdAt: '2024-01-02T00:00:00.000Z' });
    const b = tx({ id: 'b', occurredAt: at, createdAt: '2024-01-03T00:00:00.000Z' });
    const c = tx({ id: 'a', occurredAt: at, createdAt: '2024-01-02T00:00:00.000Z' });
    expect(sortTransactions([a, b, c]).map((t) => t.id)).toEqual(['a', 'z', 'b']);
  });

  it('does not mutate the input', () => {
    const a = tx({ id: 'a', occurredAt: '2024-03-01T00:00:00.000Z' });
    const b = tx({ id: 'b', occurredAt: '2024-01-01T00:00:00.000Z' });
    const input = [a, b];
    const sorted = sortTransactions(input);
    expect(sorted).not.toBe(input);
    expect(input.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('computeHoldings', () => {
  it('returns nothing for no transactions', () => {
    expect(computeHoldings([])).toEqual({ holdings: [], realizedPnlUsd: 0 });
  });

  it('records a single buy at its price', () => {
    const result = computeHoldings([tx({ quantity: 2, pricePerUnitUsd: 100 })]);
    expect(result.holdings).toHaveLength(1);
    const [h] = result.holdings;
    expect(h?.coinId).toBe('bitcoin');
    expect(h?.quantity).toBeCloseTo(2);
    expect(h?.averageCostUsd).toBeCloseTo(100);
    expect(h?.investedUsd).toBeCloseTo(200);
    expect(result.realizedPnlUsd).toBe(0);
  });

  it('computes the weighted average of two buys', () => {
    const result = computeHoldings([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 3, pricePerUnitUsd: 200 }),
    ]);
    const [h] = result.holdings;
    expect(h?.quantity).toBeCloseTo(4);
    expect(h?.averageCostUsd).toBeCloseTo(175);
    expect(h?.investedUsd).toBeCloseTo(700);
  });

  it('includes the buy fee in the cost basis', () => {
    const result = computeHoldings([tx({ quantity: 2, pricePerUnitUsd: 100, feeUsd: 10 })]);
    const [h] = result.holdings;
    expect(h?.investedUsd).toBeCloseTo(210);
    expect(h?.averageCostUsd).toBeCloseTo(105);
  });

  it('realizes P/L on a sell using the average cost minus the fee', () => {
    const result = computeHoldings([
      tx({ quantity: 2, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 150, feeUsd: 5 }),
    ]);
    expect(result.realizedPnlUsd).toBeCloseTo(45);
    const [h] = result.holdings;
    expect(h?.quantity).toBeCloseTo(1);
    expect(h?.averageCostUsd).toBeCloseTo(100);
    expect(h?.investedUsd).toBeCloseTo(100);
  });

  it('keeps the average cost of the remainder unchanged after a sell', () => {
    const result = computeHoldings([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 300 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 500 }),
    ]);
    expect(result.holdings[0]?.averageCostUsd).toBeCloseTo(200);
    expect(result.realizedPnlUsd).toBeCloseTo(300);
  });

  it('starts a fresh average after selling everything and buying again', () => {
    const result = computeHoldings([
      tx({ quantity: 3, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 3, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 500 }),
    ]);
    const [h] = result.holdings;
    expect(h?.quantity).toBeCloseTo(1);
    expect(h?.averageCostUsd).toBeCloseTo(500);
    expect(h?.investedUsd).toBeCloseTo(500);
  });

  it('treats floating point dust after a full sell as zero', () => {
    const result = computeHoldings([
      tx({ quantity: 0.1, pricePerUnitUsd: 100 }),
      tx({ quantity: 0.2, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 0.3, pricePerUnitUsd: 100 }),
    ]);
    expect(result.holdings).toEqual([]);
    expect(result.realizedPnlUsd).toBeCloseTo(0);
  });

  it('tracks coins independently', () => {
    const result = computeHoldings([
      tx({ coinId: 'bitcoin', coinSymbol: 'BTC', quantity: 1, pricePerUnitUsd: 100 }),
      tx({ coinId: 'ethereum', coinSymbol: 'ETH', quantity: 10, pricePerUnitUsd: 5 }),
      tx({ coinId: 'ethereum', type: 'sell', quantity: 5, pricePerUnitUsd: 10 }),
    ]);
    const btc = result.holdings.find((h) => h.coinId === 'bitcoin');
    const eth = result.holdings.find((h) => h.coinId === 'ethereum');
    expect(btc?.quantity).toBeCloseTo(1);
    expect(btc?.averageCostUsd).toBeCloseTo(100);
    expect(eth?.quantity).toBeCloseTo(5);
    expect(eth?.averageCostUsd).toBeCloseTo(5);
    expect(result.realizedPnlUsd).toBeCloseTo(25);
  });

  it('omits a fully sold coin', () => {
    const result = computeHoldings([
      tx({ coinId: 'bitcoin', quantity: 1, pricePerUnitUsd: 100 }),
      tx({ coinId: 'ethereum', quantity: 1, pricePerUnitUsd: 10 }),
      tx({ coinId: 'ethereum', type: 'sell', quantity: 1, pricePerUnitUsd: 20 }),
    ]);
    expect(result.holdings.map((h) => h.coinId)).toEqual(['bitcoin']);
  });

  it('sorts holdings by investedUsd descending', () => {
    const result = computeHoldings([
      tx({ coinId: 'small', quantity: 1, pricePerUnitUsd: 10 }),
      tx({ coinId: 'large', quantity: 1, pricePerUnitUsd: 1000 }),
      tx({ coinId: 'medium', quantity: 1, pricePerUnitUsd: 100 }),
    ]);
    expect(result.holdings.map((h) => h.coinId)).toEqual(['large', 'medium', 'small']);
  });

  it('uses the symbol and name of the most recent transaction', () => {
    const result = computeHoldings([
      tx({ coinSymbol: 'OLD', coinName: 'Old Name', occurredAt: '2024-02-01T00:00:00.000Z' }),
      tx({ coinSymbol: 'NEW', coinName: 'New Name', occurredAt: '2024-03-01T00:00:00.000Z' }),
      tx({ coinSymbol: 'FIRST', coinName: 'First', occurredAt: '2024-01-01T00:00:00.000Z' }),
    ]);
    expect(result.holdings[0]?.coinSymbol).toBe('NEW');
    expect(result.holdings[0]?.coinName).toBe('New Name');
  });

  it('replays in occurredAt order regardless of input order', () => {
    const sell = tx({
      type: 'sell',
      quantity: 1,
      pricePerUnitUsd: 200,
      occurredAt: '2024-02-01T00:00:00.000Z',
    });
    const buy = tx({ quantity: 1, pricePerUnitUsd: 100, occurredAt: '2024-01-01T00:00:00.000Z' });
    const result = computeHoldings([sell, buy]);
    expect(result.holdings).toEqual([]);
    expect(result.realizedPnlUsd).toBeCloseTo(100);
  });

  it('clamps an oversell to the held quantity without throwing', () => {
    const result = computeHoldings([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 5, pricePerUnitUsd: 150, feeUsd: 1 }),
    ]);
    expect(result.holdings).toEqual([]);
    expect(result.realizedPnlUsd).toBeCloseTo(49);
  });

  it('exposes a tiny epsilon', () => {
    expect(EPSILON).toBeGreaterThan(0);
    expect(EPSILON).toBeLessThan(1e-6);
  });
});
