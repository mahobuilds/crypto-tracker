import type { FxRates, PriceQuote } from '../types';
import type { TransactionLike } from './holdings';

let counter = 0;

/** Builds a `TransactionLike` with sensible defaults; each call gets a later `occurredAt`. */
export function tx(overrides: Partial<TransactionLike> = {}): TransactionLike {
  counter += 1;
  const stamp = new Date(Date.UTC(2024, 0, 1, 0, counter)).toISOString();
  return {
    id: `tx-${counter}`,
    type: 'buy',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    quantity: 1,
    pricePerUnitUsd: 100,
    feeUsd: 0,
    occurredAt: stamp,
    createdAt: stamp,
    ...overrides,
  };
}

export function quote(coinId: string, usd: number): PriceQuote {
  return {
    coinId,
    usd,
    eur: usd * 0.9,
    sar: usd * 3.75,
    try: usd * 30,
    change24hPct: 0,
    updatedAt: '2024-06-01T00:00:00.000Z',
  };
}

export const fx: FxRates = {
  base: 'USD',
  rates: { USD: 1, EUR: 0.9, SAR: 3.75, TRY: 30 },
  updatedAt: '2024-06-01T00:00:00.000Z',
};
