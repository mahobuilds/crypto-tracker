import { describe, expect, it } from 'vitest';
import { sortWallets, walletInputSchema, walletNameKey } from './wallets';

describe('walletInputSchema', () => {
  it('trims the name', () => {
    expect(walletInputSchema.parse({ name: '  Binance  ' })).toEqual({ name: 'Binance' });
  });

  it('rejects an empty name', () => {
    expect(walletInputSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a name over the maximum length', () => {
    expect(walletInputSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('walletNameKey', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(walletNameKey(' Ledger ')).toBe(walletNameKey('ledger'));
  });
});

describe('sortWallets', () => {
  it('orders by creation time then name', () => {
    const wallets = [
      { name: 'B', createdAt: '2024-02-01T00:00:00.000Z' },
      { name: 'A', createdAt: '2024-02-01T00:00:00.000Z' },
      { name: 'Main', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    expect(sortWallets(wallets).map((w) => w.name)).toEqual(['Main', 'A', 'B']);
  });
});
