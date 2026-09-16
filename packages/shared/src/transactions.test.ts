import { describe, expect, it } from 'vitest';
import { transactionInputSchema } from './transactions';
import type { TransactionInput } from './types';

const valid = {
  type: 'buy',
  coinId: 'bitcoin',
  coinSymbol: 'btc',
  coinName: 'Bitcoin',
  quantity: 0.5,
  pricePerUnit: 50000,
  currency: 'USD',
  fee: 10,
  occurredAt: '2024-01-15T10:30:00.000Z',
  note: 'first buy',
};

function failingPaths(input: unknown): string[] {
  const result = transactionInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('transactionInputSchema', () => {
  it('accepts a full valid body and upper-cases the symbol', () => {
    const result = transactionInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      const data: TransactionInput = result.data;
      expect(data).toEqual({ ...valid, coinSymbol: 'BTC' });
    }
  });

  it('defaults fee to 0 and note to null', () => {
    const { fee: _fee, note: _note, ...rest } = valid;
    const result = transactionInputSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fee).toBe(0);
      expect(result.data.note).toBeNull();
    }
  });

  it('turns an empty or blank note into null and trims a real one', () => {
    const empty = transactionInputSchema.parse({ ...valid, note: '' });
    const blank = transactionInputSchema.parse({ ...valid, note: '   ' });
    const padded = transactionInputSchema.parse({ ...valid, note: '  hello  ' });
    expect(empty.note).toBeNull();
    expect(blank.note).toBeNull();
    expect(padded.note).toBe('hello');
  });

  it('accepts an explicit null note', () => {
    expect(transactionInputSchema.parse({ ...valid, note: null }).note).toBeNull();
  });

  it('rejects a note over 500 characters', () => {
    expect(failingPaths({ ...valid, note: 'x'.repeat(501) })).toEqual(['note']);
  });

  it('trims coin fields', () => {
    const data = transactionInputSchema.parse({
      ...valid,
      coinId: '  bitcoin ',
      coinSymbol: ' btc ',
      coinName: ' Bitcoin ',
    });
    expect(data.coinId).toBe('bitcoin');
    expect(data.coinSymbol).toBe('BTC');
    expect(data.coinName).toBe('Bitcoin');
  });

  it('rejects empty coin fields after trimming', () => {
    expect(failingPaths({ ...valid, coinId: '  ' })).toEqual(['coinId']);
    expect(failingPaths({ ...valid, coinSymbol: '' })).toEqual(['coinSymbol']);
    expect(failingPaths({ ...valid, coinName: '' })).toEqual(['coinName']);
  });

  it('rejects coin fields that are too long', () => {
    expect(failingPaths({ ...valid, coinId: 'a'.repeat(101) })).toEqual(['coinId']);
    expect(failingPaths({ ...valid, coinSymbol: 'a'.repeat(21) })).toEqual(['coinSymbol']);
    expect(failingPaths({ ...valid, coinName: 'a'.repeat(101) })).toEqual(['coinName']);
  });

  it('rejects an unknown type or currency', () => {
    expect(failingPaths({ ...valid, type: 'swap' })).toEqual(['type']);
    expect(failingPaths({ ...valid, currency: 'GBP' })).toEqual(['currency']);
  });

  it('requires quantity to be a finite positive number', () => {
    expect(failingPaths({ ...valid, quantity: 0 })).toEqual(['quantity']);
    expect(failingPaths({ ...valid, quantity: -1 })).toEqual(['quantity']);
    expect(failingPaths({ ...valid, quantity: Number.POSITIVE_INFINITY })).toEqual(['quantity']);
    expect(failingPaths({ ...valid, quantity: '1' })).toEqual(['quantity']);
  });

  it('allows a zero price and fee but not negative ones', () => {
    expect(failingPaths({ ...valid, pricePerUnit: 0, fee: 0 })).toEqual([]);
    expect(failingPaths({ ...valid, pricePerUnit: -1 })).toEqual(['pricePerUnit']);
    expect(failingPaths({ ...valid, fee: -0.01 })).toEqual(['fee']);
    expect(failingPaths({ ...valid, fee: Number.NaN })).toEqual(['fee']);
  });

  it('normalizes occurredAt with an offset to UTC', () => {
    const data = transactionInputSchema.parse({
      ...valid,
      occurredAt: '2024-01-15T12:30:00+02:00',
    });
    expect(data.occurredAt).toBe('2024-01-15T10:30:00.000Z');
  });

  it('accepts occurredAt without an offset and normalizes it', () => {
    const data = transactionInputSchema.parse({ ...valid, occurredAt: '2024-01-15T10:30:00' });
    expect(data.occurredAt).toBe(new Date('2024-01-15T10:30:00').toISOString());
  });

  it('rejects an occurredAt that is not an ISO date-time', () => {
    expect(failingPaths({ ...valid, occurredAt: 'yesterday' })).toEqual(['occurredAt']);
    expect(failingPaths({ ...valid, occurredAt: '15/01/2024' })).toEqual(['occurredAt']);
    expect(failingPaths({ ...valid, occurredAt: '' })).toEqual(['occurredAt']);
  });

  it('rejects an ISO-looking occurredAt that is an invalid date', () => {
    expect(failingPaths({ ...valid, occurredAt: '2024-02-30T10:30:00Z' })).toEqual(['occurredAt']);
  });
});
