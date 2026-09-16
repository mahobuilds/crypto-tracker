import { describe, expect, it } from 'vitest';
import { computePortfolio } from './summary';
import { fx, quote, tx } from './testUtils';

const updatedAt = '2024-06-01T00:00:00.000Z';

describe('computePortfolio', () => {
  it('returns zeros and an empty list for no transactions', () => {
    const summary = computePortfolio({ transactions: [], prices: {}, fx, pricesUpdatedAt: null });
    expect(summary).toEqual({
      totalValueUsd: 0,
      investedUsd: 0,
      unrealizedPnlUsd: 0,
      unrealizedPnlPct: 0,
      realizedPnlUsd: 0,
      holdings: [],
      fx,
      pricesUpdatedAt: null,
    });
  });

  it('computes totals for two priced coins', () => {
    const summary = computePortfolio({
      transactions: [
        tx({ coinId: 'bitcoin', quantity: 2, pricePerUnitUsd: 100 }),
        tx({ coinId: 'ethereum', quantity: 10, pricePerUnitUsd: 10 }),
      ],
      prices: { bitcoin: quote('bitcoin', 150), ethereum: quote('ethereum', 5) },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    expect(summary.investedUsd).toBeCloseTo(300);
    expect(summary.totalValueUsd).toBeCloseTo(350);
    expect(summary.unrealizedPnlUsd).toBeCloseTo(50);
    expect(summary.unrealizedPnlPct).toBeCloseTo((50 / 300) * 100);
    expect(summary.realizedPnlUsd).toBe(0);
    expect(summary.fx).toBe(fx);
    expect(summary.pricesUpdatedAt).toBe(updatedAt);

    const btc = summary.holdings.find((h) => h.coinId === 'bitcoin');
    expect(btc?.currentPriceUsd).toBe(150);
    expect(btc?.currentValueUsd).toBeCloseTo(300);
    expect(btc?.unrealizedPnlUsd).toBeCloseTo(100);
    expect(btc?.unrealizedPnlPct).toBeCloseTo(50);
    expect(btc?.allocationPct).toBeCloseTo((300 / 350) * 100);

    const eth = summary.holdings.find((h) => h.coinId === 'ethereum');
    expect(eth?.unrealizedPnlUsd).toBeCloseTo(-50);
    expect(eth?.unrealizedPnlPct).toBeCloseTo(-50);
  });

  it('nulls an unpriced coin and keeps it out of totals except investedUsd', () => {
    const summary = computePortfolio({
      transactions: [
        tx({ coinId: 'bitcoin', quantity: 1, pricePerUnitUsd: 100 }),
        tx({ coinId: 'obscure', quantity: 1, pricePerUnitUsd: 40 }),
      ],
      prices: { bitcoin: quote('bitcoin', 120) },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    expect(summary.investedUsd).toBeCloseTo(140);
    expect(summary.totalValueUsd).toBeCloseTo(120);
    expect(summary.unrealizedPnlUsd).toBeCloseTo(20);
    expect(summary.unrealizedPnlPct).toBeCloseTo(20);

    const obscure = summary.holdings.find((h) => h.coinId === 'obscure');
    expect(obscure).toMatchObject({
      investedUsd: 40,
      currentPriceUsd: null,
      currentValueUsd: null,
      unrealizedPnlUsd: null,
      unrealizedPnlPct: null,
      allocationPct: null,
    });
    expect(summary.holdings[0]?.allocationPct).toBeCloseTo(100);
  });

  it('allocation sums to 100 across priced holdings', () => {
    const summary = computePortfolio({
      transactions: [
        tx({ coinId: 'a', quantity: 1, pricePerUnitUsd: 1 }),
        tx({ coinId: 'b', quantity: 3, pricePerUnitUsd: 1 }),
        tx({ coinId: 'c', quantity: 7, pricePerUnitUsd: 1 }),
      ],
      prices: { a: quote('a', 1.1), b: quote('b', 2.3), c: quote('c', 0.7) },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    const sum = summary.holdings.reduce((acc, h) => acc + (h.allocationPct ?? 0), 0);
    expect(Math.abs(sum - 100)).toBeLessThan(1e-6);
  });

  it('sorts by currentValueUsd descending with unpriced last by investedUsd', () => {
    const summary = computePortfolio({
      transactions: [
        tx({ coinId: 'cheap-priced', quantity: 1, pricePerUnitUsd: 1000 }),
        tx({ coinId: 'rich-priced', quantity: 1, pricePerUnitUsd: 1 }),
        tx({ coinId: 'unpriced-small', quantity: 1, pricePerUnitUsd: 5 }),
        tx({ coinId: 'unpriced-big', quantity: 1, pricePerUnitUsd: 5000 }),
      ],
      prices: {
        'cheap-priced': quote('cheap-priced', 10),
        'rich-priced': quote('rich-priced', 500),
      },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    expect(summary.holdings.map((h) => h.coinId)).toEqual([
      'rich-priced',
      'cheap-priced',
      'unpriced-big',
      'unpriced-small',
    ]);
  });

  it('does not divide by zero when nothing was invested', () => {
    const summary = computePortfolio({
      transactions: [tx({ coinId: 'airdrop', quantity: 10, pricePerUnitUsd: 0 })],
      prices: { airdrop: quote('airdrop', 0) },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    expect(summary.investedUsd).toBe(0);
    expect(summary.totalValueUsd).toBe(0);
    expect(summary.unrealizedPnlPct).toBe(0);
    expect(summary.holdings[0]?.unrealizedPnlPct).toBe(0);
    expect(summary.holdings[0]?.allocationPct).toBe(0);
    expect(Number.isFinite(summary.holdings[0]?.averageCostUsd ?? Number.NaN)).toBe(true);
  });

  it('passes realized P/L through from the holdings engine', () => {
    const summary = computePortfolio({
      transactions: [
        tx({ quantity: 2, pricePerUnitUsd: 100 }),
        tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 130, feeUsd: 2 }),
      ],
      prices: { bitcoin: quote('bitcoin', 100) },
      fx,
      pricesUpdatedAt: updatedAt,
    });
    expect(summary.realizedPnlUsd).toBeCloseTo(28);
    expect(summary.holdings[0]?.quantity).toBeCloseTo(1);
  });
});
