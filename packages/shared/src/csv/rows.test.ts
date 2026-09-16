import { describe, expect, it } from 'vitest';
import { parseTransactionsCsv } from './rows';
import { SAMPLE_CSV } from './sample';

const defaultCurrency = 'USD' as const;

describe('parseTransactionsCsv', () => {
  it('parses a valid file with all columns', () => {
    const csv =
      'date,type,coin,quantity,price,currency,fee,note\n' +
      '2025-01-31,buy,bitcoin,0.5,42000,USD,10,first buy';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.headerErrors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      line: 2,
      errors: [],
      values: {
        occurredAt: '2025-01-31T00:00:00.000Z',
        type: 'buy',
        coin: 'bitcoin',
        quantity: 0.5,
        pricePerUnit: 42000,
        currency: 'USD',
        fee: 10,
        note: 'first buy',
      },
    });
  });

  it('defaults optional columns when they are missing', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,sell,ethereum,1,2200';
    const result = parseTransactionsCsv(csv, { defaultCurrency: 'EUR' });
    expect(result.headerErrors).toEqual([]);
    expect(result.rows[0]?.values).toEqual({
      occurredAt: '2025-01-31T00:00:00.000Z',
      type: 'sell',
      coin: 'ethereum',
      quantity: 1,
      pricePerUnit: 2200,
      currency: 'EUR',
      fee: 0,
      note: null,
    });
  });

  it('matches header columns case-insensitively', () => {
    const csv = 'DATE,Type,Coin,Quantity,Price\n2025-01-31,buy,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.headerErrors).toEqual([]);
    expect(result.rows[0]?.errors).toEqual([]);
  });

  it('reports headerErrors and no rows when a required column is missing', () => {
    const csv = 'date,type,coin,quantity\n2025-01-31,buy,bitcoin,1';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.headerErrors).toEqual(['missing required column "price"']);
    expect(result.rows).toEqual([]);
  });

  it('reports one headerError per missing required column', () => {
    const csv = 'coin,quantity\nbitcoin,1';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.headerErrors).toEqual([
      'missing required column "date"',
      'missing required column "type"',
      'missing required column "price"',
    ]);
  });

  it('rejects an invalid date', () => {
    const csv = 'date,type,coin,quantity,price\n1/2/2025,buy,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.values).toBeNull();
    expect(result.rows[0]?.errors).toEqual([
      'date must be an ISO 8601 date or "YYYY-MM-DD HH:mm", got "1/2/2025"',
    ]);
  });

  it('accepts an ISO date with an offset and a "YYYY-MM-DD HH:mm" date', () => {
    const csv =
      'date,type,coin,quantity,price\n' +
      '2025-01-31T10:00:00+03:00,buy,bitcoin,1,100\n' +
      '2025-01-31 14:00,buy,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([]);
    expect(result.rows[0]?.values?.occurredAt).toBe('2025-01-31T07:00:00.000Z');
    expect(result.rows[1]?.errors).toEqual([]);
    expect(result.rows[1]?.values?.occurredAt).toBe('2025-01-31T14:00:00.000Z');
  });

  it('rejects an invalid type', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,transfer,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual(['type must be one of buy, sell, got "transfer"']);
  });

  it('accepts type case-insensitively', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,BUY,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([]);
    expect(result.rows[0]?.values?.type).toBe('buy');
  });

  it('rejects an empty coin', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual(['coin must not be empty']);
  });

  it('rejects a coin longer than 100 characters', () => {
    const longCoin = 'x'.repeat(101);
    const csv = `date,type,coin,quantity,price\n2025-01-31,buy,${longCoin},1,100`;
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([
      `coin must be at most 100 characters, got "${longCoin}"`,
    ]);
  });

  it('rejects a quantity that is not a positive number', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,bitcoin,abc,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual(['quantity must be a number greater than 0, got "abc"']);
  });

  it('rejects a zero or negative quantity', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,bitcoin,0,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual(['quantity must be a number greater than 0, got "0"']);
  });

  it('rejects a negative price', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,bitcoin,1,-5';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([
      'price must be a number greater than or equal to 0, got "-5"',
    ]);
  });

  it('accepts a zero price', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,bitcoin,1,0';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([]);
  });

  it('rejects a negative fee', () => {
    const csv = 'date,type,coin,quantity,price,fee\n2025-01-31,buy,bitcoin,1,100,-1';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([
      'fee must be a number greater than or equal to 0, got "-1"',
    ]);
  });

  it('rejects an unknown currency', () => {
    const csv = 'date,type,coin,quantity,price,currency\n2025-01-31,buy,bitcoin,1,100,GBP';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([
      'currency must be one of USD, EUR, SAR, TRY, got "GBP"',
    ]);
  });

  it('accepts currency case-insensitively', () => {
    const csv = 'date,type,coin,quantity,price,currency\n2025-01-31,buy,bitcoin,1,100,eur';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([]);
    expect(result.rows[0]?.values?.currency).toBe('EUR');
  });

  it('rejects a note longer than 500 characters', () => {
    const longNote = 'x'.repeat(501);
    const csv = `date,type,coin,quantity,price,currency,fee,note\n2025-01-31,buy,bitcoin,1,100,USD,0,${longNote}`;
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.values).toBeNull();
    expect(result.rows[0]?.errors[0]).toMatch(/^note must be at most 500 characters/);
  });

  it('treats an empty note as null', () => {
    const csv =
      'date,type,coin,quantity,price,currency,fee,note\n2025-01-31,buy,bitcoin,1,100,USD,0,';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.values?.note).toBeNull();
  });

  it('collects all errors for a row instead of stopping at the first', () => {
    const csv = 'date,type,coin,quantity,price\nnot-a-date,transfer,,abc,-5';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.values).toBeNull();
    expect(result.rows[0]?.errors).toHaveLength(5);
  });

  it('keeps line numbers correct after a blank line', () => {
    const csv =
      'date,type,coin,quantity,price\n' +
      '2025-01-31,buy,bitcoin,1,100\n' +
      '\n' +
      '2025-02-01,sell,bitcoin,1,100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.line).toBe(2);
    expect(result.rows[1]?.line).toBe(4);
  });

  it('accepts thousands separators inside a quoted field', () => {
    const csv = 'date,type,coin,quantity,price\n2025-01-31,buy,bitcoin,"1,234.5",100';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.rows[0]?.errors).toEqual([]);
    expect(result.rows[0]?.values?.quantity).toBe(1234.5);
  });

  it('ignores unknown columns', () => {
    const csv = 'date,type,coin,quantity,price,exchange\n2025-01-31,buy,bitcoin,1,100,binance';
    const result = parseTransactionsCsv(csv, { defaultCurrency });
    expect(result.headerErrors).toEqual([]);
    expect(result.rows[0]?.errors).toEqual([]);
  });

  it('parses SAMPLE_CSV with zero errors and three rows', () => {
    const result = parseTransactionsCsv(SAMPLE_CSV, { defaultCurrency });
    expect(result.headerErrors).toEqual([]);
    expect(result.rows).toHaveLength(3);
    for (const row of result.rows) {
      expect(row.errors).toEqual([]);
      expect(row.values).not.toBeNull();
    }
  });
});
