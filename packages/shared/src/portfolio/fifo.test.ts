import { describe, expect, it } from 'vitest';
import { computeFifo } from './fifo';
import { computeHoldings } from './holdings';
import { computePortfolio } from './summary';
import { fx, quote, tx } from './testUtils';

describe('computeFifo', () => {
  it('opens one lot per buy and keeps its cost basis', () => {
    const result = computeFifo([tx({ quantity: 2, pricePerUnitUsd: 100, feeUsd: 10 })]);
    expect(result.realizedPnlUsd).toBe(0);
    expect(result.coins['bitcoin']?.quantity).toBe(2);
    // fee spread into the unit cost: (200 + 10) / 2 = 105 per unit
    expect(result.coins['bitcoin']?.investedUsd).toBeCloseTo(210);
  });

  it('consumes the oldest lot first when selling', () => {
    const result = computeFifo([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 200 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 250 }),
    ]);
    // sold the $100 lot: 250 - 100 = 150 realized; the $200 lot remains
    expect(result.realizedPnlUsd).toBeCloseTo(150);
    expect(result.coins['bitcoin']?.quantity).toBe(1);
    expect(result.coins['bitcoin']?.investedUsd).toBeCloseTo(200);
  });

  it('differs from average cost on the same trades', () => {
    const trades = [
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 200 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 250 }),
    ];
    const fifo = computeFifo(trades);
    const average = computeHoldings(trades);
    expect(fifo.realizedPnlUsd).toBeCloseTo(150);
    expect(average.realizedPnlUsd).toBeCloseTo(100); // 250 - avg 150
  });

  it('splits a lot when a sell is smaller than it', () => {
    const result = computeFifo([
      tx({ quantity: 3, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 130, feeUsd: 5 }),
    ]);
    expect(result.realizedPnlUsd).toBeCloseTo(30 - 5);
    expect(result.coins['bitcoin']?.quantity).toBe(2);
    expect(result.coins['bitcoin']?.investedUsd).toBeCloseTo(200);
  });

  it('spans several lots in one sell', () => {
    const result = computeFifo([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 120 }),
      tx({ quantity: 1, pricePerUnitUsd: 140 }),
      tx({ type: 'sell', quantity: 2.5, pricePerUnitUsd: 200 }),
    ]);
    // (200-100) + (200-120) + 0.5 * (200-140) = 100 + 80 + 30
    expect(result.realizedPnlUsd).toBeCloseTo(210);
    expect(result.coins['bitcoin']?.quantity).toBeCloseTo(0.5);
    expect(result.coins['bitcoin']?.investedUsd).toBeCloseTo(70);
  });

  it('drops fully sold coins from the remaining set but keeps their realized P/L', () => {
    const result = computeFifo([
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 90 }),
    ]);
    expect(result.coins['bitcoin']).toBeUndefined();
    expect(result.realizedPnlUsd).toBeCloseTo(-10);
  });

  it('tracks coins independently and replays in occurredAt order', () => {
    const late = tx({ quantity: 1, pricePerUnitUsd: 300, occurredAt: '2025-01-05T00:00:00.000Z' });
    const early = tx({ quantity: 1, pricePerUnitUsd: 100, occurredAt: '2025-01-01T00:00:00.000Z' });
    const sell = tx({
      type: 'sell',
      quantity: 1,
      pricePerUnitUsd: 400,
      occurredAt: '2025-01-10T00:00:00.000Z',
    });
    const eth = tx({ coinId: 'ethereum', quantity: 5, pricePerUnitUsd: 10 });
    const result = computeFifo([late, sell, early, eth]);
    expect(result.realizedPnlUsd).toBeCloseTo(300); // sold the early $100 lot
    expect(result.coins['bitcoin']?.investedUsd).toBeCloseTo(300);
    expect(result.coins['ethereum']?.investedUsd).toBeCloseTo(50);
  });
});

describe('computePortfolio methods', () => {
  it('reports average and FIFO side by side', () => {
    const trades = [
      tx({ quantity: 1, pricePerUnitUsd: 100 }),
      tx({ quantity: 1, pricePerUnitUsd: 200 }),
      tx({ type: 'sell', quantity: 1, pricePerUnitUsd: 250 }),
    ];
    const summary = computePortfolio({
      transactions: trades,
      prices: { bitcoin: quote('bitcoin', 300) },
      fx,
      pricesUpdatedAt: null,
    });
    expect(summary.methods.average.realizedPnlUsd).toBeCloseTo(100);
    expect(summary.methods.average.investedUsd).toBeCloseTo(150);
    expect(summary.methods.average.unrealizedPnlUsd).toBeCloseTo(150);
    expect(summary.methods.fifo.realizedPnlUsd).toBeCloseTo(150);
    expect(summary.methods.fifo.investedUsd).toBeCloseTo(200);
    expect(summary.methods.fifo.unrealizedPnlUsd).toBeCloseTo(100);
    expect(summary.methods.fifo.unrealizedPnlPct).toBeCloseTo(50);
  });

  it('marks unrealized figures null when nothing is priced', () => {
    const summary = computePortfolio({
      transactions: [tx({ quantity: 1, pricePerUnitUsd: 100 })],
      prices: {},
      fx,
      pricesUpdatedAt: null,
    });
    expect(summary.methods.fifo.unrealizedPnlUsd).toBeNull();
    expect(summary.methods.fifo.unrealizedPnlPct).toBeNull();
    expect(summary.methods.average.unrealizedPnlPct).toBeNull();
  });
});
