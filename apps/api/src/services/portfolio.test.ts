import { describe, expect, it } from 'vitest';
import type { PortfolioSnapshot } from '@crypto-tracker/shared';
import type { TransactionRow } from '../db/schema';
import { downsample, rowToTransactionLike, summarize } from './portfolio';

function row(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    userId: 'user-1',
    type: 'buy',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 2,
    pricePerUnit: 100,
    currency: 'USD',
    pricePerUnitUsd: 100,
    fee: 1,
    feeUsd: 1,
    occurredAt: '2024-06-01T00:00:00.000Z',
    note: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function snapshot(takenAt: string, totalValueUsd = 0): PortfolioSnapshot {
  return { takenAt, totalValueUsd, investedUsd: totalValueUsd };
}

describe('rowToTransactionLike', () => {
  it('picks the TransactionLike fields from a row', () => {
    const result = rowToTransactionLike(row());
    expect(result).toEqual({
      id: 'tx-1',
      type: 'buy',
      coinId: 'bitcoin',
      coinSymbol: 'BTC',
      coinName: 'Bitcoin',
      quantity: 2,
      pricePerUnitUsd: 100,
      feeUsd: 1,
      occurredAt: '2024-06-01T00:00:00.000Z',
      createdAt: '2024-06-01T00:00:00.000Z',
    });
  });

  it('throws for an unknown transaction type', () => {
    expect(() => rowToTransactionLike(row({ type: 'transfer' }))).toThrow(
      /Unknown transaction type/,
    );
  });
});

describe('downsample', () => {
  it('returns the points unchanged when at or below the limit', () => {
    const points = [snapshot('2024-01-01'), snapshot('2024-01-02')];
    expect(downsample(points, 5)).toEqual(points);
  });

  it('keeps the first and last point when downsampling', () => {
    const points = Array.from({ length: 20 }, (_, i) => snapshot(`t-${i}`));
    const result = downsample(points, 5);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1]).toEqual(points[points.length - 1]);
  });

  it('reduces the length to exactly maxPoints', () => {
    const points = Array.from({ length: 1000 }, (_, i) => snapshot(String(i)));
    expect(downsample(points, 500)).toHaveLength(500);
  });

  it('returns an empty array for an empty input', () => {
    expect(downsample([], 500)).toEqual([]);
  });
});

describe('summarize', () => {
  it('delegates to computePortfolio for one priced holding', () => {
    const txs = [
      {
        id: 'tx-1',
        type: 'buy' as const,
        coinId: 'bitcoin',
        coinSymbol: 'BTC',
        coinName: 'Bitcoin',
        quantity: 2,
        pricePerUnitUsd: 100,
        feeUsd: 0,
        occurredAt: '2024-06-01T00:00:00.000Z',
        createdAt: '2024-06-01T00:00:00.000Z',
      },
    ];
    const fx = {
      base: 'USD' as const,
      rates: { USD: 1, EUR: 0.9, SAR: 3.75, TRY: 30 },
      updatedAt: '2024-06-01T00:00:00.000Z',
    };
    const prices = {
      bitcoin: {
        coinId: 'bitcoin',
        usd: 150,
        eur: 135,
        sar: 562.5,
        try: 4500,
        change24hPct: 0,
        updatedAt: '2024-06-01T00:00:00.000Z',
      },
    };
    const summary = summarize(txs, prices, fx, '2024-06-01T00:00:00.000Z');
    expect(summary.investedUsd).toBeCloseTo(200);
    expect(summary.totalValueUsd).toBeCloseTo(300);
    expect(summary.unrealizedPnlUsd).toBeCloseTo(100);
    expect(summary.fx).toBe(fx);
    expect(summary.pricesUpdatedAt).toBe('2024-06-01T00:00:00.000Z');
  });
});
