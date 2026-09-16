import { describe, expect, it } from 'vitest';
import type { FxRates, TransactionInput, TransactionLike } from '@crypto-tracker/shared';
import { ApiError } from '../lib/errors';
import { assertTimelineValid, normalizeUsd, rowToTransaction } from './transactions';
import type { TransactionRow } from '../db/schema';

const fx: FxRates = {
  base: 'USD',
  rates: { USD: 1, EUR: 0.9, SAR: 3.75, TRY: 34 },
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'buy',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 1,
    pricePerUnit: 100,
    currency: 'USD',
    fee: 0,
    occurredAt: '2024-01-01T00:00:00.000Z',
    note: null,
    ...overrides,
  };
}

function like(overrides: Partial<TransactionLike> = {}): TransactionLike {
  return {
    id: 'tx-1',
    type: 'buy',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 1,
    pricePerUnitUsd: 100,
    feeUsd: 0,
    occurredAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function row(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    userId: 'user-1',
    type: 'buy',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 1,
    pricePerUnit: 100,
    currency: 'USD',
    pricePerUnitUsd: 100,
    fee: 0,
    feeUsd: 0,
    occurredAt: '2024-01-01T00:00:00.000Z',
    note: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeUsd', () => {
  it('converts EUR to USD using the FX rate', () => {
    const result = normalizeUsd(input({ currency: 'EUR', pricePerUnit: 90, fee: 9 }), fx);
    expect(result.pricePerUnitUsd).toBeCloseTo(100);
    expect(result.feeUsd).toBeCloseTo(10);
  });

  it('leaves USD amounts unchanged', () => {
    const result = normalizeUsd(input({ currency: 'USD', pricePerUnit: 50, fee: 1 }), fx);
    expect(result.pricePerUnitUsd).toBe(50);
    expect(result.feeUsd).toBe(1);
  });
});

describe('assertTimelineValid', () => {
  it('passes for a valid change', () => {
    const existing = [like()];
    expect(() =>
      assertTimelineValid(existing, {
        kind: 'create',
        transaction: like({ id: 'tx-2', type: 'sell', quantity: 1 }),
      }),
    ).not.toThrow();
  });

  it('throws a 409 INSUFFICIENT_HOLDINGS with the formatted message on an oversell', () => {
    const existing = [like({ quantity: 1 })];
    try {
      assertTimelineValid(existing, {
        kind: 'create',
        transaction: like({ id: 'tx-2', type: 'sell', quantity: 2 }),
      });
      expect.fail('expected assertTimelineValid to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe('INSUFFICIENT_HOLDINGS');
      expect(apiError.message).toBe(
        'Cannot sell 2 bitcoin; only 1 held on 2024-01-01T00:00:00.000Z',
      );
    }
  });

  it('formats numbers with up to 8 decimals', () => {
    const existing = [like({ quantity: 0.123456789 })];
    try {
      assertTimelineValid(existing, {
        kind: 'create',
        transaction: like({ id: 'tx-2', type: 'sell', quantity: 0.987654321 }),
      });
      expect.fail('expected assertTimelineValid to throw');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.message).toContain('0.98765432');
      expect(apiError.message).toContain('0.12345679');
    }
  });
});

describe('rowToTransaction', () => {
  it('maps a DB row to the public Transaction shape', () => {
    const result = rowToTransaction(row());
    expect(result).toEqual({
      id: 'tx-1',
      type: 'buy',
      coinId: 'bitcoin',
      coinSymbol: 'BTC',
      coinName: 'Bitcoin',
      quantity: 1,
      pricePerUnit: 100,
      currency: 'USD',
      pricePerUnitUsd: 100,
      fee: 0,
      feeUsd: 0,
      occurredAt: '2024-01-01T00:00:00.000Z',
      note: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('maps a null note through as null and preserves a note', () => {
    expect(rowToTransaction(row({ note: null })).note).toBeNull();
    expect(rowToTransaction(row({ note: 'DCA buy' })).note).toBe('DCA buy');
  });
});
