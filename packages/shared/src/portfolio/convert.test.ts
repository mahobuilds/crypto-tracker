import { describe, expect, it } from 'vitest';
import type { FxRates } from '../types';
import { convertFromUsd, convertToUsd } from './convert';
import { fx } from './testUtils';

describe('convert', () => {
  it('USD is the identity in both directions', () => {
    expect(convertFromUsd(123.45, 'USD', fx)).toBe(123.45);
    expect(convertToUsd(123.45, 'USD', fx)).toBe(123.45);
  });

  it('multiplies by the rate when leaving USD', () => {
    expect(convertFromUsd(100, 'EUR', fx)).toBeCloseTo(90);
    expect(convertFromUsd(100, 'SAR', fx)).toBeCloseTo(375);
  });

  it('divides by the rate when entering USD', () => {
    expect(convertToUsd(90, 'EUR', fx)).toBeCloseTo(100);
    expect(convertToUsd(3000, 'TRY', fx)).toBeCloseTo(100);
  });

  it('round trips within 1e-9', () => {
    for (const currency of ['EUR', 'SAR', 'TRY'] as const) {
      const back = convertToUsd(convertFromUsd(1234.5678, currency, fx), currency, fx);
      expect(Math.abs(back - 1234.5678)).toBeLessThan(1e-9);
    }
  });

  it('throws when the rate is missing', () => {
    const partial = { ...fx, rates: { USD: 1 } } as unknown as FxRates;
    expect(() => convertFromUsd(1, 'EUR', partial)).toThrow(/EUR/);
    expect(() => convertToUsd(1, 'EUR', partial)).toThrow(/EUR/);
  });

  it('throws when the rate is zero or not finite', () => {
    const zero: FxRates = { ...fx, rates: { ...fx.rates, TRY: 0 } };
    const infinite: FxRates = { ...fx, rates: { ...fx.rates, TRY: Number.POSITIVE_INFINITY } };
    const nan: FxRates = { ...fx, rates: { ...fx.rates, TRY: Number.NaN } };
    expect(() => convertFromUsd(1, 'TRY', zero)).toThrow(Error);
    expect(() => convertFromUsd(1, 'TRY', infinite)).toThrow(Error);
    expect(() => convertToUsd(1, 'TRY', nan)).toThrow(Error);
  });

  it('ignores a broken USD rate because USD is always 1', () => {
    const broken: FxRates = { ...fx, rates: { ...fx.rates, USD: 0 } };
    expect(convertFromUsd(5, 'USD', broken)).toBe(5);
  });
});
