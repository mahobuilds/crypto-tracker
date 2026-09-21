import { describe, expect, it } from 'vitest';
import type { PortfolioSnapshot } from '@crypto-tracker/shared';
import type { TransactionRow } from '../db/schema';
import {
  breakdownByWallet,
  downsample,
  filterByWallet,
  rowToTransactionLike,
  summarize,
} from './portfolio';

function row(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    userId: 'user-1',
    type: 'buy',
    scope: 'personal',
    participants: '[]',
    walletId: 'wallet-1',
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
  return {
    takenAt,
    totalValueUsd,
    investedUsd: totalValueUsd,
    ownTotalValueUsd: null,
    ownInvestedUsd: null,
  };
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
      ownerSharePct: 100,
      walletId: 'wallet-1',
    });
  });

  it('carries the owner share of a group trade', () => {
    const participants = JSON.stringify([
      { name: 'Me', sharePct: 35, isMe: true },
      { name: 'Ali', sharePct: 65, isMe: false },
    ]);
    expect(rowToTransactionLike(row({ scope: 'group', participants })).ownerSharePct).toBe(35);
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

describe('filterByWallet', () => {
  const txs = [
    rowToTransactionLike(row({ id: 'a', walletId: 'w1' })),
    rowToTransactionLike(row({ id: 'b', walletId: 'w2' })),
    rowToTransactionLike(row({ id: 'c', walletId: 'w1' })),
  ];

  it('returns every transaction for the whole portfolio', () => {
    expect(filterByWallet(txs, null).map((tx) => tx.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps only the chosen wallet', () => {
    expect(filterByWallet(txs, 'w1').map((tx) => tx.id)).toEqual(['a', 'c']);
  });

  it('values one wallet on its own and echoes the wallet id', () => {
    const prices = {
      bitcoin: {
        coinId: 'bitcoin',
        usd: 200,
        eur: 0,
        sar: 0,
        try: 0,
        change24hPct: 0,
        updatedAt: '',
      },
    };
    const fx = { base: 'USD' as const, rates: { USD: 1, EUR: 1, SAR: 1, TRY: 1 }, updatedAt: '' };
    const whole = summarize(txs, prices, fx, null);
    const one = summarize(txs, prices, fx, null, 'whole', 'w2');
    expect(whole.walletId).toBeNull();
    expect(one.walletId).toBe('w2');
    expect(whole.totalValueUsd).toBe(1200);
    expect(one.totalValueUsd).toBe(400);
  });
});

describe('breakdownByWallet', () => {
  it('values every wallet from inputs fetched once, empty wallets included', () => {
    const txs = [
      rowToTransactionLike(row({ id: 'a', walletId: 'w1', quantity: 1 })),
      rowToTransactionLike(row({ id: 'b', walletId: 'w2', quantity: 3 })),
    ];
    const prices = {
      bitcoin: {
        coinId: 'bitcoin',
        usd: 200,
        eur: 0,
        sar: 0,
        try: 0,
        change24hPct: 0,
        updatedAt: '',
      },
    };
    const fx = { base: 'USD' as const, rates: { USD: 1, EUR: 1, SAR: 1, TRY: 1 }, updatedAt: '' };
    const wallet = (id: string, name: string, transactionCount: number) => ({
      id,
      name,
      transactionCount,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    const result = breakdownByWallet(
      [wallet('w1', 'Main', 1), wallet('w2', 'Ledger', 1), wallet('w3', 'Empty', 0)],
      { txs, prices, fx, pricesUpdatedAt: null },
    );
    expect(result.map((w) => [w.name, w.totalValueUsd, w.holdingsCount])).toEqual([
      ['Main', 200, 1],
      ['Ledger', 600, 1],
      ['Empty', 0, 0],
    ]);
  });
});
